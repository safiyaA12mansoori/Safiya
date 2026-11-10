import { loginSchema, passwordSchema } from "@milk-epr/validation";
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG, READER_PERMISSION_KEYS } from "../src/rbac/catalogue";

describe("permission catalogue", () => {
  it("has unique permission keys", () => {
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(PERMISSION_CATALOG.length);
  });

  it("gives readers only read permissions", () => {
    expect(READER_PERMISSION_KEYS.length).toBeGreaterThan(0);
    expect(READER_PERMISSION_KEYS.every((key) => key.endsWith(".read"))).toBe(true);
    expect(READER_PERMISSION_KEYS).not.toContain("company.create");
    expect(READER_PERMISSION_KEYS).not.toContain("role.manage");
  });
});

describe("validation contracts", () => {
  it("rejects a short password for new credentials", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("local-dev-password").success).toBe(true);
  });

  it("requires a tenant slug at login", () => {
    const parsed = loginSchema.safeParse({
      tenantSlug: "A",
      email: "admin@example.com",
      password: "secret",
    });
    expect(parsed.success).toBe(false);
  });
});
