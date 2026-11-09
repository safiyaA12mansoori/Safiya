import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, readToken } from "./decorators";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    const token = readToken(request);
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    const auth = await this.auth.resolve(token);
    if (!auth) {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    request.auth = auth;
    return true;
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.auth;
    if (!auth) {
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    const missing = required.filter((key) => !auth.permissions.has(key));
    if (missing.length > 0) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: `Missing permission ${missing.join(", ")}`,
      });
    }
    return true;
  }
}
