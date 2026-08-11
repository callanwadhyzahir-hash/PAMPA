"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Barcode, Printer, ReceiptText, Smartphone } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { SignalPulseBackground } from "@/components/landing/signal-pulse-background";

const inputs = [
  { icon: Barcode, label: "Lector USB" },
  { icon: Smartphone, label: "Cámara del celular" },
  { icon: Printer, label: "Etiquetas PAMPA" },
];

export function BarcodeFlow() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="funciones" className="relative overflow-hidden border-b border-phosphor-blue-black bg-ground-iron">
      <SignalPulseBackground />
      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <Reveal>
            <p className="font-mono text-caption font-medium uppercase tracking-[0.16em] text-moss-70">Códigos de barras</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 text-heading leading-[1.1] tracking-[-0.02em] text-phosphor-white sm:text-heading-lg">
              Escaneá. Encontrá. Vendé.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-md text-body leading-7 text-sage-60">
              Productos que ya traen código de barras, lector USB o la cámara del celular: PAMPA encuentra el producto al instante y lo suma a la venta.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <ul className="mt-8 flex flex-wrap gap-3">
              {inputs.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 border border-circuit-border/60 bg-carbon-veil px-3 py-2 text-body-sm text-sage-60">
                  <Icon className="size-4 text-moss-80" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="border border-circuit-border bg-carbon-veil p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="relative flex w-full max-w-[160px] flex-col items-center gap-2 border border-circuit-border/60 bg-ground-iron px-4 py-5 sm:w-auto">
                <Barcode className="size-8 text-phosphor-white" />
                <span className="font-mono text-caption text-sage-40">7791234567890</span>
                {!reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-3 h-px bg-lime-pulse"
                    initial={{ top: "18%", opacity: 0 }}
                    animate={{ top: ["18%", "82%", "18%"], opacity: [0, 1, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
                  />
                )}
              </div>

              <ArrowRight className="size-5 shrink-0 rotate-90 text-sage-40 sm:rotate-0" />

              <div className="flex w-full max-w-[160px] flex-col gap-1 border border-circuit-border/60 bg-ground-iron px-4 py-5 sm:w-auto">
                <span className="text-caption uppercase tracking-[0.1em] text-sage-40">Producto</span>
                <span className="text-body-sm font-medium text-phosphor-white">Yerba Mate 1kg</span>
                <span className="text-caption text-moss-80">Encontrado</span>
              </div>

              <ArrowRight className="size-5 shrink-0 rotate-90 text-sage-40 sm:rotate-0" />

              <div className="flex w-full max-w-[160px] flex-col gap-1 border border-lime-pulse/40 bg-ground-iron px-4 py-5 sm:w-auto">
                <ReceiptText className="size-4 text-lime-pulse" />
                <span className="mt-1 text-body-sm font-medium text-phosphor-white">Venta #0148</span>
                <span className="text-caption text-sage-40">1 ítem agregado</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
