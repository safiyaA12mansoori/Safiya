import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

export function loadRootEnv(): void {
  let dir = __dirname;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      loadEnv({ path: resolve(dir, ".env") });
      return;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) return;
    dir = parent;
  }
}
