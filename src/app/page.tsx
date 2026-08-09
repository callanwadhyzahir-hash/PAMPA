import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  CircleCheck,
  Layers3,
  PackageCheck,
  Sparkles,
} from "lucide-react";

import { LandingHeader } from "@/components/landing/landing-header";
import { WaitlistForm } from "@/components/landing/waitlist-form";

const modules = [
  ["Empresas y sucursales", "Disponible en Beta"],
  ["Usuarios y permisos", "Disponible en Beta"],
  ["Clientes", "Disponible en Beta"],
  ["Productos y categorías", "Disponible en Beta"],
  ["Stock e inventario", "Disponible en Beta"],
  ["Ventas", "Disponible en Beta"],
  ["Pagos y cobranzas", "Disponible en Beta"],
  ["Comprobantes internos", "Disponible en Beta"],
  ["Dashboard", "Disponible en Beta"],
  ["Reportes", "Disponible en Beta"],
  ["Facturación fiscal ARCA", "Próximamente"],
  ["Integraciones externas", "Próximamente"],
  ["ATLAS AI", "Próximamente"],
] as const;

const roadmap = [
  { state: "Disponible en Beta", items: ["Operación comercial", "Inventario", "CRM", "Ventas y pagos", "Reportes"] },
  { state: "Próximamente", items: ["Facturación fiscal ARCA", "Integraciones", "Mejoras de automatización e IA"] },
];

const faqs = [
  ["¿PAMPA ya está disponible?", "Sí. PAMPA está operativa y en Beta, con acceso limitado para los primeros comercios."],
  ["¿Quiénes pueden participar?", "Estamos incorporando comercios de a poco durante la Beta para acompañar de cerca cada implementación."],
  ["¿Será un sistema para Argentina?", "Sí. PAMPA está siendo diseñada con foco inicial en empresas argentinas."],
  ["¿La beta tiene todas las funciones?", "La Beta ya cubre el flujo comercial completo: ventas, stock, clientes, pagos, comprobantes y reportes. Seguimos sumando funciones como facturación fiscal e integraciones."],
  ["¿Cómo solicito acceso?", "Dejá tus datos en el formulario y te contactamos para coordinar el acceso a tu comercio."],
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#b8e26b]">{children}</p>;
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-2xl border border-white/10 bg-[#11140f] p-3 shadow-2xl shadow-black/30 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#a7aa9d]"><span>PAMPA / Operación</span><span className="flex items-center gap-2"><i className="size-1.5 rounded-full bg-[#b8e26b]" />Sistema operativo</span></div>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_.8fr]">
        <div className="border border-white/10 bg-[#0b0d0a] p-4">
          <div className="flex items-start justify-between"><div><p className="text-xs text-[#a7aa9d]">Empresa activa</p><p className="mt-1 text-sm font-medium text-[#f2f1e8]">Río Norte SA</p></div><Building2 className="size-4 text-[#b8e26b]" /></div>
          <div className="mt-6 grid grid-cols-5 items-end gap-2" aria-label="Métrica conceptual de operación"><span className="w-full bg-[#33392e]" style={{ height: "28px" }} /><span className="w-full bg-[#555f45]" style={{ height: "46px" }} /><span className="w-full bg-[#7d9360]" style={{ height: "38px" }} /><span className="w-full bg-[#9dc05a]" style={{ height: "66px" }} /><span className="w-full bg-[#b8e26b]" style={{ height: "84px" }} /></div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#a7aa9d]">Operación mensual · vista conceptual</p>
        </div>
        <div className="grid gap-3">
          <div className="border border-white/10 bg-[#0b0d0a] p-3"><div className="flex items-center justify-between"><PackageCheck className="size-4 text-[#d6b58a]" /><span className="text-[10px] text-[#a7aa9d]">STOCK</span></div><p className="mt-3 text-2xl font-medium tracking-tight text-[#f2f1e8]">98,4%</p><p className="text-xs text-[#a7aa9d]">disponibilidad</p></div>
          <div className="border border-white/10 bg-[#0b0d0a] p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[#a7aa9d]">Actividad reciente</p><div className="mt-3 flex items-center gap-2 text-xs text-[#f2f1e8]"><span className="size-1.5 rounded-full bg-[#b8e26b]" />Operación registrada</div><p className="mt-1 pl-3.5 text-[11px] text-[#a7aa9d]">Sucursal Centro</p></div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#0b0d0a] px-4 py-3"><span className="text-xs text-[#a7aa9d]">Multiempresa · Multisucursal</span><span className="font-mono text-xs text-[#b8e26b]">01 / 01</span></div>
      <span className="absolute -bottom-3 right-4 border border-white/10 bg-[#0b0d0a] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#a7aa9d]">Vista conceptual de PAMPA</span>
    </div>
  );
}

export default function Home() {
  return (
    <main id="inicio" className="pampa-landing min-h-screen w-full overflow-hidden">
      <LandingHeader />
      <section className="pampa-grid relative border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-28">
          <div>
            <SectionLabel>PAMPA Beta · Acceso limitado</SectionLabel>
            <h1 className="mt-6 max-w-2xl text-5xl font-medium leading-[.95] tracking-[-0.075em] text-[#f2f1e8] sm:text-6xl lg:text-7xl">La gestión de tu empresa,<br />en un solo lugar.<span className="block text-[#b8e26b]">Construida para Argentina.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#a7aa9d] sm:text-lg">PAMPA es un ERP para comercios argentinos, ya operativo en Beta. Centralizá empresas, sucursales, clientes, productos, stock, ventas, pagos y reportes en un solo lugar, con una experiencia clara y moderna.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#lista" className="inline-flex items-center justify-center gap-2 bg-[#b8e26b] px-5 py-3 text-sm font-semibold text-[#0b0d0a] transition-colors hover:bg-[#d2f58a]">Solicitar acceso a la Beta <ArrowDownRight className="size-4" /></a><a href="/login" className="inline-flex items-center justify-center gap-2 border border-white/15 px-5 py-3 text-sm font-semibold text-[#f2f1e8] transition-colors hover:border-white/35">Iniciar sesión <ArrowDownRight className="size-4" /></a></div>
            <p className="mt-6 text-sm text-[#a7aa9d]">PAMPA ya está en Beta, con acceso limitado para los primeros comercios.</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="producto" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"><SectionLabel>Producto</SectionLabel><div className="mt-6 grid gap-12 lg:grid-cols-[.85fr_1.15fr]"><h2 className="max-w-md text-4xl font-medium leading-[.98] tracking-[-0.065em] sm:text-5xl">Menos sistemas.<br /><span className="text-[#b8e26b]">Más control.</span></h2><div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">{[[Layers3,"Una operación conectada","Empresas, sucursales, clientes, productos y movimientos dentro de una única estructura."],[ChartNoAxesCombined,"Datos que sirven","Información organizada para comprender qué está pasando y tomar mejores decisiones."],[Sparkles,"Inteligencia aplicada","Automatización e inteligencia artificial integradas progresivamente sobre datos confiables."]].map(([Icon,title,text]) => { const FeatureIcon = Icon as typeof Layers3; return <article key={title as string} className="bg-[#0b0d0a] p-6"><FeatureIcon className="size-5 text-[#b8e26b]" /><h3 className="mt-8 text-lg font-medium">{title as string}</h3><p className="mt-3 text-sm leading-6 text-[#a7aa9d]">{text as string}</p></article>; })}</div></div></section>

      <section id="modulos" className="border-y border-white/10 bg-[#11140f]"><div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><SectionLabel>Mapa de módulos</SectionLabel><h2 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Una plataforma<br />que crece por etapas.</h2></div><p className="max-w-xs text-sm leading-6 text-[#a7aa9d]">El alcance se habilita de forma responsable: primero la base, después los flujos críticos.</p></div><div className="mt-12 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-5">{modules.map(([name,state]) => <article key={name} className="min-h-36 bg-[#11140f] p-5"><span className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[.12em] ${state === "Disponible en Beta" ? "text-[#b8e26b]" : "text-[#a7aa9d]"}`}><span className="size-1.5 rounded-full bg-current" />{state}</span><h3 className="mt-8 text-sm font-medium leading-5 text-[#f2f1e8]">{name}</h3></article>)}</div></div></section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-32"><div><SectionLabel>Origen</SectionLabel><h2 className="mt-5 text-4xl font-medium leading-[.98] tracking-[-0.065em] sm:text-5xl">Pensado desde Argentina,<br /><span className="text-[#d6b58a]">para empresas argentinas.</span></h2></div><div className="border-l border-[#b8e26b] pl-6 text-base leading-8 text-[#a7aa9d] sm:pl-8">PAMPA nace con una arquitectura preparada para las necesidades locales: organización fiscal, múltiples sucursales, monedas, condiciones tributarias y futuras integraciones con el ecosistema comercial argentino.<ul className="mt-7 grid gap-3 text-sm text-[#f2f1e8]"><li>Arquitectura preparada para facturación electrónica</li><li>Catálogos fiscales y operación multiempresa</li><li>Futura conexión con canales de venta</li></ul></div></section>

      <section id="roadmap" className="border-y border-white/10 bg-[#11140f]"><div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"><SectionLabel>Roadmap público</SectionLabel><h2 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Construcción visible,<br />paso a paso.</h2><div className="mt-14 grid gap-10 md:grid-cols-2">{roadmap.map(({state,items}, index) => <div key={state} className="border-t border-white/15 pt-5"><p className={`text-xs font-medium uppercase tracking-[.15em] ${index === 0 ? "text-[#b8e26b]" : "text-[#a7aa9d]"}`}>{state}</p><ul className="mt-6 grid gap-4">{items.map((item) => <li key={item} className="flex gap-3 text-sm text-[#f2f1e8]"><CircleCheck className={`mt-0.5 size-4 shrink-0 ${index === 0 ? "text-[#b8e26b]" : "text-[#a7aa9d]"}`} />{item}</li>)}</ul></div>)}</div><p className="mt-14 border-l border-white/15 pl-4 text-sm text-[#a7aa9d]">El roadmap puede evolucionar según los resultados técnicos y las pruebas con usuarios.</p></div></section>

      <section id="lista" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"><div className="grid gap-12 border border-white/10 bg-[#11140f] p-6 sm:p-10 lg:grid-cols-[.8fr_1.2fr] lg:p-14"><div><SectionLabel>Acceso a la Beta</SectionLabel><h2 className="mt-5 text-4xl font-medium leading-[.98] tracking-[-0.065em] sm:text-5xl">Solicitá acceso a PAMPA Beta.</h2><p className="mt-6 max-w-sm text-sm leading-7 text-[#a7aa9d]">PAMPA ya está operativa. Dejá tus datos y te contactamos para coordinar el acceso de tu comercio durante esta etapa de acceso limitado.</p></div><WaitlistForm /></div></section>

      <section id="preguntas" className="border-t border-white/10"><div className="mx-auto max-w-4xl px-5 py-24 sm:px-8 lg:py-32"><SectionLabel>Preguntas frecuentes</SectionLabel><h2 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Claridad desde el inicio.</h2><div className="mt-12 divide-y divide-white/10 border-y border-white/10">{faqs.map(([question,answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-[#f2f1e8]">{question}<ArrowUpRight className="size-4 shrink-0 text-[#b8e26b] transition-transform group-open:rotate-90" /></summary><p className="max-w-2xl pt-4 text-sm leading-7 text-[#a7aa9d]">{answer}</p></details>)}</div></div></section>

      <footer className="border-t border-white/10 bg-[#11140f]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm sm:px-8 md:grid-cols-3"><div><p className="text-lg font-semibold tracking-[-.08em] text-[#f2f1e8]">PAMPA<span className="text-[#b8e26b]">.</span></p><p className="mt-2 text-[#a7aa9d]">ERP inteligente para empresas argentinas</p></div><div className="text-[#a7aa9d]"><p>pampa-erp.com</p><p className="mt-2">Estado del producto: Beta</p><a href="/privacidad" className="mt-2 inline-block underline underline-offset-4 hover:text-[#f2f1e8]">Privacidad</a></div><div className="text-[#a7aa9d] md:text-right"><p>Hecho en Argentina</p><p className="mt-2">ATLAS AI — inteligencia aplicada, próximamente.</p><p className="mt-5 font-mono text-xs">© {new Date().getFullYear()} PAMPA</p></div></div></footer>
    </main>
  );
}
