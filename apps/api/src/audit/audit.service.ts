import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ListQuery } from "@milk-epr/validation";
import type { AuthContext } from "../auth/auth-context";
import { PrismaService } from "../prisma/prisma.service";

export type AuditWrite = {
  tenantId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  before?: unknown;
  after?: unknown;
};

type AuditWriter = Prisma.TransactionClient | PrismaService;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditWrite, db: AuditWriter = this.prisma): Promise<void> {
    await db.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        requestId: input.requestId ?? null,
        ip: input.ip ?? null,
        before: toJson(input.before),
        after: toJson(input.after),
      },
    });
  }

  async list(auth: AuthContext, query: ListQuery) {
    const where = { tenantId: auth.tenantId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
    const actorIds = [...new Set(rows.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])))];
    const actors =
      actorIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { tenantId: auth.tenantId, id: { in: actorIds } },
            select: { id: true, name: true, email: true },
          });
    const byId = new Map(actors.map((actor) => [actor.id, actor]));
    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        actorUserId: row.actorUserId,
        actor: row.actorUserId ? (byId.get(row.actorUserId) ?? null) : null,
        requestId: row.requestId,
        ip: row.ip,
        before: row.before,
        after: row.after,
        createdAt: row.createdAt,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
