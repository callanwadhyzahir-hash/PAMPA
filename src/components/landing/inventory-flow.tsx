"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightLeft, Warehouse } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { SignalPulseBackground } from "@/components/landing/signal-pulse-background";

const stats = [
  { label: "Ajustes", value: "Cantidades corregidas al instante" },
  { label: "Movimientos", value: "Historial completo por depósito" },
  { label: "Stock mínimo", value: "Alertas antes de quedarte sin stock" },
];

export function InventoryFlow() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="operacion" className="relative overflow-hidden bg-void-black">
      <SignalPulseBackground />
      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <Reveal>
          <div className="border border-circuit-border bg-ground-iron p-6 sm:p-8">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="flex w-full max-w-[180px] items-center gap-3 border border-circuit-border/60 bg-carbon-veil px-4 py-4 sm:w-auto">
                <Warehouse className="size-5 text-sage-60" />
                <div>
                  <p className="text-body-sm font-medium text-phosphor-white">Depósito Centro</p>
                  <p className="text-caption text-sage-40">−12 unidades</p>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <ArrowRightLeft className="size-5 text-lime-pulse" />
                {!reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute size-8 rounded-full border border-lime-pulse/40"
                    animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </div>

              <div className="flex w-full max-w-[180px] items-center gap-3 border border-circuit-border/60 bg-carbon-veil px-4 py-4 sm:w-auto">
                <Warehouse className="size-5 text-sage-60" />
                <div>
                  <p className="text-body-sm font-medium text-phosphor-white">Depósito Norte</p>
                  <p className="text-caption text-moss-80">+12 unidades</p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-caption uppercase tracking-[0.1em] text-sage-40">Transferencia entre depósitos · vista conceptual</p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="font-mono text-caption font-medium uppercase tracking-[0.16em] text-moss-70">Inventario</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 text-heading leading-[1.1] tracking-[-0.02em] text-phosphor-white sm:text-heading-lg">
              Tu stock, siempre real.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-md text-body leading-7 text-sage-60">
              Movés stock entre depósitos, ajustás cantidades y ves alertas de stock mínimo antes de que sea un problema.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <ul className="mt-8 grid gap-4">
              {stats.map((stat) => (
                <li key={stat.label} className="border-l border-circuit-border pl-4">
                  <p className="text-body-sm font-medium text-phosphor-white">{stat.label}</p>
                  <p className="text-body-sm text-sage-60">{stat.value}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
