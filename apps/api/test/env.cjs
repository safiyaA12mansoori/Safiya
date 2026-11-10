const { URL } = require("node:url");

function assertTestDatabase(url, label) {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run tests against ${label} database ${name}`);
  }
}

const appUrl = process.env.TEST_DATABASE_URL || "postgresql://milk_app:milk_app_local@localhost:5432/milk_epr_test";
const migrationUrl =
  process.env.TEST_MIGRATION_DATABASE_URL || "postgresql://milk:milk@localhost:5432/milk_epr_test";
assertTestDatabase(appUrl, "application");
assertTestDatabase(migrationUrl, "migration");

process.env.DATABASE_URL = appUrl;
process.env.MIGRATION_DATABASE_URL = migrationUrl;
process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://127.0.0.1:6379";
process.env.SESSION_TTL_HOURS = "12";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.NODE_ENV = "test";
process.env.API_PORT = "3001";
