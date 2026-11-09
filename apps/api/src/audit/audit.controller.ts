import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { listQuerySchema, type ListQuery } from "@milk-epr/validation";
import type { AuthContext } from "../auth/auth-context";
import { CurrentAuth, RequirePermissions } from "../common/decorators";
import { ZodValidationPipe } from "../common/zod.pipe";
import { AuditService } from "./audit.service";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit-events")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions("audit.read")
  @ApiOperation({ summary: "List audit events for the current tenant" })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.audit.list(auth, query);
  }
}
