"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";

import { AuthShowcase } from "@/components/auth/auth-showcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api";
import { authService, isEmailNotVerifiedError } from "@/services/auth.service";

const RESEND_COOLDOWN_SECONDS = 30;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(
      () => setResendCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendFeedback("");
    setSubmitting(true);

    try {
      await authService.login({ email, password });
      router.replace("/dashboard");
      router.refresh();
    } catch (loginError) {
      if (isEmailNotVerifiedError(loginError)) {
        setNeedsVerification(true);
        setError("Necesitás verificar tu correo antes de ingresar.");
      } else {
        // Wrong credentials keep the existing generic behavior — never
        // reveal EMAIL_NOT_VERIFIED-specific copy for a failed match.
        setError(loginError instanceof Error ? loginError.message : "No pudimos iniciar la sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    setResendFeedback("");
    try {
      const response = await authService.resendVerification(email);
      setResendFeedback(response.message);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (reason) {
      setResendFeedback(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos reenviar el correo. Intentá de nuevo en unos minutos.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_minmax(520px,.72fr)]">
      <AuthShowcase />

      <section className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-12 inline-flex items-center gap-2 lg:hidden">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="font-display text-lg font-medium tracking-[-0.03em]">PAMPA</span>
          </Link>
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface">
            <LockKeyhole className="size-5 text-primary" aria-hidden />
          </div>
          <h2 className="mt-7 text-heading-sm font-medium tracking-[-0.02em]">Bienvenido de nuevo</h2>
          <p className="mt-2 text-body-sm leading-6 text-muted-foreground">Ingresá con las credenciales asignadas a tu cuenta.</p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-body-sm font-medium">Correo electrónico</label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={255}
                className="h-11 px-3"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-body-sm font-medium">Contraseña</label>
                <Link href="/forgot-password" className="text-caption text-primary hover:underline">
                  Olvidé mi contraseña
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={128}
                  className="h-11 px-3 pr-11"
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="space-y-3 rounded-lg border border-destructive/20 bg-destructive-bg px-3 py-2.5 text-body-sm text-destructive">
                <p>{error}</p>
                {needsVerification && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => void resendVerification()}
                      disabled={resending || resendCooldown > 0}
                      className="inline-flex items-center gap-2 text-caption font-medium text-destructive underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-60"
                    >
                      {resending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                      {resendCooldown > 0 ? `Reenviar verificación (${resendCooldown}s)` : "Reenviar verificación"}
                    </button>
                    {resendFeedback && (
                      <p role="status" className="text-caption text-muted-foreground">
                        {resendFeedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting}>
              {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {submitting ? "Verificando acceso" : "Ingresar a PAMPA"}
            </Button>
          </form>

          <p className="mt-8 border-t border-border pt-6 text-center text-caption leading-5 text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
