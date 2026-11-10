import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createUserSchema,
  idParamSchema,
  listQuerySchema,
  replaceUserRolesSchema,
  updateUserSchema,
  type CreateUserInput,
  type ListQuery,
  type ReplaceUserRolesInput,
  type UpdateUserInput,
} from "@milk-epr/validation";
import type { Request } from "express";
import type { AuthContext } from "../auth/auth-context";
import { CurrentAuth, requestMeta, RequirePermissions } from "../common/decorators";
import { ApiZodBody } from "../common/zod-openapi";
import { ZodValidationPipe } from "../common/zod.pipe";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("user.read")
  @ApiOperation({ summary: "List users in the current tenant" })
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.users.list(auth, query);
  }

  @Post()
  @RequirePermissions("user.create")
  @ApiOperation({ summary: "Create a user" })
  @ApiZodBody(createUserSchema)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
    @Req() req: Request,
  ) {
    return this.users.create(auth, body, requestMeta(req));
  }

  @Get(":id")
  @RequirePermissions("user.read")
  @ApiOperation({ summary: "Get a user" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ) {
    return this.users.get(auth, params.id);
  }

  @Patch(":id")
  @RequirePermissions("user.update")
  @ApiOperation({ summary: "Update a user, disable the account, or set a new password" })
  @ApiZodBody(updateUserSchema)
  update(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
    @Req() req: Request,
  ) {
    return this.users.update(auth, params.id, body, requestMeta(req));
  }

  @Put(":id/roles")
  @RequirePermissions("user.update")
  @ApiOperation({ summary: "Replace the roles assigned to a user" })
  @ApiZodBody(replaceUserRolesSchema)
  replaceRoles(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(replaceUserRolesSchema)) body: ReplaceUserRolesInput,
    @Req() req: Request,
  ) {
    return this.users.replaceRoles(auth, params.id, body, requestMeta(req));
  }
}
