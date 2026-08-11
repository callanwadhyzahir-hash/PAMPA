import { ArrowUpRight } from "lucide-react";

import { MagneticButton } from "@/components/landing/magnetic-button";
import { ProductConsole } from "@/components/landing/product-console";
import { Reveal } from "@/components/landing/reveal";
import { SignalPulseBackground } from "@/components/landing/signal-pulse-background";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-phosphor-blue-black bg-void-black">
      <SignalPulseBackground />
      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-28">
        <div>
          <Reveal>
            <p className="font-mono text-caption font-medium uppercase tracking-[0.16em] text-moss-70">Gestión comercial</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-xl text-heading-lg leading-[1.02] tracking-[-0.02em] text-phosphor-white sm:text-display sm:leading-[0.98]">
              Todo tu negocio.
              <br />
              Bajo <span className="text-lime-pulse">control</span>.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-[38rem] text-subheading leading-[1.5] text-moss-80">
              El sistema desde el que manejás tu negocio: ventas, stock, clientes y pagos, en un solo lugar.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <MagneticButton
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-pulse px-6 py-3.5 text-body-sm font-medium text-void-black transition-colors duration-300 ease-out hover:bg-mint-frost"
              >
                Empezar con PAMPA <ArrowUpRight className="size-4" />
              </MagneticButton>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-circuit-border px-6 py-3.5 text-body-sm font-medium text-phosphor-white transition-colors duration-300 ease-out hover:border-sage-60"
              >
                Iniciar sesión
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <ProductConsole />
        </Reveal>
      </div>
    </section>
  );
}
