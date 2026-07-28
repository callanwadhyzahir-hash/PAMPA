"use client";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Globe2,
  Package,
  Users,
} from "lucide-react";

import { SectionTitle } from "@/components/dashboard/section-title";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { useCountries } from "@/hooks/use-countries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const activity = [
  { title: "Venta registrada", description: "Factura A-0001-00001248", time: "Hace 12 min", variant: "success" as const },
  { title: "Stock actualizado", description: "Ajuste en Deposito central", time: "Hace 38 min", variant: "info" as const },
  { title: "Nuevo cliente", description: "Comercial del Sur S.R.L.", time: "Hace 2 h", variant: "default" as const },
  { title: "Pago recibido", description: "Transferencia acreditada", time: "Hace 4 h", variant: "success" as const },
];

export default function DashboardPage() {
  const { countries, error, loading } = useCountries();
  const countryCount = loading ? "..." : error ? "--" : countries.length.toString();

  return (
    <PageContainer className="space-y-8">
   <SectionTitle
  title="Dashboard"
  description="Resumen general del estado de la empresa."
/>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores principales">
        <StatCard label="Ventas del mes" value="$ 2.480.000" detail="12,4% vs. mes anterior" icon={<CircleDollarSign className="size-5" />} />
        <StatCard label="Clientes" value="248" detail="18 nuevos este mes" icon={<Users className="size-5" />} />
        <StatCard label="Productos" value="1.284" detail="86 con movimiento reciente" icon={<Package className="size-5" />} />
        <StatCard label="Stock critico" value="12" detail="Requiere reposicion" icon={<AlertTriangle className="size-5" />} />
        <StatCard
          label="Paises"
          value={countryCount}
          detail={error ? "No se pudieron cargar los paises" : "Catalogo disponible"}
          icon={<Globe2 className="size-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-h-[360px] border py-0 shadow-none">
          <CardHeader className="border-b py-5">
            <CardTitle>Ventas mensuales</CardTitle>
            <CardDescription>Visualizacion disponible proximamente.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[278px] items-center justify-center p-6">
            <div className="flex w-full max-w-md flex-col items-center rounded-lg border border-dashed bg-muted/40 px-6 py-10 text-center">
              <BarChart3 className="size-8 text-muted-foreground" />
              <p className="mt-4 font-medium">Grafico de ventas</p>
              <p className="mt-1 text-sm text-muted-foreground">Este espacio mostrara la evolucion de las ventas.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border py-0 shadow-none">
          <CardHeader className="border-b py-5">
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Ultimos movimientos de la empresa.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y px-5">
            {activity.map((item) => (
              <div key={item.title} className="flex items-start gap-3 py-4">
                <div className="mt-1 rounded-md bg-muted p-2 text-muted-foreground">
                  <Boxes className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                </div>
                <Badge variant={item.variant}>Nuevo</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
