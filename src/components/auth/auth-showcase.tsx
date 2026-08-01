import Link from "next/link";
import { CheckCircle2, PackageCheck, ReceiptText, ShieldCheck } from "lucide-react";

export function AuthShowcase() {
  return (
    <section className="relative hidden overflow-hidden bg-[#111827] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <Link href="/" className="relative text-2xl font-bold tracking-[-0.06em]">PAMPA<span className="text-blue-400">.</span></Link>
      <div className="relative max-w-xl">
        <p className="text-sm font-semibold text-blue-300">Tu operación, en un solo lugar</p>
        <h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-[-0.055em]">Menos tareas sueltas.<br />Más control del negocio.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Ventas, clientes, productos, stock y cobros conectados con información real de tu empresa.</p>
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3"><ReceiptText className="size-5 text-blue-300" /><div><p className="text-sm font-medium">Venta confirmada</p><p className="text-xs text-slate-400">Stock y cobro actualizados</p></div></div>
            <CheckCircle2 className="size-5 text-emerald-400" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300"><span className="flex items-center gap-2"><PackageCheck className="size-4" /> Inventario conectado</span><span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Datos por empresa</span></div>
        </div>
      </div>
      <p className="relative text-xs text-slate-400">Diseñado para PyMEs argentinas</p>
    </section>
  );
}
