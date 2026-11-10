export type AppConfig = {
  databaseUrl: string;
  redisUrl: string;
  port: number;
  webOrigin: string;
  sessionTtlSeconds: number;
  nodeEnv: string;
};

export const APP_CONFIG = Symbol("APP_CONFIG");

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = required(env, "DATABASE_URL");
  const redisUrl = required(env, "REDIS_URL");
  const sessionTtlHours = numberFrom(env.SESSION_TTL_HOURS, 12);
  if (sessionTtlHours <= 0 || sessionTtlHours > 24 * 14) {
    throw new Error("SESSION_TTL_HOURS is out of range");
  }
  return {
    databaseUrl,
    redisUrl,
    port: numberFrom(env.API_PORT ?? env.PORT, 3001),
    webOrigin: env.WEB_ORIGIN ?? "http://localhost:3000",
    sessionTtlSeconds: Math.round(sessionTtlHours * 3600),
    nodeEnv: env.NODE_ENV ?? "development",
  };
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function numberFrom(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}
