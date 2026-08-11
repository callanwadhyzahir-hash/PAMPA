"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CircleAlert, LoaderCircle, PartyPopper } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ApiError } from "@/services/api";
import { authService } from "@/services/auth.service";

type VerifyState = "verifying" | "success" | "rejected" | "error";

function VerifyEmailContent() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<VerifyState>("verifying");
  // The backend uses one generic message for an invalid, expired or already
  // used token (it doesn't distinguish the reason) — we show exactly that,
  // rather than guessing which case it is on the frontend.
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      const timer = window.setTimeout(() => {
        setState("rejected");
        setMessage("El enlace de verificación no es válido.");
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    authService
      .verifyEmail(token)
      .then(() => {
        if (active) setState("success");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 401) {
          setState("rejected");
          setMessage(reason.message);
        } else {
          setState("error");
          setMessage(
            reason instanceof Error
              ? reason.message
              : "No pudimos verificar tu correo.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          <span className="font-display text-body-sm font-medium tracking-[-0.03em]">PAMPA</span>
        </Link>

        {state === "verifying" ? (
          <div className="mt-8" role="status" aria-live="polite">
            <LoaderCircle className="mx-auto size-6 animate-spin text-primary" aria-hidden />
            <p className="mt-4 text-body-sm text-muted-foreground">Verificando tu correo…</p>
          </div>
        ) : null}

        {state === "success" ? (
          <div className="mt-8" aria-live="polite">
            <div className="mx-auto flex size-11 items-center justify-center rounded-lg border border-success/20 bg-success-bg">
              <PartyPopper className="size-5 text-success" aria-hidden />
            </div>
            <h1 className="mt-5 text-heading-sm font-medium tracking-[-0.02em]">Correo verificado</h1>
            <p className="mt-2 text-body-sm leading-6 text-muted-foreground">
              Tu cuenta de PAMPA ya está lista.
            </p>
            <Link href="/login" className={buttonVariants({ size: "lg", className: "mt-7 h-11 w-full" })}>
              Iniciar sesión
            </Link>
          </div>
        ) : null}

        {(state === "rejected" || state === "error") ? (
          <div className="mt-8" role="alert">
            <div className="mx-auto flex size-11 items-center justify-center rounded-lg border border-destructive/20 bg-destructive-bg">
              <CircleAlert className="size-5 text-destructive" aria-hidden />
            </div>
            <h1 className="mt-5 text-heading-sm font-medium tracking-[-0.02em]">
              {state === "rejected" ? "No pudimos verificar tu correo" : "Algo salió mal"}
            </h1>
            <p className="mt-2 text-body-sm leading-6 text-muted-foreground">
              {message || "Intentá nuevamente en unos instantes."}
            </p>
            <Link href="/login" className={buttonVariants({ variant: "outline", className: "mt-7 h-11 w-full" })}>
              Volver a iniciar sesión
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
