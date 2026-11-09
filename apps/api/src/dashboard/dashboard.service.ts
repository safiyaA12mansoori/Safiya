import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../auth/auth-context";
import { notFound } from "../common/errors";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(auth: AuthContext) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: auth.tenantId, deletedAt: null } });
    if (!tenant) notFound("Tenant not found");
    const can = (key: string) => auth.permissions.has(key);
    const scope = { tenantId: auth.tenantId, deletedAt: null };
    const [companies, branches, users, activeUsers, units, masterRecords, auditEvents] = await Promise.all([
      can("company.read") ? this.prisma.company.count({ where: scope }) : Promise.resolve(null),
      can("branch.read") ? this.prisma.branch.count({ where: scope }) : Promise.resolve(null),
      can("user.read") ? this.prisma.user.count({ where: scope }) : Promise.resolve(null),
      can("user.read")
        ? this.prisma.user.count({ where: { ...scope, status: "ACTIVE" } })
        : Promise.resolve(null),
      can("master.read") ? this.prisma.unitOfMeasure.count({ where: scope }) : Promise.resolve(null),
      can("master.read") ? this.prisma.masterRecord.count({ where: scope }) : Promise.resolve(null),
      can("audit.read") ? this.prisma.auditEvent.count({ where: { tenantId: auth.tenantId } }) : Promise.resolve(null),
    ]);
    const recentAudit = can("audit.read")
      ? await this.audit.list(auth, { limit: 8, offset: 0 })
      : null;
    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
      counts: { companies, branches, users, activeUsers, units, masterRecords, auditEvents },
      recentAudit,
    };
  }
}
