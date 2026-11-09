import { createParamDecorator, ExecutionContext, SetMetadata, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { AuthContext, RequestMeta } from "../auth/auth-context";
import { SESSION_COOKIE_NAME } from "../auth/constants";

export const IS_PUBLIC_KEY = "isPublic";
export const PERMISSIONS_KEY = "permissions";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.auth) {
    throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Authentication required" });
  }
  return request.auth;
});

export function readToken(req: Request): string | null {
  const header = req.header("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
  }
  const cookies = (req as Request & { cookies?: Record<string, string | undefined> }).cookies;
  const cookie = cookies?.[SESSION_COOKIE_NAME];
  return cookie && cookie.length > 0 ? cookie : null;
}

export function requestMeta(req: Request): RequestMeta {
  return {
    requestId: req.requestId ?? null,
    ip: req.ip || null,
    userAgent: req.header("user-agent") ?? null,
  };
}
