import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { ADMINISTRATOR_ROLE } from "../src/auth/constants";
import {
  addUser,
  createTestApp,
  login,
  prisma,
  provisionTenant,
  sharedPasswordHash,
  truncate,
} from "./helpers";

describe("permissions", () => {
  let app: INestApplication;
  let passwordHash = "";

  beforeAll(async () => {
    passwordHash = await sharedPasswordHash();
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("enforces permission checks on the API", async () => {
    const { tenant, email } = await provisionTenant(passwordHash, "perm-a");
    const reader = await addUser(tenant.id, passwordHash, ["company.read"], "reader@example.com");
    const admin = await login(app, tenant.slug, email);
    const limited = await login(app, tenant.slug, reader.email);
    const server = app.getHttpServer();

    const allowed = await request(server)
      .get("/api/v1/companies")
      .set("authorization", `Bearer ${limited.body.token as string}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.items).toEqual([]);

    const denied = await request(server)
      .post("/api/v1/companies")
      .set("authorization", `Bearer ${limited.body.token as string}`)
      .send({ code: "NORTH", name: "North Company" });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("FORBIDDEN");

    const created = await request(server)
      .post("/api/v1/companies")
      .set("authorization", `Bearer ${admin.body.token as string}`)
      .send({ code: "NORTH", name: "North Company" });
    expect(created.status).toBe(201);
  });

  it("does not let a narrower user assign the administrator role", async () => {
    const { tenant, email, role } = await provisionTenant(passwordHash, "perm-b");
    const delegate = await addUser(tenant.id, passwordHash, ["user.read", "user.update"], "delegate@example.com");
    const target = await addUser(tenant.id, passwordHash, ["company.read"], "target@example.com");
    const session = await login(app, tenant.slug, delegate.email);
    expect(role.name).toBe(ADMINISTRATOR_ROLE);
    const response = await request(app.getHttpServer())
      .put(`/api/v1/users/${target.user.id}/roles`)
      .set("authorization", `Bearer ${session.body.token as string}`)
      .send({ roleIds: [role.id] });
    expect(response.status).toBe(403);
    const untouched = await prisma.userRole.findMany({ where: { userId: target.user.id } });
    expect(untouched.map((row) => row.roleId)).not.toContain(role.id);
    void email;
  });
});
