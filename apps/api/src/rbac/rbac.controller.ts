import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createRoleSchema,
  idParamSchema,
  listQuerySchema,
  updateRoleSchema,
  type CreateRoleInput,
  type ListQuery,
  type UpdateRoleInput,
} from "@milk-epr/validation";
import type { Request } from "express";
import type { AuthContext } from "../auth/auth-context";
import { CurrentAuth, requestMeta, RequirePermissions } from "../common/decorators";
import { ApiZodBody } from "../common/zod-openapi";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RbacService } from "./rbac.service";

@ApiTags("Access")
@ApiBearerAuth()
@Controller()
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get("permissions")
  @RequirePermissions("role.read")
  @ApiOperation({ summary: "List the permission catalogue" })
  permissions() {
    return this.rbac.listPermissions();
  }

  @Get("roles")
  @RequirePermissions("role.read")
  @ApiOperation({ summary: "List roles in the current tenant" })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.rbac.listRoles(auth, query);
  }

  @Get("roles/:id")
  @RequirePermissions("role.read")
  @ApiOperation({ summary: "Get one role" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ) {
    return this.rbac.getRole(auth, params.id);
  }

  @Post("roles")
  @RequirePermissions("role.manage")
  @ApiOperation({ summary: "Create a role" })
  @ApiZodBody(createRoleSchema)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleInput,
    @Req() req: Request,
  ) {
    return this.rbac.createRole(auth, body, requestMeta(req));
  }

  @Patch("roles/:id")
  @RequirePermissions("role.manage")
  @ApiOperation({ summary: "Update a custom role" })
  @ApiZodBody(updateRoleSchema)
  update(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleInput,
    @Req() req: Request,
  ) {
    return this.rbac.updateRole(auth, params.id, body, requestMeta(req));
  }
}
