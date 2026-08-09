"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "duplicate"; message: string }
  | { kind: "error"; message: string };

const initialState: SubmissionState = { kind: "idle" };

export function WaitlistForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const formStartedAt = useRef<number | null>(null);
  const [state, setState] = useState<SubmissionState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      company: data.get("company"),
      role: data.get("role"),
      consent: data.get("consent") === "on",
      website: data.get("website"),
      formStartedAt: formStartedAt.current ?? Date.now(),
    };

    setIsSubmitting(true);
    setState(initialState);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body: unknown = await response.json();
      const message = getResponseMessage(body);

      if (!response.ok) {
        setState({ kind: "error", message });
        return;
      }

      const alreadyRegistered = isAlreadyRegistered(body);
      setState({ kind: alreadyRegistered ? "duplicate" : "success", message });
      formRef.current?.reset();
      formStartedAt.current = Date.now();
    } catch {
      setState({ kind: "error", message: "No pudimos conectar con la lista de espera. Intentá nuevamente." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-[#f2f1e8]">Nombre<input required name="name" maxLength={100} autoComplete="name" className="h-12 border border-white/10 bg-[#0b0d0a] px-3 outline-none transition-colors focus:border-[#b8e26b]" /></label>
        <label className="grid gap-2 text-sm text-[#f2f1e8]">Correo electrónico<input required name="email" type="email" maxLength={254} autoComplete="email" className="h-12 border border-white/10 bg-[#0b0d0a] px-3 outline-none transition-colors focus:border-[#b8e26b]" /></label>
        <label className="grid gap-2 text-sm text-[#f2f1e8]">Empresa <span className="text-[#a7aa9d]">(opcional)</span><input name="company" maxLength={120} autoComplete="organization" className="h-12 border border-white/10 bg-[#0b0d0a] px-3 outline-none transition-colors focus:border-[#b8e26b]" /></label>
        <label className="grid gap-2 text-sm text-[#f2f1e8]">Rol <span className="text-[#a7aa9d]">(opcional)</span><input name="role" maxLength={100} autoComplete="organization-title" className="h-12 border border-white/10 bg-[#0b0d0a] px-3 outline-none transition-colors focus:border-[#b8e26b]" /></label>
      </div>
      <div className="sr-only" aria-hidden="true"><label htmlFor="website">Sitio web</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
      <label className="flex items-start gap-3 text-sm leading-5 text-[#a7aa9d]"><input required name="consent" type="checkbox" className="mt-1 size-4 accent-[#b8e26b]" />Acepto recibir novedades relacionadas con PAMPA y leí la <a href="/privacidad" className="underline underline-offset-4 hover:text-[#f2f1e8]">política de privacidad</a>.</label>
      <button type="submit" disabled={isSubmitting} className="w-full bg-[#b8e26b] px-5 py-3 text-sm font-semibold text-[#0b0d0a] transition-colors hover:bg-[#d2f58a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit">{isSubmitting ? "Enviando…" : "Solicitar acceso"}</button>
      {state.kind !== "idle" && <p role="status" className={`text-sm leading-6 ${state.kind === "error" ? "text-[#d6b58a]" : "text-[#b8e26b]"}`}>{state.kind === "success" ? getSuccessMessage(state.message) : state.message}</p>}
    </form>
  );
}

function getResponseMessage(body: unknown) {
  if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return "No pudimos procesar tu solicitud. Intentá nuevamente.";
}

function isAlreadyRegistered(body: unknown) {
  return typeof body === "object" && body !== null && "alreadyRegistered" in body && body.alreadyRegistered === true;
}

function getSuccessMessage(message: string) {
  return message === "Registramos tu solicitud. Revisá tu correo."
    ? "Ya estás en la lista. Revisá tu correo."
    : message;
}
