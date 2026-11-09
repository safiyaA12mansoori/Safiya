import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

const STATUS_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const parsed = readBody(body);
    if (!(exception instanceof HttpException)) {
      console.error(exception);
    }
    response.status(status).json({
      statusCode: status,
      code: parsed.code ?? STATUS_CODES[status] ?? "ERROR",
      message: status === 500 ? "Internal server error" : parsed.message,
      ...(parsed.issues ? { issues: parsed.issues } : {}),
    });
  }
}

function readBody(body: unknown): { message: string; code?: string; issues?: unknown } {
  if (typeof body === "string") return { message: body };
  if (!body || typeof body !== "object") return { message: "Request failed" };
  const record = body as Record<string, unknown>;
  const rawMessage = record.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(", ")
    : typeof rawMessage === "string"
      ? rawMessage
      : "Request failed";
  return {
    message,
    code: typeof record.code === "string" ? record.code : undefined,
    issues: Array.isArray(record.issues) ? record.issues : undefined,
  };
}
