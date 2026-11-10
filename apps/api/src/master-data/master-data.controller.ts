import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  confirmSchema,
  createMasterRecordSchema,
  createUnitSchema,
  idParamSchema,
  listQuerySchema,
  updateMasterRecordSchema,
  updateUnitSchema,
  type CreateMasterRecordInput,
  type CreateUnitInput,
  type ListQuery,
  type UpdateMasterRecordInput,
  type UpdateUnitInput,
} from "@milk-epr/validation";
import type { Request } from "express";
import type { AuthContext } from "../auth/auth-context";
import { CurrentAuth, requestMeta, RequirePermissions } from "../common/decorators";
import { ApiZodBody } from "../common/zod-openapi";
import { ZodValidationPipe } from "../common/zod.pipe";
import { MasterRecordService, UnitService } from "./master-data.service";

@ApiTags("Units")
@ApiBearerAuth()
@Controller("units")
export class UnitsController {
  constructor(private readonly units: UnitService) {}

  @Get()
  @RequirePermissions("master.read")
  @ApiOperation({ summary: "List units of measure" })
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.units.list(auth, query);
  }

  @Post()
  @RequirePermissions("master.manage")
  @ApiOperation({ summary: "Create a unit of measure" })
  @ApiZodBody(createUnitSchema)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createUnitSchema)) body: CreateUnitInput,
    @Req() req: Request,
  ) {
    return this.units.create(auth, body, requestMeta(req));
  }

  @Get(":id")
  @RequirePermissions("master.read")
  @ApiOperation({ summary: "Get a unit of measure" })
  get(@CurrentAuth() auth: AuthContext, @Param(new ZodValidationPipe(idParamSchema)) params: { id: string }) {
    return this.units.get(auth, params.id);
  }

  @Patch(":id")
  @RequirePermissions("master.manage")
  @ApiOperation({ summary: "Update a unit of measure" })
  @ApiZodBody(updateUnitSchema)
  update(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateUnitSchema)) body: UpdateUnitInput,
    @Req() req: Request,
  ) {
    return this.units.update(auth, params.id, body, requestMeta(req));
  }

  @Post(":id/retire")
  @HttpCode(200)
  @RequirePermissions("master.manage")
  @ApiOperation({ summary: "Retire a unit of measure" })
  @ApiZodBody(confirmSchema)
  retire(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(confirmSchema)) _body: { confirm: true },
    @Req() req: Request,
  ) {
    return this.units.retire(auth, params.id, requestMeta(req));
  }
}

@ApiTags("Master data")
@ApiBearerAuth()
@Controller("master-records")
export class MasterRecordsController {
  constructor(private readonly records: MasterRecordService) {}

  @Get()
  @RequirePermissions("master.read")
  @ApiOperation({ summary: "List generic master records" })
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.records.list(auth, query);
  }

  @Post()
  @RequirePermissions("master.manage")
  @ApiOperation({ summary: "Create a generic master record" })
  @ApiZodBody(createMasterRecordSchema)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createMasterRecordSchema)) body: CreateMasterRecordInput,
    @Req() req: Request,
  ) {
    return this.records.create(auth, body, requestMeta(req));
  }

  @Get(":id")
  @RequirePermissions("master.read")
  @ApiOperation({ summary: "Get a master record" })
  get(@CurrentAuth() auth: AuthContext, @Param(new ZodValidationPipe(idParamSchema)) params: { id: string }) {
    return this.records.get(auth, params.id);
  }

  @Patch(":id")
  @RequirePermissions("master.manage")
  @ApiOperation({ summary: "Update a master record" })
  @ApiZodBody(updateMasterRecordSchema)
  update(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateMasterRecordSchema)) body: UpdateMasterRecordInput,
    @Req() req: Request,
  ) {
    return this.records.update(auth, params.id, body, requestMeta(req));
  }

  @Post(":id/retire")
  @HttpCode(200)
  @RequirePermissions("master.manage")
  @ApiOperation({ summary: "Retire a master record" })
  @ApiZodBody(confirmSchema)
  retire(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(confirmSchema)) _body: { confirm: true },
    @Req() req: Request,
  ) {
    return this.records.retire(auth, params.id, requestMeta(req));
  }
}
