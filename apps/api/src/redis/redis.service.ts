import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { APP_CONFIG, type AppConfig } from "../config";
import { LOGIN_FAIL_WINDOW_SECONDS, REDIS_PREFIX } from "../auth/constants";

export type SessionCache = {
  sessionId: string;
  userId: string;
  tenantId: string;
};

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error("Redis unavailable at startup", error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async getSession(tokenHash: string): Promise<SessionCache | null> {
    try {
      const raw = await this.client.get(this.sessionKey(tokenHash));
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isSessionCache(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async setSession(tokenHash: string, value: SessionCache, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(this.sessionKey(tokenHash), JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      console.error("Redis session write failed", error);
    }
  }

  async deleteSession(tokenHash: string): Promise<void> {
    try {
      await this.client.del(this.sessionKey(tokenHash));
    } catch (error) {
      console.error("Redis session delete failed", error);
    }
  }

  async getLoginFailures(ip: string, email: string): Promise<number | null> {
    try {
      const raw = await this.client.get(this.loginKey(ip, email));
      return raw ? Number(raw) : 0;
    } catch (error) {
      console.error("Redis rate-limit read failed", error);
      return null;
    }
  }

  async incrementLoginFailure(ip: string, email: string): Promise<void> {
    const key = this.loginKey(ip, email);
    try {
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, LOGIN_FAIL_WINDOW_SECONDS);
    } catch (error) {
      console.error("Redis rate-limit write failed", error);
    }
  }

  async clearLoginFailures(ip: string, email: string): Promise<void> {
    try {
      await this.client.del(this.loginKey(ip, email));
    } catch (error) {
      console.error("Redis rate-limit clear failed", error);
    }
  }

  private sessionKey(tokenHash: string): string {
    return `${REDIS_PREFIX}session:${tokenHash}`;
  }

  private loginKey(ip: string, email: string): string {
    return `${REDIS_PREFIX}login-fail:${ip}:${email}`;
  }
}

function isSessionCache(value: unknown): value is SessionCache {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sessionId === "string" &&
    typeof record.userId === "string" &&
    typeof record.tenantId === "string"
  );
}
