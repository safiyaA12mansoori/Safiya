import { Controller, Get, HttpCode, Post, Req, Res, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { changePasswordSchema, loginSchema, type ChangePasswordInput, type LoginInput } from "@milk-epr/validation";
import type { Request, Response } from "express";
import { ApiZodBody } from "../common/zod-openapi";
import { CurrentAuth, Public, readToken, requestMeta } from "../common/decorators";
import { ZodValidationPipe } from "../common/zod.pipe";
import type { AuthContext } from "./auth-context";
import { AuthService } from "./auth.service";
import { SESSION_COOKIE_NAME } from "./constants";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in with a tenant slug, email, and password" })
  @ApiZodBody(loginSchema)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body, requestMeta(req));
    res.cookie(SESSION_COOKIE_NAME, result.token, cookieOptions(result.maxAgeMs));
    return result;
  }

  @Post("logout")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current session" })
  async logout(
    @CurrentAuth() auth: AuthContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = readToken(req);
    if (token) await this.auth.logout(token, auth, requestMeta(req));
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { ok: true };
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Return the signed-in user, tenant, and permissions" })
  me(@CurrentAuth() auth: AuthContext) {
    return this.auth.me(auth);
  }

  @Post("password")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the signed-in user's password" })
  @ApiZodBody(changePasswordSchema)
  async changePassword(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
    @Req() req: Request,
  ) {
    await this.auth.changePassword(auth, body, requestMeta(req));
    return { ok: true };
  }
}

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  };
}
