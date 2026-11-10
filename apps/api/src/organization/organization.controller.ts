import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  confirmSchema,
  createBranchSchema,
  createCompanySchema,
  idParamSchema,
  listQuerySchema,
  updateBranchSchema,
  updateCompanySchema,
  updateTenantSchema,
  type CreateBranchInput,
  type CreateCompanyInput,
  type ListQuery,
  type UpdateBranchInput,
  type UpdateCompanyInput,
  type UpdateTenantInput,
} from "@milk-epr/validation";
import type { Request } from "express";
import type { AuthContext } from "../auth/auth-context";
import { CurrentAuth, requestMeta, RequirePermissions } from "../common/decorators";
import { ApiZodBody } from "../common/zod-openapi";
import { ZodValidationPipe } from "../common/zod.pipe";
import { BranchService, CompanyService, TenantService } from "./organization.service";

@ApiTags("Organization")
@ApiBearerAuth()
@Controller("tenant")
export class TenantController {
  constructor(private readonly tenants: TenantService) {}

  @Get()
  @RequirePermissions("tenant.read")
  @ApiOperation({ summary: "Get the current tenant" })
  get(@CurrentAuth() auth: AuthContext) {
    return this.tenants.get(auth);
  }

  @Patch()
  @RequirePermissions("tenant.update")
  @ApiOperation({ summary: "Update the current tenant name or slug" })
  @ApiZodBody(updateTenantSchema)
  update(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(updateTenantSchema)) body: UpdateTenantInput,
    @Req() req: Request,
  ) {
    return this.tenants.update(auth, body, requestMeta(req));
  }
}

@ApiTags("Companies")
@ApiBearerAuth()
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompanyService) {}

  @Get()
  @RequirePermissions("company.read")
  @ApiOperation({ summary: "List companies in the current tenant" })
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.companies.list(auth, query);
  }

  @Post()
  @RequirePermissions("company.create")
  @ApiOperation({ summary: "Create a company" })
  @ApiZodBody(createCompanySchema)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createCompanySchema)) body: CreateCompanyInput,
    @Req() req: Request,
  ) {
    return this.companies.create(auth, body, requestMeta(req));
  }

  @Get(":id")
  @RequirePermissions("company.read")
  @ApiOperation({ summary: "Get a company" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ) {
    return this.companies.get(auth, params.id);
  }

  @Patch(":id")
  @RequirePermissions("company.update")
  @ApiOperation({ summary: "Update a company" })
  @ApiZodBody(updateCompanySchema)
  update(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCompanySchema)) body: UpdateCompanyInput,
    @Req() req: Request,
  ) {
    return this.companies.update(auth, params.id, body, requestMeta(req));
  }

  @Post(":id/retire")
  @HttpCode(200)
  @RequirePermissions("company.update")
  @ApiOperation({ summary: "Retire a company that has no active branches" })
  @ApiZodBody(confirmSchema)
  retire(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(confirmSchema)) _body: { confirm: true },
    @Req() req: Request,
  ) {
    return this.companies.retire(auth, params.id, requestMeta(req));
  }
}

@ApiTags("Branches")
@ApiBearerAuth()
@Controller("branches")
export class BranchesController {
  constructor(private readonly branches: BranchService) {}

  @Get()
  @RequirePermissions("branch.read")
  @ApiOperation({ summary: "List branches in the current tenant" })
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.branches.list(auth, query);
  }

  @Post()
  @RequirePermissions("branch.create")
  @ApiOperation({ summary: "Create a branch inside a company" })
  @ApiZodBody(createBranchSchema)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createBranchSchema)) body: CreateBranchInput,
    @Req() req: Request,
  ) {
    return this.branches.create(auth, body, requestMeta(req));
  }

  @Get(":id")
  @RequirePermissions("branch.read")
  @ApiOperation({ summary: "Get a branch" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ) {
    return this.branches.get(auth, params.id);
  }

  @Patch(":id")
  @RequirePermissions("branch.update")
  @ApiOperation({ summary: "Update a branch" })
  @ApiZodBody(updateBranchSchema)
  update(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateBranchSchema)) body: UpdateBranchInput,
    @Req() req: Request,
  ) {
    return this.branches.update(auth, params.id, body, requestMeta(req));
  }

  @Post(":id/retire")
  @HttpCode(200)
  @RequirePermissions("branch.update")
  @ApiOperation({ summary: "Retire a branch" })
  @ApiZodBody(confirmSchema)
  retire(
    @CurrentAuth() auth: AuthContext,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(confirmSchema)) _body: { confirm: true },
    @Req() req: Request,
  ) {
    return this.branches.retire(auth, params.id, requestMeta(req));
  }
}
