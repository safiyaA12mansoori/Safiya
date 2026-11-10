export type ActionState = { error?: string };

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type Me = {
  user: { id: string; email: string; name: string; status: string };
  tenant: { id: string; name: string; slug: string };
  permissions: string[];
};

export type LoginResult = {
  token: string;
  expiresAt: string;
  maxAgeMs: number;
  user: { id: string; email: string; name: string; status: string };
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Company = {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Branch = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: string;
  company: { id: string; code: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
};

export type Permission = { key: string; description: string };

export type Role = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
};

export type Unit = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type MasterRecord = {
  id: string;
  recordType: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: { id: string; name: string; email: string } | null;
  createdAt: string;
};

export type Dashboard = {
  tenant: { id: string; name: string; slug: string; status: string };
  counts: {
    companies: number | null;
    branches: number | null;
    users: number | null;
    activeUsers: number | null;
    units: number | null;
    masterRecords: number | null;
    auditEvents: number | null;
  };
  recentAudit: Page<AuditEvent> | null;
};
