"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Barcode, Building2, PackageCheck } from "lucide-react";

const bars = [
  { height: 26, tone: "bg-pine-15" },
  { height: 42, tone: "bg-deep-fern" },
  { height: 34, tone: "bg-fern-link" },
  { height: 58, tone: "bg-moss-70" },
  { height: 76, tone: "bg-lime-pulse" },
];

export function ProductConsole() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <motion.div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-full bg-lime-pulse/10 blur-[90px]"
        animate={reduceMotion ? undefined : { opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="border border-circuit-border bg-ground-iron p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between border-b border-circuit-border/60 pb-3 font-mono text-caption uppercase tracking-[0.14em] text-sage-40">
          <span>PAMPA / Punto de venta</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-lime-pulse" />
            Sistema operativo
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.15fr_.85fr]">
          <div className="border border-circuit-border/60 bg-carbon-veil p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption text-sage-40">Sucursal activa</p>
                <p className="mt-1 text-body-sm font-medium text-phosphor-white">Río Norte — Centro</p>
              </div>
              <Building2 className="size-4 text-lime-pulse" />
            </div>
            <div className="mt-6 grid grid-cols-5 items-end gap-2" aria-hidden="true">
              {bars.map((bar, index) => (
                <motion.span
                  key={bar.height}
                  className={`w-full origin-bottom rounded-[2px] ${bar.tone}`}
                  style={{ height: bar.height }}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                />
              ))}
            </div>
            <p className="mt-3 text-caption uppercase tracking-[0.1em] text-sage-40">Ventas del día · vista conceptual</p>
          </div>

          <div className="grid gap-3">
            <div className="border border-circuit-border/60 bg-carbon-veil p-3">
              <div className="flex items-center justify-between">
                <PackageCheck className="size-4 text-moss-80" />
                <span className="text-caption text-sage-40">STOCK</span>
              </div>
              <p className="mt-3 text-heading-sm font-medium text-phosphor-white">98,4%</p>
              <p className="text-body-sm text-sage-60">disponibilidad</p>
            </div>

            <div className="relative overflow-hidden border border-circuit-border/60 bg-carbon-veil p-3">
              <div className="flex items-center justify-between">
                <Barcode className="size-4 text-sage-60" />
                <span className="text-caption text-sage-40">ESCANEO</span>
              </div>
              <p className="mt-3 text-body-sm text-phosphor-white">Producto encontrado</p>
              <p className="text-caption text-sage-40">agregado a la venta</p>
              {!reduceMotion && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-x-0 h-px bg-lime-pulse/70"
                  initial={{ top: "10%", opacity: 0 }}
                  animate={{ top: ["10%", "90%", "10%"], opacity: [0, 1, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-circuit-border/60 bg-carbon-veil px-4 py-3">
          <span className="text-body-sm text-sage-60">Multiempresa · Multisucursal</span>
          <span className="font-mono text-caption text-lime-pulse">01 / 01</span>
        </div>
      </div>
      <span className="absolute -bottom-3 right-4 border border-circuit-border bg-ground-iron px-3 py-1.5 font-mono text-caption uppercase tracking-[0.1em] text-sage-40">
        Vista conceptual de PAMPA
      </span>
    </div>
  );
}
