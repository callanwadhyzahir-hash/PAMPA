"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import { onboardingService, type SetupStatus } from "@/services/onboarding.service";

interface ChecklistItem {
  key: keyof SetupStatus;
  label: string;
  href: string;
  permission?: string;
}

const items: ChecklistItem[] = [
  { key: "company", label: "Crear empresa", href: "/dashboard/companies" },
  { key: "branches", label: "Crear primera sucursal", href: "/dashboard/branches" },
  { key: "warehouses", label: "Crear depósito", href: "/dashboard/warehouses" },
  { key: "categories", label: "Crear categorías", href: "/dashboard/product-categories" },
  { key: "products", label: "Crear primer producto", href: "/dashboard/products" },
  { key: "stock", label: "Cargar stock", href: "/dashboard/stock" },
  { key: "clients", label: "Registrar primer cliente", href: "/dashboard/clients" },
  { key: "sales", label: "Registrar primera venta", href: "/dashboard/sales/new" },
  {
    key: "mercadolibre",
    label: "Conectar Mercado Libre",
    href: "/dashboard/integrations/mercadolibre",
    permission: "integrations.mercadolibre.read",
  },
];

export function SetupChecklist() {
  const { user } = useAuthSession();
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    onboardingService
      .setupStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  const visibleItems = items.filter((item) => !item.permission || user?.permissions.includes(item.permission));
  const done = visibleItems.filter((item) => status[item.key]).length;

  return (
    <Card data-tour="setup-checklist">
      <CardHeader>
        <CardTitle>Preparar PAMPA</CardTitle>
        <p className="text-body-sm text-muted-foreground">
          {done} de {visibleItems.length} completados
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {visibleItems.map((item) => {
          const complete = status[item.key];
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center gap-3 rounded-sm px-2 py-2 text-body-sm hover:bg-secondary"
            >
              {complete ? (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={complete ? "text-muted-foreground line-through" : "text-foreground"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
