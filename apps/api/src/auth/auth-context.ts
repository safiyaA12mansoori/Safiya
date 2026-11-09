export type AuthContext = {
  sessionId: string;
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  permissions: ReadonlySet<string>;
};

export type RequestMeta = {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
};
