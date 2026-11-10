import { Module } from "@nestjs/common";
import { BranchesController, CompaniesController, TenantController } from "./organization.controller";
import { BranchService, CompanyService, TenantService } from "./organization.service";

@Module({
  controllers: [TenantController, CompaniesController, BranchesController],
  providers: [TenantService, CompanyService, BranchService],
})
export class OrganizationModule {}
