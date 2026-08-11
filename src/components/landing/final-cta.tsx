import { ArrowUpRight } from "lucide-react";

import { MagneticButton } from "@/components/landing/magnetic-button";
import { Reveal } from "@/components/landing/reveal";
import { SignalPulseBackground } from "@/components/landing/signal-pulse-background";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-phosphor-blue-black bg-ground-iron">
      <SignalPulseBackground />
      <div className="relative z-10 mx-auto max-w-[1280px] px-5 py-20 text-center sm:px-8">
        <Reveal>
          <h2 className="mx-auto max-w-xl text-heading leading-[1.1] tracking-[-0.02em] text-phosphor-white sm:text-heading-lg">
            Tu negocio merece un solo sistema.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-5 max-w-sm text-body leading-7 text-sage-60">
            Empezá a manejar ventas, stock, clientes y pagos desde PAMPA.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-9 flex flex-col items-center gap-4">
            <MagneticButton
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-pulse px-7 py-4 text-body-sm font-medium text-void-black transition-colors duration-300 ease-out hover:bg-mint-frost"
            >
              Empezar con PAMPA <ArrowUpRight className="size-4" />
            </MagneticButton>
            <a href="/login" className="text-body-sm text-sage-60 underline-offset-4 transition-colors duration-300 ease-out hover:text-phosphor-white hover:underline">
              ¿Ya tenés cuenta? Iniciar sesión
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
