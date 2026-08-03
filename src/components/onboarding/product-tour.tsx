"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  ["Tu centro de comando", "Desde acá ves ventas, cobros, clientes, stock y actividad reciente."],
  ["Configurá tu sucursal", "Creá la ubicación principal desde la que operará tu empresa."],
  ["Prepará el inventario", "Creá un depósito para esa sucursal antes de registrar existencias."],
  ["Cargá tu catálogo", "Organizá categorías y productos con precios, impuestos y control de stock."],
  ["Ingresá el stock inicial", "Ajustá las cantidades reales de cada producto en su depósito."],
  ["Registrá tus clientes", "Creá clientes para conservar su historial comercial y sus saldos."],
  ["Hacé tu primera venta", "Con la operación preparada, confirmá la venta y registrá su pago."],
] as const;

export function ProductTour({ userId }: { userId: string }) {
  const storageKey = `pampa-tour-v1:${userId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpen(localStorage.getItem(storageKey) !== "done");
    }, 0);
    const restart = () => { setStep(0); setOpen(true); };
    window.addEventListener("pampa:restart-tour", restart);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pampa:restart-tour", restart);
    };
  }, [storageKey]);
  const finish = () => { localStorage.setItem(storageKey, "done"); setOpen(false); };
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#151a2b] p-7 text-white shadow-2xl">
      <div className="flex justify-between"><span className="grid size-11 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Compass className="size-5" /></span><button onClick={finish} className="p-2 text-slate-400" aria-label="Cerrar tutorial"><X className="size-4" /></button></div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-blue-300">{step + 1} de {steps.length}</p>
      <h2 className="mt-2 text-2xl font-semibold">{steps[step][0]}</h2><p className="mt-3 leading-6 text-slate-300">{steps[step][1]}</p>
      <div className="mt-7 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-500" style={{width:`${((step + 1) / steps.length) * 100}%`}} /></div>
      <div className="mt-6 flex justify-between gap-3"><Button variant="ghost" className="text-slate-300" onClick={finish}>Omitir</Button><div className="flex gap-2">{step ? <Button variant="outline" onClick={() => setStep(step - 1)}>Anterior</Button> : null}{step < steps.length - 1 ? <Button onClick={() => setStep(step + 1)}>Siguiente</Button> : <Button render={<Link href="/dashboard/branches" />} onClick={finish}>Configurar sucursal</Button>}</div></div>
    </div>
  </div>;
}
