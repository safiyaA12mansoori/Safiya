import { createHash } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import Redis from "ioredis";
import request from "supertest";
import {
  TEST_PASSWORD,
  addUser,
  createTestApp,
  login,
  prisma,
  provisionTenant,
  sharedPasswordHash,
  truncate,
} from "./helpers";

describe("authentication", () => {
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

  it("rejects an unknown password and accepts a valid session", async () => {
    const { tenant, email } = await provisionTenant(passwordHash, "auth-a");
    const server = app.getHttpServer();

    const denied = await request(server)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email, password: "not-the-password" });
    expect(denied.status).toBe(401);
    expect(denied.body.code).toBe("INVALID_CREDENTIALS");

    const signedIn = await login(app, tenant.slug, email);
    expect(signedIn.status).toBe(200);
    expect(typeof signedIn.body.token).toBe("string");
    expect(signedIn.body.user.email).toBe(email);
    expect(JSON.stringify(signedIn.body)).not.toContain("passwordHash");

    const me = await request(server)
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${signedIn.body.token as string}`);
    expect(me.status).toBe(200);
    expect(me.body.tenant.slug).toBe(tenant.slug);
    expect(me.body.permissions).toContain("company.create");

    const missing = await request(server).get("/api/v1/auth/me");
    expect(missing.status).toBe(401);

    const loggedOut = await request(server)
      .post("/api/v1/auth/logout")
      .set("authorization", `Bearer ${signedIn.body.token as string}`);
    expect(loggedOut.status).toBe(200);
    const after = await request(server)
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${signedIn.body.token as string}`);
    expect(after.status).toBe(401);
  });

  it("stores the session in Redis and restores it from PostgreSQL", async () => {
    const { tenant, email } = await provisionTenant(passwordHash, "auth-redis");
    const signedIn = await login(app, tenant.slug, email);
    const token = signedIn.body.token as string;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
    expect(await redis.get(`milk-epr:session:${tokenHash}`)).toEqual(expect.any(String));
    await redis.del(`milk-epr:session:${tokenHash}`);
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(await redis.get(`milk-epr:session:${tokenHash}`)).toEqual(expect.any(String));
    await redis.quit();
  });

  it("blocks a disabled user and an existing session", async () => {
    const { tenant, email } = await provisionTenant(passwordHash, "auth-disable");
    const admin = await login(app, tenant.slug, email);
    const limited = await addUser(tenant.id, passwordHash, ["company.read"], "disabled@example.com");
    const session = await login(app, tenant.slug, limited.email);
    expect(session.status).toBe(200);
    const disabled = await request(app.getHttpServer())
      .patch(`/api/v1/users/${limited.user.id}`)
      .set("authorization", `Bearer ${admin.body.token as string}`)
      .send({ status: "INACTIVE" });
    expect(disabled.status).toBe(200);
    const reused = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${session.body.token as string}`);
    expect(reused.status).toBe(401);
    const again = await login(app, tenant.slug, limited.email, TEST_PASSWORD);
    expect(again.status).toBe(401);
  });

  it("rate limits repeated failures through Redis", async () => {
    const { tenant, email } = await provisionTenant(passwordHash, "auth-limit");
    const server = app.getHttpServer();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(server)
        .post("/api/v1/auth/login")
        .send({ tenantSlug: tenant.slug, email, password: "wrong-password-value" });
      expect(response.status).toBe(401);
    }
    const blocked = await request(server)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email, password: TEST_PASSWORD });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
  });
});
