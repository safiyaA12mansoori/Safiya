import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../auth/auth-context";
import { CurrentAuth } from "../common/decorators";
import { DashboardService } from "./dashboard.service";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: "Live counts and recent audit events the caller is allowed to see" })
  get(@CurrentAuth() auth: AuthContext) {
    return this.dashboard.get(auth);
  }
}
