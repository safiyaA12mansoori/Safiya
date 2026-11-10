export const PERMISSION_CATALOG = [
  { key: "tenant.read", description: "View the current tenant" },
  { key: "tenant.update", description: "Update the current tenant profile" },
  { key: "company.read", description: "List and view companies" },
  { key: "company.create", description: "Create companies" },
  { key: "company.update", description: "Update and retire companies" },
  { key: "branch.read", description: "List and view branches" },
  { key: "branch.create", description: "Create branches" },
  { key: "branch.update", description: "Update and retire branches" },
  { key: "user.read", description: "List and view users" },
  { key: "user.create", description: "Create users" },
  { key: "user.update", description: "Update users and assign roles" },
  { key: "role.read", description: "List roles and the permission catalogue" },
  { key: "role.manage", description: "Create and update roles" },
  { key: "master.read", description: "List master records and units of measure" },
  { key: "master.manage", description: "Create and update master records and units" },
  { key: "audit.read", description: "View the audit log" },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map((item) => item.key);

export const READER_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter((key) => key.endsWith(".read"));
