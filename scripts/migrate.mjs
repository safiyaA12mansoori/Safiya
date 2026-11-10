import { spawn } from "node:child_process";

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error(
    "Missing MIGRATION_DATABASE_URL. Migrations use the local bootstrap role. The API uses DATABASE_URL (milk_app).",
  );
  process.exit(1);
}

const child = spawn("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
