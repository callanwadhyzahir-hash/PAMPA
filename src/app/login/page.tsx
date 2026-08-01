"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await authService.login({ email, password });
      router.replace("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No pudimos iniciar la sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#0b0d0a] text-[#f2f1e8] lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.72fr)]">
      <section className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:48px_48px]" />
        <Link href="/" className="relative text-xl font-semibold tracking-[-0.08em]">
          PAMPA<span className="text-[#b8e26b]">.</span>
        </Link>
        <div className="relative max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#b8e26b]">Espacio de trabajo seguro</p>
          <h1 className="mt-5 text-5xl font-medium leading-[0.98] tracking-[-0.065em]">
            Tu empresa.<br />Una operación conectada.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#a7aa9d]">
            Accedé a la información operativa de tu organización desde un entorno privado, claro y preparado para el trabajo diario.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-sm text-[#a7aa9d]">
          <ShieldCheck className="size-5 text-[#b8e26b]" aria-hidden />
          Sesión cifrada y acceso controlado por organización
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-12 text-[#111827] sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-12 inline-block text-lg font-semibold tracking-[-0.08em] lg:hidden">
            PAMPA<span className="text-[#2563eb]">.</span>
          </Link>
          <div className="flex size-11 items-center justify-center rounded-xl border bg-white">
            <LockKeyhole className="size-5 text-[#2563eb]" aria-hidden />
          </div>
          <h2 className="mt-7 text-3xl font-semibold tracking-[-0.045em]">Bienvenido de nuevo</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">Ingresá con las credenciales asignadas a tu cuenta.</p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">Correo electrónico</label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={255}
                className="h-11 bg-white px-3"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
                <Link href="/forgot-password" className="text-xs text-[#2563eb] hover:underline">
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
                  className="h-11 bg-white px-3 pr-11"
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#6b7280] hover:text-[#111827]"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting}>
              {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {submitting ? "Verificando acceso" : "Ingresar a PAMPA"}
            </Button>
          </form>

          <p className="mt-8 border-t pt-6 text-center text-xs leading-5 text-[#6b7280]">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="font-medium text-[#2563eb] hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
