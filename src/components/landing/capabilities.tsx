import { ChartNoAxesCombined, ScanBarcode, ShieldCheck, Users, Warehouse } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { SignalPulseBackground } from "@/components/landing/signal-pulse-background";

const capabilities = [
  {
    icon: ScanBarcode,
    eyebrow: "Vendé",
    title: "Vendé más rápido",
    text: "Buscá el producto, escaneá el código de barras y cobrá. Pagos totales, parciales o combinados.",
  },
  {
    icon: Warehouse,
    eyebrow: "Controlá",
    title: "Controlá el stock real",
    text: "Depósitos, transferencias, ajustes y alertas de stock mínimo en cada sucursal.",
  },
  {
    icon: Users,
    eyebrow: "Conocé",
    title: "Conocé a tus clientes",
    text: "Historial de compras y saldo de cada cliente, siempre a mano.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Gestioná",
    title: "Gestioná equipos y sucursales",
    text: "Empresas, sucursales, usuarios y permisos bajo un mismo panel de control.",
  },
  {
    icon: ChartNoAxesCombined,
    eyebrow: "Medí",
    title: "Medí tu operación",
    text: "Dashboard y reportes para ver qué está pasando en tu negocio.",
  },
];

export function Capabilities() {
  return (
    <section id="producto" className="relative overflow-hidden border-b border-phosphor-blue-black bg-void-black">
      <SignalPulseBackground />
      <div className="relative z-10 mx-auto max-w-[1280px] px-5 py-20 sm:px-8">
        <Reveal>
          <p className="font-mono text-caption font-medium uppercase tracking-[0.16em] text-moss-70">Producto</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="mt-4 max-w-lg text-heading leading-[1.1] tracking-[-0.02em] text-phosphor-white sm:text-heading-lg">
            Un sistema. Toda tu operación.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-px border border-circuit-border/60 bg-circuit-border/60 sm:grid-cols-2 lg:grid-cols-5">
          {capabilities.map(({ icon: Icon, eyebrow, title, text }, index) => (
            <Reveal key={title} delay={(index % 5) * 0.06} className="h-full">
              <article className="h-full bg-ground-iron p-6 transition-colors duration-300 ease-out hover:bg-carbon-veil">
                <Icon className="size-5 text-lime-pulse" />
                <p className="mt-6 font-mono text-caption font-medium uppercase tracking-[0.14em] text-moss-70">{eyebrow}</p>
                <h3 className="mt-2 text-body font-medium text-phosphor-white">{title}</h3>
                <p className="mt-3 text-body-sm leading-6 text-sage-60">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
