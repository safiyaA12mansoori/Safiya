import { LoginForm } from "../../components/forms";
import { loginAction } from "../../lib/actions";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-xs uppercase tracking-[0.18em] text-copper">Milk EPR</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in</h1>
      <p className="mt-2 mb-6 text-sm text-stone-700">
        Use the tenant slug, email, and password issued for your organization. This screen does not create an account.
      </p>
      <LoginForm action={loginAction} />
    </main>
  );
}
