import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.configure";
import { ADMINISTRATOR_ROLE } from "../src/auth/constants";
import { hashPassword } from "../src/auth/password";
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG } from "../src/rbac/catalogue";

export const TEST_PASSWORD = "local-dev-password";
export const prisma = new PrismaClient();

export function migrationPrisma(): PrismaClient {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is required for test cleanup");
  return new PrismaClient({ datasources: { db: { url } } });
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ["error"] });
  configureApp(app, "http://localhost:3000");
  await app.init();
  return app;
}

export async function truncate(): Promise<void> {
  const admin = migrationPrisma();
  try {
    await admin.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_events,
      user_roles,
      role_permissions,
      sessions,
      master_records,
      units_of_measure,
      branches,
      companies,
      roles,
      users,
      tenants,
      permissions
    RESTART IDENTITY CASCADE
  `);
  } finally {
    await admin.$disconnect();
  }
  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  await redis.connect();
  const keys = await redis.keys("milk-epr:*");
  if (keys.length > 0) await redis.del(...keys);
  await redis.quit();
}

export async function provisionTenant(passwordHash: string, slug = `t-${Math.random().toString(36).slice(2, 10)}`) {
  await installPermissions();
  const email = `${slug}@example.com`;
  const tenant = await prisma.tenant.create({ data: { name: `Tenant ${slug}`, slug } });
  const role = await createRole(tenant.id, ADMINISTRATOR_ROLE, [...ALL_PERMISSION_KEYS], true);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      name: "Test Admin",
      passwordHash,
      userRoles: { create: { tenantId: tenant.id, roleId: role.id } },
    },
  });
  return { tenant, user, email, role, password: TEST_PASSWORD };
}

export async function addUser(
  tenantId: string,
  passwordHash: string,
  permissionKeys: string[],
  email = `user-${Math.random().toString(36).slice(2, 8)}@example.com`,
) {
  const role = await createRole(tenantId, `Role ${email}`, permissionKeys, false);
  const user = await prisma.user.create({
    data: {
      tenantId,
      email,
      name: email,
      passwordHash,
      userRoles: { create: { tenantId, roleId: role.id } },
    },
  });
  return { user, email, role, password: TEST_PASSWORD };
}

export async function login(app: INestApplication, tenantSlug: string, email: string, password = TEST_PASSWORD) {
  const response = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ tenantSlug, email, password });
  return response;
}

async function installPermissions(): Promise<void> {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: { key: permission.key, description: permission.description },
    });
  }
}

async function createRole(tenantId: string, name: string, keys: string[], isSystem: boolean) {
  const permissions = await prisma.permission.findMany({ where: { key: { in: keys } } });
  if (permissions.length !== keys.length) throw new Error(`Missing permissions for ${name}`);
  return prisma.role.create({
    data: {
      tenantId,
      name,
      description: name,
      isSystem,
      rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
    },
  });
}

export async function sharedPasswordHash(): Promise<string> {
  return hashPassword(TEST_PASSWORD);
}
