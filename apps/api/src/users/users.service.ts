import { Prisma } from "@prisma/client";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { CreateUserInput, ListQuery, ReplaceUserRolesInput, UpdateUserInput } from "@milk-epr/validation";
import { AuditService } from "../audit/audit.service";
import type { AuthContext, RequestMeta } from "../auth/auth-context";
import { ADMINISTRATOR_ROLE } from "../auth/constants";
import { AuthService } from "../auth/auth.service";
import { hashPassword } from "../auth/password";
import { notFound, rethrowConflict } from "../common/errors";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../rbac/rbac.service";

const userInclude = {
  userRoles: { include: { role: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
    private readonly authService: AuthService,
  ) {}

  async list(auth: AuthContext, query: ListQuery) {
    const where = {
      tenantId: auth.tenantId,
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { email: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { email: "asc" },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(publicUser), total, limit: query.limit, offset: query.offset };
  }

  async get(auth: AuthContext, id: string) {
    return publicUser(await this.findUser(auth.tenantId, id));
  }

  async create(auth: AuthContext, input: CreateUserInput, meta: RequestMeta) {
    const roleIds = [...new Set(input.roleIds)];
    await this.rbac.assertCanAssign(auth, roleIds);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            tenantId: auth.tenantId,
            email: input.email,
            name: input.name,
            passwordHash: await hashPassword(input.password),
            createdBy: auth.userId,
            updatedBy: auth.userId,
            userRoles: {
              create: roleIds.map((roleId) => ({
                tenantId: auth.tenantId,
                roleId,
                createdBy: auth.userId,
              })),
            },
          },
          include: userInclude,
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "user.created",
            entityType: "user",
            entityId: created.id,
            requestId: meta.requestId,
            ip: meta.ip,
            after: publicUser(created),
          },
          tx,
        );
        return created;
      });
      return publicUser(user);
    } catch (error) {
      rethrowConflict(error, "A user with this email already exists in the tenant");
    }
  }

  async update(auth: AuthContext, id: string, input: UpdateUserInput, meta: RequestMeta) {
    const existing = await this.findUser(auth.tenantId, id);
    if (input.status === "INACTIVE" && id === auth.userId) {
      throw new BadRequestException({ code: "CANNOT_DISABLE_SELF", message: "You cannot disable your own account" });
    }
    const passwordHash = input.newPassword ? await hashPassword(input.newPassword) : null;
    const user = await this.prisma.$transaction(async (tx) => {
      if (input.status) {
        await this.assertAdministratorRemains(tx, auth.tenantId, id, null, input.status);
      }
      const updated = await tx.user.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          updatedBy: auth.userId,
        },
        include: userInclude,
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "user.updated",
          entityType: "user",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicUser(existing),
          after: { ...publicUser(updated), passwordChanged: Boolean(passwordHash) },
        },
        tx,
      );
      return updated;
    });
    if (input.status === "INACTIVE" || passwordHash) {
      await this.authService.revokeAllSessions(id, id === auth.userId ? auth.sessionId : undefined);
    }
    return publicUser(user);
  }

  async replaceRoles(auth: AuthContext, id: string, input: ReplaceUserRolesInput, meta: RequestMeta) {
    const existing = await this.findUser(auth.tenantId, id);
    const roleIds = [...new Set(input.roleIds)];
    await this.rbac.assertCanAssign(auth, roleIds);
    const before = existing.userRoles.map((row) => row.role.id);
    await this.prisma.$transaction(async (tx) => {
      await this.assertAdministratorRemains(tx, auth.tenantId, id, roleIds, existing.status);
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            tenantId: auth.tenantId,
            userId: id,
            roleId,
            createdBy: auth.userId,
          })),
        });
      }
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "user.roles_replaced",
          entityType: "user",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: { roleIds: before },
          after: { roleIds },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  private async findUser(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: userInclude,
    });
    if (!user) notFound("User not found");
    return user;
  }

  private async assertAdministratorRemains(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    nextRoleIds: string[] | null,
    nextStatus: "ACTIVE" | "INACTIVE",
  ) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM roles
      WHERE tenant_id = ${tenantId}::uuid
        AND name = ${ADMINISTRATOR_ROLE}
        AND is_system = true
      FOR UPDATE
    `);
    const adminRoleId = locked[0]?.id;
    if (!adminRoleId) return;
    const admins = await tx.user.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        deletedAt: null,
        userRoles: { some: { roleId: adminRoleId } },
      },
      select: { id: true },
    });
    const surviving = admins.filter((admin) => {
      if (admin.id !== userId) return true;
      if (nextStatus !== "ACTIVE") return false;
      if (nextRoleIds && !nextRoleIds.includes(adminRoleId)) return false;
      return true;
    });
    if (surviving.length === 0) {
      throw new BadRequestException({
        code: "LAST_ADMINISTRATOR",
        message: "The tenant must keep at least one active administrator",
      });
    }
  }
}

function publicUser(user: {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  userRoles: { role: { id: string; name: string } }[];
}) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    status: user.status,
    roles: user.userRoles.map((row) => row.role).sort((left, right) => left.name.localeCompare(right.name)),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    createdBy: user.createdBy,
    updatedBy: user.updatedBy,
  };
}
