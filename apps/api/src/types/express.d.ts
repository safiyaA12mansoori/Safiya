import type { AuthContext } from "../auth/auth-context";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: AuthContext;
    }
  }
}

export {};
