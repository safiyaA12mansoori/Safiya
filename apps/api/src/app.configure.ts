import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AllExceptionsFilter } from "./common/http.filter";

export function configureApp(app: INestApplication, webOrigin: string): void {
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: webOrigin, credentials: true });
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Milk EPR API")
    .setDescription("Core enterprise platform. Business modules are not part of this service.")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addCookieAuth("milk_epr_session")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));
}
