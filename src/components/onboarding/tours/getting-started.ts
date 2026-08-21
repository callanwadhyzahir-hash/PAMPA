import { registerTour, type Tour } from "../onboarding-registry";

export const gettingStartedTour: Tour = {
  id: "getting-started",
  title: "Primeros pasos",
  steps: [
    {
      id: "welcome",
      title: "Bienvenido a PAMPA",
      description:
        "PAMPA reúne en un solo lugar tu empresa, sucursales, productos, stock, clientes, ventas, pagos, reportes e integraciones. Te vamos a mostrar cómo moverte por acá.",
    },
    {
      id: "sidebar",
      target: "sidebar-root",
      route: "/dashboard",
      title: "Tu menú principal",
      description: "Desde acá accedés a las distintas áreas de tu negocio.",
      placement: "right",
    },
    {
      id: "dashboard",
      target: "dashboard-summary",
      route: "/dashboard",
      title: "Tu centro de comando",
      description: "Este es el resumen de lo que está pasando en tu negocio: ventas, cobros y stock.",
      placement: "bottom",
    },
    {
      id: "topbar-user",
      target: "topbar-user",
      route: "/dashboard",
      title: "Tu cuenta",
      description: "Acá vas a ver siempre con qué usuario y empresa estás trabajando.",
      placement: "bottom",
    },
    {
      id: "help-center",
      target: "help-center-trigger",
      route: "/dashboard",
      title: "Ayuda cuando la necesites",
      description: "Si en algún momento querés repasar una guía, la encontrás siempre acá.",
      placement: "bottom",
    },
    {
      id: "setup-checklist",
      target: "setup-checklist",
      route: "/dashboard",
      title: "Preparar PAMPA",
      description:
        "Esta lista se completa sola a medida que usás PAMPA: cuando creás tu primera sucursal, tu primer producto o registrás tu primera venta, el check aparece solo.",
      placement: "top",
    },
  ],
};

registerTour(gettingStartedTour);
