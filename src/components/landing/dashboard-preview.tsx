import { ChartNoAxesCombined, LayoutDashboard, ShoppingCart, Users, Warehouse } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, active: true },
  { icon: ShoppingCart, active: false },
  { icon: Warehouse, active: false },
  { icon: Users, active: false },
  { icon: ChartNoAxesCombined, active: false },
];

const stats = [
  { label: "Ventas hoy", value: "$482.300" },
  { label: "Stock", value: "1.204" },
  { label: "Clientes", value: "86" },
];

const recentSales = [
  { label: "Venta #0148", detail: "Sucursal Centro", amount: "$18.400" },
  { label: "Venta #0147", detail: "Sucursal Norte", amount: "$6.900" },
  { label: "Venta #0146", detail: "Sucursal Centro", amount: "$32.100" },
];

export function DashboardPreview() {
  return (
    <div className="flex h-full w-full bg-carbon-veil text-phosphor-white">
      <div className="flex w-10 shrink-0 flex-col items-center gap-3 border-r border-circuit-border/40 bg-ground-iron py-3">
        <span className="size-1.5 rounded-full bg-lime-pulse" aria-hidden="true" />
        <div className="mt-2 flex flex-col gap-2">
          {navItems.map(({ icon: Icon, active }, index) => (
            <span key={index} className={`grid size-6 place-items-center rounded-[3px] ${active ? "bg-lime-pulse/15 text-lime-pulse" : "text-sage-40"}`}>
              <Icon className="size-3" strokeWidth={1.75} />
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-7 shrink-0 items-center justify-between border-b border-circuit-border/40 px-3">
          <span className="text-[9px] font-medium text-phosphor-white">Dashboard</span>
          <span className="size-3 rounded-full border border-circuit-border bg-lime-pulse/10" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[3px] border border-circuit-border/40 bg-ground-iron p-1.5">
              <p className="text-[5px] font-medium uppercase tracking-[0.08em] text-sage-40">{stat.label}</p>
              <p className="mt-1 text-[9px] font-medium text-phosphor-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mx-2.5 flex-1 rounded-[3px] border border-circuit-border/40 bg-ground-iron p-1.5">
          <p className="text-[5px] font-medium uppercase tracking-[0.08em] text-sage-40">Ventas recientes</p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {recentSales.map((sale) => (
              <div key={sale.label} className="flex items-center justify-between border-b border-circuit-border/20 pb-1.5 last:border-b-0 last:pb-0">
                <div>
                  <p className="text-[7px] font-medium text-phosphor-white">{sale.label}</p>
                  <p className="text-[6px] text-sage-40">{sale.detail}</p>
                </div>
                <span className="text-[7px] text-moss-80">{sale.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
