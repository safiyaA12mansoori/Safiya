import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApiRouter } from "./api/routes.js";
import { errorHandler } from "./api/error-handler.js";
import { createAppContext, type AppContext } from "./app-context.js";
import { seedDemoData } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(ctx: AppContext = createAppContext()) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/api", createApiRouter(ctx));
  app.use(errorHandler);
  return app;
}

export function createSeededApp(): { app: ReturnType<typeof createApp>; ctx: AppContext } {
  const ctx = createAppContext();
  seedDemoData(ctx);
  return { app: createApp(ctx), ctx };
}
