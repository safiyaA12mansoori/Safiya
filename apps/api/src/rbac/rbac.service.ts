import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { CreateRoleInput, ListQuery, UpdateRoleInput } from "@milk-epr/validation";
import { AuditService } from "../audit/audit.service";
import type { AuthContext, RequestMeta } from "../auth/auth-context";
import { notFound, rethrowConflict } from "../common/errors";
import { PrismaService } from "../prisma/prisma.service";
import { PERMISSION_CATALOG } from "./catalogue";

const roleInclude = {
  rolePermissions: { include: { permission: true } },
} as const;

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async permissionSetForUser(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { rolePermissions: { select: { permission: { select: { key: true } } } } } } },
    });
    const keys = new Set<string>();
    for (const row of rows) {
      for (const link of row.role.rolePermissions) keys.add(link.permission.key);
    }
    return keys;
  }

  listPermissions() {
    return { items: PERMISSION_CATALOG.map((item) => ({ ...item })) };
  }

  async listRoles(auth: AuthContext, query: ListQuery) {
    const where = {
      tenantId: auth.tenantId,
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" as const } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        include: roleInclude,
        orderBy: { name: "asc" },
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.role.count({ where }),
    ]);
    return { items: rows.map(publicRole), total, limit: query.limit, offset: query.offset };
  }

  async getRole(auth: AuthContext, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: roleInclude,
    });
    if (!role) notFound();
    return publicRole(role);
  }

  async createRole(auth: AuthContext, input: CreateRoleInput, meta: RequestMeta) {
    this.assertHolds(auth, input.permissionKeys);
    const uniqueKeys = [...new Set(input.permissionKeys)];
    const permissions = await this.permissionRows(uniqueKeys);
    try {
      const role = await this.prisma.$transaction(async (tx) => {
        const created = await tx.role.create({
          data: {
            tenantId: auth.tenantId,
            name: input.name,
            description: input.description ?? "",
            isSystem: false,
            createdBy: auth.userId,
            updatedBy: auth.userId,
            rolePermissions: {
              create: permissions.map((permission) => ({ permissionId: permission.id })),
            },
          },
          include: roleInclude,
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "role.created",
            entityType: "role",
            entityId: created.id,
            requestId: meta.requestId,
            ip: meta.ip,
            after: publicRole(created),
          },
          tx,
        );
        return created;
      });
      return publicRole(role);
    } catch (error) {
      rethrowConflict(error, "A role with this name already exists");
    }
  }

  async updateRole(auth: AuthContext, id: string, input: UpdateRoleInput, meta: RequestMeta) {
    const existing = await this.prisma.role.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: roleInclude,
    });
    if (!existing) notFound();
    if (existing.isSystem) {
      throw new ForbiddenException({ code: "SYSTEM_ROLE", message: "System roles cannot be edited" });
    }
    if (input.permissionKeys) this.assertHolds(auth, input.permissionKeys);
    const uniqueKeys = input.permissionKeys ? [...new Set(input.permissionKeys)] : null;
    const permissions = uniqueKeys ? await this.permissionRows(uniqueKeys) : null;
    try {
      const role = await this.prisma.$transaction(async (tx) => {
        if (permissions) {
          await tx.rolePermission.deleteMany({ where: { roleId: id } });
          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id })),
          });
        }
        const updated = await tx.role.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description ?? "" } : {}),
            updatedBy: auth.userId,
          },
          include: roleInclude,
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "role.updated",
            entityType: "role",
            entityId: id,
            requestId: meta.requestId,
            ip: meta.ip,
            before: publicRole(existing),
            after: publicRole(updated),
          },
          tx,
        );
        return updated;
      });
      return publicRole(role);
    } catch (error) {
      rethrowConflict(error, "A role with this name already exists");
    }
  }

  async assertCanAssign(auth: AuthContext, roleIds: string[]): Promise<void> {
    const unique = [...new Set(roleIds)];
    if (unique.length === 0) return;
    const roles = await this.prisma.role.findMany({
      where: { tenantId: auth.tenantId, id: { in: unique } },
      include: roleInclude,
    });
    if (roles.length !== unique.length) {
      throw new BadRequestException({ code: "UNKNOWN_ROLE", message: "One or more roles are not in this tenant" });
    }
    for (const role of roles) {
      for (const link of role.rolePermissions) {
        if (!auth.permissions.has(link.permission.key)) {
          throw new ForbiddenException({
            code: "FORBIDDEN",
            message: `You cannot assign the ${role.name} role`,
          });
        }
      }
    }
  }

  private assertHolds(auth: AuthContext, keys: string[]): void {
    const known = new Set(PERMISSION_CATALOG.map((item) => item.key));
    const unknown = keys.filter((key) => !known.has(key as (typeof PERMISSION_CATALOG)[number]["key"]));
    if (unknown.length > 0) {
      throw new BadRequestException({
        code: "UNKNOWN_PERMISSION",
        message: `Unknown permission ${unknown.join(", ")}`,
      });
    }
    const missing = keys.filter((key) => !auth.permissions.has(key));
    if (missing.length > 0) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You cannot grant a permission you do not hold",
      });
    }
  }

  private async permissionRows(keys: string[]) {
    const rows = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    if (rows.length !== keys.length) {
      throw new BadRequestException({
        code: "UNKNOWN_PERMISSION",
        message: "One or more permissions are not installed",
      });
    }
    return rows;
  }
}

function publicRole(role: {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  rolePermissions: { permission: { key: string; description: string } }[];
}) {
  return {
    id: role.id,
    tenantId: role.tenantId,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.rolePermissions
      .map((link) => link.permission)
      .sort((left, right) => left.key.localeCompare(right.key)),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    createdBy: role.createdBy,
    updatedBy: role.updatedBy,
  };
}
