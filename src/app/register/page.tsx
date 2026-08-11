"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

import { AuthShowcase } from "@/components/auth/auth-showcase";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    if (!accepted) return setError("Debés aceptar los términos y la política de privacidad.");
    setSubmitting(true);
    try {
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      await authService.register({ firstName: String(form.get("firstName")), lastName: String(form.get("lastName")), companyName: String(form.get("companyName")), taxId: String(form.get("taxId")), email, password });
      await authService.login({ email, password });
      router.replace("/dashboard?welcome=1");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_minmax(520px,.85fr)]">
      <AuthShowcase />
      <section className="flex items-center justify-center bg-background px-5 py-10 text-foreground sm:px-10">
        <div className="w-full max-w-md">
          <h2 className="text-heading-sm font-medium tracking-[-0.02em]">Crear cuenta</h2>
          <p className="mt-2 text-body-sm text-muted-foreground">Configurá tu empresa y empezá a trabajar con PAMPA.</p>
          <div className="mt-6 rounded-lg border border-success/20 bg-success-bg px-4 py-3 text-body-sm text-success">Alta inmediata · sin datos de demostración</div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3"><Field name="firstName" label="Nombre" placeholder="Juan" /><Field name="lastName" label="Apellido" placeholder="Pérez" /></div>
            <Field name="companyName" label="Nombre de tu negocio" placeholder="Ej. Distribuidora Norte" />
            <Field name="taxId" label="CUIT" placeholder="30712345678" inputMode="numeric" />
            <Field name="email" label="Email" placeholder="nombre@empresa.com" type="email" />
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Contraseña</label>
              <div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} minLength={12} maxLength={128} required autoComplete="new-password" className="h-11 pr-11" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground" aria-label="Mostrar u ocultar contraseña">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>
              <p className="mt-1.5 text-xs text-muted-foreground">12 caracteres, mayúscula, minúscula y número.</p>
            </div>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><input type="checkbox" className="mt-1 size-4" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>Acepto los términos y la <Link className="text-primary hover:underline" href="/privacidad">política de privacidad</Link>.</span></label>
            {error ? <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive-bg p-3 text-body-sm text-destructive">{error}</div> : null}
            <button type="submit" className={buttonVariants({ size: "lg", className: "h-11 w-full" })} disabled={submitting}>{submitting && <LoaderCircle className="size-4 animate-spin" />}{submitting ? "Creando tu espacio" : "Crear cuenta"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tenés cuenta? <Link className="font-medium text-foreground hover:underline" href="/login">Iniciar sesión</Link></p>
        </div>
      </section>
    </main>
  );
}

function Field(props: { name: string; label: string; placeholder: string; type?: string; inputMode?: "numeric" }) {
  return <div><label htmlFor={props.name} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{props.label}</label><Input id={props.name} name={props.name} type={props.type} inputMode={props.inputMode} required maxLength={255} className="h-11" placeholder={props.placeholder} /></div>;
}
