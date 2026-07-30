"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) return setError("El enlace de recuperación no es válido.");
    if (password !== confirmed) return setError("Las contraseñas no coinciden.");
    setSubmitting(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos restablecer la contraseña.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f8fafc] px-5 text-[#111827]">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
        {done ? (
          <div className="mt-6">
            <p className="text-sm text-emerald-700">Tu contraseña fue actualizada.</p>
            <Link href="/login" className="mt-5 inline-block text-sm text-blue-600">
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <Input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              placeholder="Nueva contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              placeholder="Repetir contraseña"
              value={confirmed}
              onChange={(event) => setConfirmed(event.target.value)}
            />
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button className="w-full" disabled={submitting}>
              {submitting ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f8fafc]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
