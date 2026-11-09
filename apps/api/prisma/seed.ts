import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import {
  emailSchema,
  passwordSchema,
  personNameSchema,
  slugSchema,
  titleSchema,
} from "@milk-epr/validation";
import { ADMINISTRATOR_ROLE, READER_ROLE } from "../src/auth/constants";
import { hashPassword } from "../src/auth/password";
import { loadRootEnv } from "../src/load-env";
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG, READER_PERMISSION_KEYS } from "../src/rbac/catalogue";

loadRootEnv();

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_BOOTSTRAP !== "true") {
    throw new Error("Refusing to bootstrap when NODE_ENV=production. Set ALLOW_BOOTSTRAP=true to override.");
  }
  const tenantName = titleSchema.parse(required("BOOTSTRAP_TENANT_NAME"));
  const tenantSlug = slugSchema.parse(required("BOOTSTRAP_TENANT_SLUG"));
  const adminEmail = emailSchema.parse(required("BOOTSTRAP_ADMIN_EMAIL"));
  const adminName = personNameSchema.parse(required("BOOTSTRAP_ADMIN_NAME"));
  const adminPassword = passwordSchema.parse(required("BOOTSTRAP_ADMIN_PASSWORD"));
  const prisma = new PrismaClient();
  try {
    for (const permission of PERMISSION_CATALOG) {
      await prisma.permission.upsert({
        where: { key: permission.key },
        update: { description: permission.description },
        create: { key: permission.key, description: permission.description },
      });
    }
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSlug },
      update: {},
      create: { name: tenantName, slug: tenantSlug },
    });
    const adminRole = await ensureRole(
      prisma,
      tenant.id,
      ADMINISTRATOR_ROLE,
      "Full access to this tenant.",
      ALL_PERMISSION_KEYS,
    );
    await ensureRole(prisma, tenant.id, READER_ROLE, "Read-only access within this tenant.", READER_PERMISSION_KEYS);
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          name: adminName,
          passwordHash: await hashPassword(adminPassword),
          userRoles: { create: { tenantId: tenant.id, roleId: adminRole.id } },
        },
      });
      console.log(`Created bootstrap admin ${adminEmail} in tenant ${tenant.slug}`);
    } else {
      console.log(`Bootstrap admin ${adminEmail} already exists; password was not changed`);
    }
    console.log("Seed does not create companies, branches, units, or master records.");
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureRole(
  prisma: PrismaClient,
  tenantId: string,
  name: string,
  description: string,
  keys: readonly string[],
) {
  const permissions = await prisma.permission.findMany({ where: { key: { in: [...keys] } } });
  if (permissions.length !== keys.length) throw new Error(`Missing permissions for role ${name}`);
  const role = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { description, isSystem: true },
    create: { tenantId, name, description, isSystem: true },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
  });
  return role;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

main().catch((error: unknown) => {
  if (error instanceof ZodError) console.error(error.issues);
  else console.error(error);
  process.exit(1);
});
