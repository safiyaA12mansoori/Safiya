const { URL } = require("node:url");

const databaseUrl = process.env.TEST_DATABASE_URL || "postgresql://milk:milk@localhost:5432/milk_epr_test";
const name = new URL(databaseUrl).pathname.replace(/^\//, "");
if (!name.endsWith("_test")) {
  throw new Error(`Refusing to run tests against database ${name}`);
}

process.env.DATABASE_URL = databaseUrl;
process.env.REDIS_URL = process.env.TEST_REDIS_URL || "redis://127.0.0.1:6379";
process.env.SESSION_TTL_HOURS = "12";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.NODE_ENV = "test";
process.env.API_PORT = "3001";
