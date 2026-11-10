import { redirect } from "next/navigation";
import type { Me } from "./types";

const SESSION_COOKIE_NAME = "milk_epr_session";

export { SESSION_COOKIE_NAME };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const base = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "The API could not be reached.");
  }
  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok) {
    if (payload && typeof payload === "object" && "status" in payload) {
      throw new ApiError(response.status, messageFrom(payload), codeFrom(payload));
    }
    throw new ApiError(response.status, messageFrom(payload), codeFrom(payload));
  }
  return payload as T;
}

export async function requireSession(): Promise<{ token: string; me: Me }> {
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) redirect("/login");
  try {
    const me = await api<Me>("/api/v1/auth/me", token);
    return { token, me };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    throw error;
  }
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 180) };
  }
}

function messageFrom(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Request failed";
  const record = payload as { message?: unknown; issues?: { path?: string; message?: string }[] };
  const base = typeof record.message === "string" ? record.message : "Request failed";
  const issues = Array.isArray(record.issues)
    ? record.issues
        .map((issue) => [issue.path, issue.message].filter(Boolean).join(": "))
        .filter(Boolean)
        .join("; ")
    : "";
  return issues ? `${base} — ${issues}` : base;
}

function codeFrom(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const code = (payload as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
