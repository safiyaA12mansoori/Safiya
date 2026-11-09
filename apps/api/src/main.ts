import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { configureApp } from "./app.configure";
import { AppModule } from "./app.module";
import { loadConfig } from "./config";
import { loadRootEnv } from "./load-env";

async function bootstrap(): Promise<void> {
  loadRootEnv();
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);
  configureApp(app, config.webOrigin);
  await app.listen(config.port);
}

void bootstrap();
