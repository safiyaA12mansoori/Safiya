import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, login, prisma, provisionTenant, sharedPasswordHash, truncate } from "./helpers";

describe("persistence and tenant isolation", () => {
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

  it("persists a company, writes an audit row, and hides it from another tenant", async () => {
    const first = await provisionTenant(passwordHash, "iso-a");
    const second = await provisionTenant(passwordHash, "iso-b");
    const adminA = await login(app, first.tenant.slug, first.email);
    const adminB = await login(app, second.tenant.slug, second.email);
    const tokenA = adminA.body.token as string;
    const tokenB = adminB.body.token as string;
    const server = app.getHttpServer();

    const created = await request(server)
      .post("/api/v1/companies")
      .set("authorization", `Bearer ${tokenA}`)
      .send({ code: "acme", name: "Acme Legal", legalName: "Acme Legal Ltd" });
    expect(created.status).toBe(201);
    expect(created.body.code).toBe("ACME");
    const companyId = created.body.id as string;

    const stored = await prisma.company.findUnique({ where: { id: companyId } });
    expect(stored?.tenantId).toBe(first.tenant.id);
    expect(stored?.name).toBe("Acme Legal");

    const renamed = await request(server)
      .patch(`/api/v1/companies/${companyId}`)
      .set("authorization", `Bearer ${tokenA}`)
      .send({ name: "Acme Holdings" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("Acme Holdings");

    const listed = await request(server).get("/api/v1/companies").set("authorization", `Bearer ${tokenA}`);
    expect(listed.body.total).toBe(1);

    const otherList = await request(server).get("/api/v1/companies").set("authorization", `Bearer ${tokenB}`);
    expect(otherList.status).toBe(200);
    expect(otherList.body.items).toEqual([]);

    const otherGet = await request(server)
      .get(`/api/v1/companies/${companyId}`)
      .set("authorization", `Bearer ${tokenB}`);
    expect(otherGet.status).toBe(404);

    const otherBranch = await request(server)
      .post("/api/v1/branches")
      .set("authorization", `Bearer ${tokenB}`)
      .send({ companyId, code: "HQ", name: "Head office" });
    expect(otherBranch.status).toBe(400);

    const branch = await request(server)
      .post("/api/v1/branches")
      .set("authorization", `Bearer ${tokenA}`)
      .send({ companyId, code: "HQ", name: "Head office" });
    expect(branch.status).toBe(201);
    expect(branch.body.company.id).toBe(companyId);

    const master = await request(server)
      .post("/api/v1/master-records")
      .set("authorization", `Bearer ${tokenA}`)
      .send({ recordType: "category", code: "gen", name: "General" });
    expect(master.status).toBe(201);
    expect(master.body.recordType).toBe("CATEGORY");
    const masterRow = await prisma.masterRecord.findUnique({ where: { id: master.body.id as string } });
    expect(masterRow?.tenantId).toBe(first.tenant.id);

    const audit = await request(server).get("/api/v1/audit-events").set("authorization", `Bearer ${tokenA}`);
    expect(audit.status).toBe(200);
    const actions = (audit.body.items as { action: string }[]).map((item) => item.action);
    expect(actions).toContain("company.created");
    expect(actions).toContain("master_record.created");
    expect(JSON.stringify(audit.body)).not.toContain("passwordHash");

    const otherAudit = await request(server).get("/api/v1/audit-events").set("authorization", `Bearer ${tokenB}`);
    const otherActions = (otherAudit.body.items as { action: string }[]).map((item) => item.action);
    expect(otherActions).not.toContain("company.created");
  });

  it("reports live health for postgres and redis", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", postgres: "ok", redis: "ok" });
  });

  it("publishes OpenAPI for the core routes", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs-json");
    expect(response.status).toBe(200);
    expect(response.body.paths["/api/v1/auth/login"]).toBeDefined();
    expect(response.body.paths["/api/v1/companies"]).toBeDefined();
    expect(response.body.paths["/api/v1/master-records"]).toBeDefined();
  });
});
