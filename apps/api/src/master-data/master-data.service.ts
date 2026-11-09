import { Injectable } from "@nestjs/common";
import type {
  CreateMasterRecordInput,
  CreateUnitInput,
  ListQuery,
  UpdateMasterRecordInput,
  UpdateUnitInput,
} from "@milk-epr/validation";
import { AuditService } from "../audit/audit.service";
import type { AuthContext, RequestMeta } from "../auth/auth-context";
import { notFound, rethrowConflict } from "../common/errors";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UnitService {
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
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.unitOfMeasure.findMany({ where, orderBy: { code: "asc" }, skip: query.offset, take: query.limit }),
      this.prisma.unitOfMeasure.count({ where }),
    ]);
    return { items: items.map(publicUnit), total, limit: query.limit, offset: query.offset };
  }

  async get(auth: AuthContext, id: string) {
    return publicUnit(await this.find(auth.tenantId, id));
  }

  async create(auth: AuthContext, input: CreateUnitInput, meta: RequestMeta) {
    try {
      const unit = await this.prisma.$transaction(async (tx) => {
        const created = await tx.unitOfMeasure.create({
          data: {
            tenantId: auth.tenantId,
            code: input.code,
            name: input.name,
            createdBy: auth.userId,
            updatedBy: auth.userId,
          },
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "unit.created",
            entityType: "unit_of_measure",
            entityId: created.id,
            requestId: meta.requestId,
            ip: meta.ip,
            after: publicUnit(created),
          },
          tx,
        );
        return created;
      });
      return publicUnit(unit);
    } catch (error) {
      rethrowConflict(error, "A unit with this code already exists");
    }
  }

  async update(auth: AuthContext, id: string, input: UpdateUnitInput, meta: RequestMeta) {
    const existing = await this.find(auth.tenantId, id);
    const unit = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.unitOfMeasure.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedBy: auth.userId,
        },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "unit.updated",
          entityType: "unit_of_measure",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicUnit(existing),
          after: publicUnit(updated),
        },
        tx,
      );
      return updated;
    });
    return publicUnit(unit);
  }

  async retire(auth: AuthContext, id: string, meta: RequestMeta) {
    const existing = await this.find(auth.tenantId, id);
    const unit = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.unitOfMeasure.update({
        where: { id },
        data: { status: "INACTIVE", deletedAt: new Date(), updatedBy: auth.userId },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "unit.retired",
          entityType: "unit_of_measure",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicUnit(existing),
          after: { id, deletedAt: updated.deletedAt },
        },
        tx,
      );
      return updated;
    });
    return { id: unit.id, deletedAt: unit.deletedAt };
  }

  private async find(tenantId: string, id: string) {
    const unit = await this.prisma.unitOfMeasure.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!unit) notFound("Unit not found");
    return unit;
  }
}

@Injectable()
export class MasterRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: ListQuery) {
    const recordType = query.recordType?.toUpperCase();
    const where = {
      tenantId: auth.tenantId,
      deletedAt: null,
      ...(recordType ? { recordType } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { code: { contains: query.q, mode: "insensitive" as const } },
              { recordType: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.masterRecord.findMany({
        where,
        orderBy: [{ recordType: "asc" }, { code: "asc" }],
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.masterRecord.count({ where }),
    ]);
    return { items: items.map(publicMaster), total, limit: query.limit, offset: query.offset };
  }

  async get(auth: AuthContext, id: string) {
    return publicMaster(await this.find(auth.tenantId, id));
  }

  async create(auth: AuthContext, input: CreateMasterRecordInput, meta: RequestMeta) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const created = await tx.masterRecord.create({
          data: {
            tenantId: auth.tenantId,
            recordType: input.recordType,
            code: input.code,
            name: input.name,
            description: input.description ?? null,
            createdBy: auth.userId,
            updatedBy: auth.userId,
          },
        });
        await this.audit.record(
          {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            action: "master_record.created",
            entityType: "master_record",
            entityId: created.id,
            requestId: meta.requestId,
            ip: meta.ip,
            after: publicMaster(created),
          },
          tx,
        );
        return created;
      });
      return publicMaster(record);
    } catch (error) {
      rethrowConflict(error, "A master record with this type and code already exists");
    }
  }

  async update(auth: AuthContext, id: string, input: UpdateMasterRecordInput, meta: RequestMeta) {
    const existing = await this.find(auth.tenantId, id);
    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.masterRecord.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedBy: auth.userId,
        },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "master_record.updated",
          entityType: "master_record",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicMaster(existing),
          after: publicMaster(updated),
        },
        tx,
      );
      return updated;
    });
    return publicMaster(record);
  }

  async retire(auth: AuthContext, id: string, meta: RequestMeta) {
    const existing = await this.find(auth.tenantId, id);
    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.masterRecord.update({
        where: { id },
        data: { status: "INACTIVE", deletedAt: new Date(), updatedBy: auth.userId },
      });
      await this.audit.record(
        {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          action: "master_record.retired",
          entityType: "master_record",
          entityId: id,
          requestId: meta.requestId,
          ip: meta.ip,
          before: publicMaster(existing),
          after: { id, deletedAt: updated.deletedAt },
        },
        tx,
      );
      return updated;
    });
    return { id: record.id, deletedAt: record.deletedAt };
  }

  private async find(tenantId: string, id: string) {
    const record = await this.prisma.masterRecord.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!record) notFound("Master record not found");
    return record;
  }
}

function publicUnit(unit: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}) {
  return {
    id: unit.id,
    tenantId: unit.tenantId,
    code: unit.code,
    name: unit.name,
    status: unit.status,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
    createdBy: unit.createdBy,
    updatedBy: unit.updatedBy,
  };
}

function publicMaster(record: {
  id: string;
  tenantId: string;
  recordType: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}) {
  return {
    id: record.id,
    tenantId: record.tenantId,
    recordType: record.recordType,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}
