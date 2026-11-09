import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { AppConfigModule } from "./config.module";
import { AuthGuard, PermissionGuard } from "./common/guards";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HealthModule } from "./health/health.module";
import { MasterDataModule } from "./master-data/master-data.module";
import { OrganizationModule } from "./organization/organization.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RbacModule } from "./rbac/rbac.module";
import { RedisModule } from "./redis/redis.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    AuditModule,
    RbacModule,
    AuthModule,
    OrganizationModule,
    UsersModule,
    MasterDataModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
