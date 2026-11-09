const { execSync } = require("node:child_process");
const path = require("node:path");
const { URL } = require("node:url");

module.exports = async function globalSetup() {
  const databaseUrl = process.env.TEST_DATABASE_URL || "postgresql://milk:milk@localhost:5432/milk_epr_test";
  const name = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) throw new Error(`Refusing to migrate database ${name}`);
  process.env.DATABASE_URL = databaseUrl;
  execSync("pnpm exec prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
};
