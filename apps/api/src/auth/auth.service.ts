import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { ChangePasswordInput, LoginInput } from "@milk-epr/validation";
import { APP_CONFIG, type AppConfig } from "../config";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../rbac/rbac.service";
import { RedisService } from "../redis/redis.service";
import type { AuthContext, RequestMeta } from "./auth-context";
import { LOGIN_FAIL_LIMIT } from "./constants";
import { hashPassword, verifyPassword } from "./password";
import { hashToken, newSessionToken } from "./token";

@Injectable()
export class AuthService {
  private dummyHashPromise: Promise<string> | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
  ) {}

  async login(input: LoginInput, meta: RequestMeta) {
    const ip = meta.ip ?? "unknown";
    const failures = await this.redis.getLoginFailures(ip, input.email);
    if (failures !== null && failures >= LOGIN_FAIL_LIMIT) {
      throw new HttpException(
        { code: "RATE_LIMITED", message: "Too many sign-in attempts. Try again later." },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    const user = tenant
      ? await this.prisma.user.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email: input.email } },
        })
      : null;
    const passwordOk = await verifyPassword(user?.passwordHash ?? (await this.dummyHash()), input.password);
    const tenantOk = Boolean(tenant && tenant.status === "ACTIVE" && tenant.deletedAt === null);
    const userOk = Boolean(user && user.status === "ACTIVE" && user.deletedAt === null);

    if (!tenantOk || !userOk || !passwordOk || !tenant || !user) {
      await this.redis.incrementLoginFailure(ip, input.email);
      if (tenant) {
        await this.audit.record({
          tenantId: tenant.id,
          actorUserId: user?.id ?? null,
          action: "auth.login.failed",
          entityType: "user",
          entityId: user?.id ?? null,
          requestId: meta.requestId,
          ip: meta.ip,
          after: { email: input.email },
        });
      }
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid tenant, email, or password",
      });
    }

    await this.redis.clearLoginFailures(ip, input.email);
    return this.createSession(user.id, user.tenantId, user.email, user.name, user.status, meta);
  }

  async resolve(token: string): Promise<AuthContext | null> {
    const tokenHash = hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true, tenant: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
    if (session.user.status !== "ACTIVE" || session.user.deletedAt) return null;
    if (session.tenant.status !== "ACTIVE" || session.tenant.deletedAt) return null;
    const cached = await this.redis.getSession(tokenHash);
    if (!cached) {
      const ttl = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
      await this.redis.setSession(
        tokenHash,
        { sessionId: session.id, userId: session.userId, tenantId: session.tenantId },
        ttl,
      );
    }
    const permissions = await this.rbac.permissionSetForUser(session.userId);
    return {
      sessionId: session.id,
      userId: session.userId,
      tenantId: session.tenantId,
      email: session.user.email,
      name: session.user.name,
      permissions,
    };
  }

  async logout(token: string, auth: AuthContext, meta: RequestMeta): Promise<void> {
    const tokenHash = hashToken(token);
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.redis.deleteSession(tokenHash);
    await this.audit.record({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: "auth.logout",
      entityType: "session",
      entityId: auth.sessionId,
      requestId: meta.requestId,
      ip: meta.ip,
    });
  }

  async me(auth: AuthContext) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: auth.tenantId } });
    if (!tenant || tenant.deletedAt) {
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    return {
      user: { id: auth.userId, email: auth.email, name: auth.name, status: "ACTIVE" as const },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      permissions: [...auth.permissions].sort(),
    };
  }

  async changePassword(auth: AuthContext, input: ChangePasswordInput, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: auth.userId, tenantId: auth.tenantId, deletedAt: null },
    });
    if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Current password is wrong" });
    }
    const passwordHash = await hashPassword(input.newPassword);
    const others = await this.prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, id: { not: auth.sessionId } },
      select: { tokenHash: true },
    });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, updatedBy: auth.userId },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null, id: { not: auth.sessionId } },
        data: { revokedAt: new Date() },
      }),
    ]);
    await Promise.all(others.map((session) => this.redis.deleteSession(session.tokenHash)));
    await this.audit.record({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: "auth.password_changed",
      entityType: "user",
      entityId: user.id,
      requestId: meta.requestId,
      ip: meta.ip,
      after: { passwordChanged: true },
    });
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const where = {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    };
    const sessions = await this.prisma.session.findMany({ where, select: { tokenHash: true } });
    await this.prisma.session.updateMany({ where, data: { revokedAt: new Date() } });
    await Promise.all(sessions.map((session) => this.redis.deleteSession(session.tokenHash)));
  }

  private async createSession(
    userId: string,
    tenantId: string,
    email: string,
    name: string,
    status: string,
    meta: RequestMeta,
  ) {
    const token = newSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + this.config.sessionTtlSeconds * 1000);
    const session = await this.prisma.session.create({
      data: {
        tenantId,
        userId,
        tokenHash,
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    await this.redis.setSession(
      tokenHash,
      { sessionId: session.id, userId, tenantId },
      this.config.sessionTtlSeconds,
    );
    await this.audit.record({
      tenantId,
      actorUserId: userId,
      action: "auth.login.succeeded",
      entityType: "session",
      entityId: session.id,
      requestId: meta.requestId,
      ip: meta.ip,
      after: { email },
    });
    const permissions = await this.rbac.permissionSetForUser(userId);
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      maxAgeMs: this.config.sessionTtlSeconds * 1000,
      user: { id: userId, email, name, status },
      permissions: [...permissions].sort(),
    };
  }

  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= hashPassword(randomBytes(32).toString("hex"));
    return this.dummyHashPromise;
  }
}
