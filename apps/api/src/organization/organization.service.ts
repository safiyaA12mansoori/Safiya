import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  CreateBranchInput,
  CreateCompanyInput,
  ListQuery,
  UpdateBranchInput,
  UpdateCompanyInput,
  UpdateTenantInput,
} from "@milk-epr/validation";
import { AuditService } from "../audit/audit.service";
import type { AuthContext, RequestMeta } from "../auth/auth-context";
import { notFound, rethrowConflict } from "../common/errors";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(auth: AuthContext) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: auth.tenantId, deletedAt: null },
    });
    if (!tenant) notFound("Tenant not found");
    return publicTenant(tenant);
  }

  async update(auth: AuthContext, input: UpdateTenantInput, meta: RequestMeta) {
    const existing = await this.prisma.tenant.findFirst({ where: { id: auth.tenantId, deletedAt: null } });
    if (!existing) notFound("Tenant not found");
    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.tenant.update({
          where: { id: auth.tenantId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            updatedBy: auth.userId,
          },
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "tenant.updated",
            entityType: "tenant",
            entityId: updated.id,
            requestId: meta.requestId,
            ip: meta.ip,
            before: publicTenant(existing),
            after: publicTenant(updated),
          },
          tx,
        );
        return updated;
      });
      return publicTenant(tenant);
    } catch (error) {
      rethrowConflict(error, "That tenant slug is already in use");
    }
  }
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: ListQuery) {
    const where = {
      tenantId: auth.tenantId,
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { code: { contains: query.q, mode: "insensitive" as const } },
              { legalName: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({ where, orderBy: { name: "asc" }, skip: query.offset, take: query.limit }),
      this.prisma.company.count({ where }),
    ]);
    return { items: items.map(publicCompany), total, limit: query.limit, offset: query.offset };
  }

  async get(auth: AuthContext, id: string) {
    const company = await this.findActive(auth.tenantId, id);
    return publicCompany(company);
  }

  async create(auth: AuthContext, input: CreateCompanyInput, meta: RequestMeta) {
    try {
      const company = await this.prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
          data: {
            tenantId: auth.tenantId,
            code: input.code,
            name: input.name,
            legalName: input.legalName ?? null,
            createdBy: auth.userId,
            updatedBy: auth.userId,
          },
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "company.created",
            entityType: "company",
            entityId: created.id,
            requestId: meta.requestId,
            ip: meta.ip,
            after: publicCompany(created),
          },
          tx,
        );
        return created;
      });
      return publicCompany(company);
    } catch (error) {
      rethrowConflict(error, "A company with this code already exists");
    }
  }

  async update(auth: AuthContext, id: string, input: UpdateCompanyInput, meta: RequestMeta) {
    const existing = await this.findActive(auth.tenantId, id);
    const company = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedBy: auth.userId,
        },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "company.updated",
          entityType: "company",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicCompany(existing),
          after: publicCompany(updated),
        },
        tx,
      );
      return updated;
    });
    return publicCompany(company);
  }

  async retire(auth: AuthContext, id: string, meta: RequestMeta) {
    const existing = await this.findActive(auth.tenantId, id);
    const branches = await this.prisma.branch.count({
      where: { companyId: id, tenantId: auth.tenantId, deletedAt: null },
    });
    if (branches > 0) {
      throw new BadRequestException({
        code: "COMPANY_HAS_BRANCHES",
        message: "Retire the company's branches before retiring the company",
      });
    }
    const company = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: existing.id },
        data: { status: "INACTIVE", deletedAt: new Date(), updatedBy: auth.userId },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "company.retired",
          entityType: "company",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicCompany(existing),
          after: { id, deletedAt: updated.deletedAt },
        },
        tx,
      );
      return updated;
    });
    return { id: company.id, deletedAt: company.deletedAt };
  }

  private async findActive(tenantId: string, id: string) {
    const company = await this.prisma.company.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!company) notFound("Company not found");
    return company;
  }
}

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: ListQuery) {
    const where = {
      tenantId: auth.tenantId,
      deletedAt: null,
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { code: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        include: { company: { select: { id: true, code: true, name: true } } },
        orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.branch.count({ where }),
    ]);
    return { items: items.map(publicBranch), total, limit: query.limit, offset: query.offset };
  }

  async get(auth: AuthContext, id: string) {
    const branch = await this.findActive(auth.tenantId, id);
    return publicBranch(branch);
  }

  async create(auth: AuthContext, input: CreateBranchInput, meta: RequestMeta) {
    const company = await this.prisma.company.findFirst({
      where: { id: input.companyId, tenantId: auth.tenantId, deletedAt: null, status: "ACTIVE" },
    });
    if (!company) {
      throw new BadRequestException({
        code: "INVALID_COMPANY",
        message: "Active company not found in this tenant",
      });
    }
    try {
      const branch = await this.prisma.$transaction(async (tx) => {
        const created = await tx.branch.create({
          data: {
            tenantId: auth.tenantId,
            companyId: company.id,
            code: input.code,
            name: input.name,
            createdBy: auth.userId,
            updatedBy: auth.userId,
          },
          include: { company: { select: { id: true, code: true, name: true } } },
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "branch.created",
            entityType: "branch",
            entityId: created.id,
            requestId: meta.requestId,
            ip: meta.ip,
            after: publicBranch(created),
          },
          tx,
        );
        return created;
      });
      return publicBranch(branch);
    } catch (error) {
      rethrowConflict(error, "A branch with this code already exists for the company");
    }
  }

  async update(auth: AuthContext, id: string, input: UpdateBranchInput, meta: RequestMeta) {
    const existing = await this.findActive(auth.tenantId, id);
    const branch = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedBy: auth.userId,
        },
        include: { company: { select: { id: true, code: true, name: true } } },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "branch.updated",
          entityType: "branch",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicBranch(existing),
          after: publicBranch(updated),
        },
        tx,
      );
      return updated;
    });
    return publicBranch(branch);
  }

  async retire(auth: AuthContext, id: string, meta: RequestMeta) {
    const existing = await this.findActive(auth.tenantId, id);
    const branch = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id: existing.id },
        data: { status: "INACTIVE", deletedAt: new Date(), updatedBy: auth.userId },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "branch.retired",
          entityType: "branch",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicBranch(existing),
          after: { id, deletedAt: updated.deletedAt },
        },
        tx,
      );
      return updated;
    });
    return { id: branch.id, deletedAt: branch.deletedAt };
  }

  private async findActive(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { company: { select: { id: true, code: true, name: true } } },
    });
    if (!branch) notFound("Branch not found");
    return branch;
  }
}

function publicTenant(tenant: {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    createdBy: tenant.createdBy,
    updatedBy: tenant.updatedBy,
  };
}

function publicCompany(company: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  legalName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}) {
  return {
    id: company.id,
    tenantId: company.tenantId,
    code: company.code,
    name: company.name,
    legalName: company.legalName,
    status: company.status,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    createdBy: company.createdBy,
    updatedBy: company.updatedBy,
  };
}

function publicBranch(branch: {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  company: { id: string; code: string; name: string };
}) {
  return {
    id: branch.id,
    tenantId: branch.tenantId,
    companyId: branch.companyId,
    company: branch.company,
    code: branch.code,
    name: branch.name,
    status: branch.status,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
    createdBy: branch.createdBy,
    updatedBy: branch.updatedBy,
  };
}
