import Link from "next/link";
import { CheckCircle2, PackageCheck, ReceiptText, ShieldCheck } from "lucide-react";

export function AuthShowcase() {
  return (
    <section className="relative hidden overflow-hidden bg-background p-12 text-foreground lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(127,238,100,.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(127,238,100,.05)_1px,transparent_1px)] [background-size:48px_48px]" />
      <Link href="/" className="relative flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        <span className="font-display text-lg font-medium tracking-[-0.03em]">PAMPA</span>
      </Link>
      <div className="relative max-w-xl">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-primary">Tu operación, en un solo lugar</p>
        <h1 className="mt-4 text-heading-lg font-medium leading-[1.02] tracking-[-0.03em]">Menos tareas sueltas.<br />Más control del negocio.</h1>
        <p className="mt-5 max-w-lg text-body leading-7 text-muted-foreground">Ventas, clientes, productos, stock y cobros conectados con información real de tu empresa.</p>
        <div className="mt-10 rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3"><ReceiptText className="size-5 text-primary" /><div><p className="text-body-sm font-medium">Venta confirmada</p><p className="text-caption text-muted-foreground">Stock y cobro actualizados</p></div></div>
            <CheckCircle2 className="size-5 text-success" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-caption text-muted-foreground"><span className="flex items-center gap-2"><PackageCheck className="size-4" /> Inventario conectado</span><span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Datos por empresa</span></div>
        </div>
      </div>
      <p className="relative text-caption text-muted-foreground">Diseñado para PyMEs argentinas</p>
    </section>
  );
}
