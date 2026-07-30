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
    <main className="grid min-h-screen place-items-center bg-[#f8fafc] px-5 text-[#111827]">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[-0.05em]">PAMPA.</p>
        <h1 className="mt-8 text-2xl font-semibold">Recuperá tu acceso</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Te enviaremos un enlace seguro si existe una cuenta activa.
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium" htmlFor="email">
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
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button className="w-full" disabled={submitting}>
            {submitting ? "Procesando…" : "Enviar instrucciones"}
          </Button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm text-blue-600">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
