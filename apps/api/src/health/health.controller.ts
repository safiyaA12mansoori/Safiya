import { Controller, Get, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../common/decorators";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Check PostgreSQL and Redis" })
  async health(@Res({ passthrough: true }) res: Response) {
    const [postgres, redis] = await Promise.all([this.pingPostgres(), this.redis.ping()]);
    const body = {
      status: postgres && redis ? "ok" : "degraded",
      postgres: postgres ? "ok" : "down",
      redis: redis ? "ok" : "down",
    };
    if (!postgres || !redis) res.status(503);
    return body;
  }

  private async pingPostgres(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
