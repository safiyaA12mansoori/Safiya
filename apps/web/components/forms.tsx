"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import type { ActionState } from "../lib/types";

export function ActionForm({
  action,
  children,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      {children}
      {state.error ? (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label={submitLabel} />
    </form>
  );
}

export function LoginForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Tenant slug</span>
        <input name="tenantSlug" required autoComplete="organization" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Email</span>
        <input name="email" type="email" required autoComplete="username" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className={fieldClass} />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label="Sign in" />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit bg-copper px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

const fieldClass = "w-full border border-line bg-white px-3 py-2 text-sm";
