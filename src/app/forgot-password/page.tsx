"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await authService.forgotPassword(email);
      setMessage(response.data.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos procesar la solicitud.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          <span className="font-display text-body-sm font-medium tracking-[-0.03em]">PAMPA</span>
        </Link>
        <h1 className="mt-8 text-heading-sm font-medium tracking-[-0.02em]">Recuperá tu acceso</h1>
        <p className="mt-2 text-body-sm leading-6 text-muted-foreground">
          Te enviaremos un enlace seguro si existe una cuenta activa.
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-body-sm font-medium" htmlFor="email">
            Correo electrónico
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {message && <p className="text-body-sm text-success">{message}</p>}
          {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={submitting}>
            {submitting ? "Procesando…" : "Enviar instrucciones"}
          </Button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-body-sm text-primary hover:underline">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
