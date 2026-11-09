import { z } from "zod";

const blankToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

export const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Use letters, numbers, hyphens, or underscores")
  .transform((value) => value.toUpperCase());

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(200);
export const loginPasswordSchema = z.string().min(1).max(200);
export const personNameSchema = z.string().trim().min(1).max(120);
export const titleSchema = z.string().trim().min(1).max(200);

export const optionalTitle = z.preprocess(blankToUndefined, titleSchema.optional());

const optionalLongText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().min(1).max(max).optional());

export const loginSchema = z.object({
  tenantSlug: slugSchema,
  email: emailSchema,
  password: loginPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: loginPasswordSchema,
  newPassword: passwordSchema,
});

export const updateTenantSchema = z
  .object({
    name: titleSchema.optional(),
    slug: slugSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: "No changes submitted",
  });

export const createCompanySchema = z.object({
  code: codeSchema,
  name: titleSchema,
  legalName: optionalTitle,
});

export const updateCompanySchema = z
  .object({
    name: titleSchema.optional(),
    legalName: z.union([titleSchema, z.null()]).optional(),
    status: recordStatusSchema.optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.legalName !== undefined || value.status !== undefined,
    { message: "No changes submitted" },
  );

export const createBranchSchema = z.object({
  companyId: z.string().uuid(),
  code: codeSchema,
  name: titleSchema,
});

export const updateBranchSchema = z
  .object({
    name: titleSchema.optional(),
    status: recordStatusSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.status !== undefined, {
    message: "No changes submitted",
  });

export const createUserSchema = z.object({
  email: emailSchema,
  name: personNameSchema,
  password: passwordSchema,
  roleIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateUserSchema = z
  .object({
    name: personNameSchema.optional(),
    status: recordStatusSchema.optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.status !== undefined || value.newPassword !== undefined,
    { message: "No changes submitted" },
  );

export const replaceUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export const createRoleSchema = z.object({
  name: personNameSchema,
  description: optionalLongText(300),
  permissionKeys: z.array(z.string().trim().min(3).max(80)).min(1),
});

export const updateRoleSchema = z
  .object({
    name: personNameSchema.optional(),
    description: z.union([z.string().trim().min(1).max(300), z.null()]).optional(),
    permissionKeys: z.array(z.string().trim().min(3).max(80)).min(1).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.description !== undefined || value.permissionKeys !== undefined,
    { message: "No changes submitted" },
  );

export const masterTypeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Use a short type code such as CATEGORY")
  .transform((value) => value.toUpperCase());

export const createMasterRecordSchema = z.object({
  recordType: masterTypeSchema,
  code: codeSchema,
  name: titleSchema,
  description: optionalLongText(500),
});

export const updateMasterRecordSchema = z
  .object({
    name: titleSchema.optional(),
    description: z.union([z.string().trim().max(500), z.null()]).optional(),
    status: recordStatusSchema.optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined || value.status !== undefined,
    { message: "No changes submitted" },
  );

export const createUnitSchema = z.object({
  code: codeSchema,
  name: titleSchema,
});

export const updateUnitSchema = updateBranchSchema;

export const confirmSchema = z.object({
  confirm: z.literal(true),
});

const queryInt = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : value),
    z.coerce.number().int().min(min).max(max),
  );

export const listQuerySchema = z.object({
  limit: queryInt(50, 1, 100),
  offset: queryInt(0, 0, 100_000),
  companyId: z.preprocess(blankToUndefined, z.string().uuid().optional()),
  recordType: z.preprocess(blankToUndefined, z.string().trim().min(1).max(32).optional()),
  q: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type RecordStatus = z.infer<typeof recordStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ReplaceUserRolesInput = z.infer<typeof replaceUserRolesSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateMasterRecordInput = z.infer<typeof createMasterRecordSchema>;
export type UpdateMasterRecordInput = z.infer<typeof updateMasterRecordSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
