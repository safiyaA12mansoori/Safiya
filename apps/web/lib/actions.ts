"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, api, requireSession, SESSION_COOKIE_NAME } from "./api";
import type { ActionState, LoginResult } from "./types";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function many(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && value.length > 0);
}

function failure(error: unknown): ActionState {
  if (error instanceof ApiError) return { error: error.message };
  return { error: "The API could not be reached." };
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const result = await api<LoginResult>("/api/v1/auth/login", null, {
      method: "POST",
      body: JSON.stringify({
        tenantSlug: text(formData, "tenantSlug"),
        email: text(formData, "email"),
        password: text(formData, "password"),
      }),
    });
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(result.maxAgeMs / 1000),
    });
  } catch (error) {
    return failure(error);
  }
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      await api("/api/v1/auth/logout", token, { method: "POST" });
    } catch {
      // The browser cookie is still removed below.
    }
  }
  jar.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function changePasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  try {
    await api("/api/v1/auth/password", token, {
      method: "POST",
      body: JSON.stringify({
        currentPassword: text(formData, "currentPassword"),
        newPassword: text(formData, "newPassword"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/");
  redirect("/");
}

export async function updateTenantAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  try {
    await api("/api/v1/tenant", token, {
      method: "PATCH",
      body: JSON.stringify({ name: text(formData, "name"), slug: text(formData, "slug") }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/organization");
  revalidatePath("/");
  redirect("/organization");
}

export async function createCompanyAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  let created: { id: string };
  try {
    created = await api<{ id: string }>("/api/v1/companies", token, {
      method: "POST",
      body: JSON.stringify({
        code: text(formData, "code"),
        name: text(formData, "name"),
        legalName: text(formData, "legalName"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/companies");
  revalidatePath("/");
  redirect(`/companies/${created.id}`);
}

export async function updateCompanyAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  const id = text(formData, "id");
  const legalName = text(formData, "legalName");
  try {
    await api(`/api/v1/companies/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({
        name: text(formData, "name"),
        legalName: legalName === "" ? null : legalName,
        status: text(formData, "status"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function retireCompanyAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (text(formData, "confirm") !== "yes") return { error: "Confirm retirement before submitting." };
  const { token } = await requireSession();
  const id = text(formData, "id");
  try {
    await api(`/api/v1/companies/${id}/retire`, token, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/companies");
  revalidatePath("/");
  redirect("/companies");
}

export async function createBranchAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  let created: { id: string };
  try {
    created = await api<{ id: string }>("/api/v1/branches", token, {
      method: "POST",
      body: JSON.stringify({
        companyId: text(formData, "companyId"),
        code: text(formData, "code"),
        name: text(formData, "name"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/branches");
  revalidatePath("/");
  redirect(`/branches/${created.id}`);
}

export async function updateBranchAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  const id = text(formData, "id");
  try {
    await api(`/api/v1/branches/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ name: text(formData, "name"), status: text(formData, "status") }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/branches");
  redirect(`/branches/${id}`);
}

export async function retireBranchAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (text(formData, "confirm") !== "yes") return { error: "Confirm retirement before submitting." };
  const { token } = await requireSession();
  const id = text(formData, "id");
  try {
    await api(`/api/v1/branches/${id}/retire`, token, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/branches");
  revalidatePath("/");
  redirect("/branches");
}

export async function createUserAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  let created: { id: string };
  try {
    created = await api<{ id: string }>("/api/v1/users", token, {
      method: "POST",
      body: JSON.stringify({
        email: text(formData, "email"),
        name: text(formData, "name"),
        password: text(formData, "password"),
        roleIds: many(formData, "roleIds"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/users");
  revalidatePath("/");
  redirect(`/users/${created.id}`);
}

export async function updateUserAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  const id = text(formData, "id");
  const password = text(formData, "newPassword");
  try {
    await api(`/api/v1/users/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({
        name: text(formData, "name"),
        status: text(formData, "status"),
        ...(password ? { newPassword: password } : {}),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/users");
  redirect(`/users/${id}`);
}

export async function replaceRolesAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  const id = text(formData, "id");
  try {
    await api(`/api/v1/users/${id}/roles`, token, {
      method: "PUT",
      body: JSON.stringify({ roleIds: many(formData, "roleIds") }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/users/${id}`);
  redirect(`/users/${id}`);
}

export async function createRoleAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  let created: { id: string };
  try {
    created = await api<{ id: string }>("/api/v1/roles", token, {
      method: "POST",
      body: JSON.stringify({
        name: text(formData, "name"),
        description: text(formData, "description"),
        permissionKeys: many(formData, "permissionKeys"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/roles");
  redirect(`/roles/${created.id}`);
}

export async function updateRoleAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  const id = text(formData, "id");
  const description = text(formData, "description");
  try {
    await api(`/api/v1/roles/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({
        name: text(formData, "name"),
        description: description === "" ? null : description,
        permissionKeys: many(formData, "permissionKeys"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/roles");
  redirect(`/roles/${id}`);
}

export async function createUnitAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  let created: { id: string };
  try {
    created = await api<{ id: string }>("/api/v1/units", token, {
      method: "POST",
      body: JSON.stringify({ code: text(formData, "code"), name: text(formData, "name") }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/units");
  revalidatePath("/");
  redirect(`/units/${created.id}`);
}

export async function updateUnitAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  const id = text(formData, "id");
  try {
    await api(`/api/v1/units/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ name: text(formData, "name"), status: text(formData, "status") }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/units");
  redirect(`/units/${id}`);
}

export async function retireUnitAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (text(formData, "confirm") !== "yes") return { error: "Confirm retirement before submitting." };
  const { token } = await requireSession();
  const id = text(formData, "id");
  try {
    await api(`/api/v1/units/${id}/retire`, token, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/units");
  revalidatePath("/");
  redirect("/units");
}

export async function createMasterAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  let created: { id: string };
  try {
    created = await api<{ id: string }>("/api/v1/master-records", token, {
      method: "POST",
      body: JSON.stringify({
        recordType: text(formData, "recordType"),
        code: text(formData, "code"),
        name: text(formData, "name"),
        description: text(formData, "description"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/master-data");
  revalidatePath("/");
  redirect(`/master-data/${created.id}`);
}

export async function updateMasterAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireSession();
  const id = text(formData, "id");
  const description = text(formData, "description");
  try {
    await api(`/api/v1/master-records/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({
        name: text(formData, "name"),
        description: description === "" ? null : description,
        status: text(formData, "status"),
      }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/master-data");
  redirect(`/master-data/${id}`);
}

export async function retireMasterAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (text(formData, "confirm") !== "yes") return { error: "Confirm retirement before submitting." };
  const { token } = await requireSession();
  const id = text(formData, "id");
  try {
    await api(`/api/v1/master-records/${id}/retire`, token, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/master-data");
  revalidatePath("/");
  redirect("/master-data");
}
