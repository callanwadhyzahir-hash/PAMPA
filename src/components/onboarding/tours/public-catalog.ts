import { registerTour, type Tour } from "../onboarding-registry";

export const publicCatalogTour: Tour = {
  id: "public-catalog",
  title: "Catálogo público y pedidos",
  permission: "catalog.read",
  autoStartRoute: "/dashboard/catalog",
  steps: [
    {
      id: "welcome",
      route: "/dashboard/catalog",
      title: "Vendé por un enlace, sin salir de PAMPA",
      description:
        "Activá un catálogo público con tus productos. Tus clientes lo abren desde un enlace, arman su pedido y vos lo recibís acá para revisarlo antes de que se convierta en una venta.",
    },
    {
      id: "link",
      target: "catalog-slug-field",
      route: "/dashboard/catalog",
      title: "Tu enlace público",
      description:
        "El nombre de tu negocio y este enlace arman la dirección que vas a compartir, por ejemplo /c/tu-enlace. Vas a poder copiarlo o compartirlo en cuanto lo guardes.",
      placement: "bottom",
    },
    {
      id: "availability",
      target: "catalog-warehouse-field",
      route: "/dashboard/catalog",
      title: "De dónde sale la disponibilidad",
      description:
        "La sucursal y el depósito que elijas acá definen qué stock ve tu cliente. El catálogo nunca muestra la cantidad exacta, solo si hay disponible.",
      placement: "top",
    },
    {
      id: "visibility",
      target: "catalog-visibility",
      route: "/dashboard/catalog",
      title: "Qué ve el cliente",
      description:
        "\"Catálogo activo\" lo prende o apaga por completo. También podés ocultar los precios o el estado de stock si preferís coordinarlos por otro medio.",
      placement: "top",
      permission: "catalog.manage",
    },
    {
      id: "save",
      target: "catalog-save-button",
      route: "/dashboard/catalog",
      title: "Guardá para publicar",
      description: "Guardar activa (o actualiza) tu enlace público al instante. Podés volver cuando quieras a cambiarlo.",
      placement: "top",
      permission: "catalog.manage",
    },
    {
      id: "products",
      target: "catalog-products-list",
      route: "/dashboard/catalog",
      title: "Elegí qué productos se ven",
      description:
        "Solo se publican los productos que marques como visibles acá. Un producto dado de baja no se puede mostrar, aunque lo hayas marcado antes.",
      placement: "top",
      permission: "catalog.manage",
    },
    {
      id: "orders",
      target: "catalog-orders-filters",
      route: "/dashboard/catalog-orders",
      title: "Dónde llegan los pedidos",
      description:
        "Cuando un cliente envía su pedido desde el catálogo, aparece acá como \"Nuevo\". Todavía no es una venta confirmada — usá estos filtros para encontrarlo.",
      placement: "bottom",
      permission: "catalog_orders.read",
    },
    {
      id: "order-actions",
      route: "/dashboard/catalog-orders",
      title: "Aceptar o rechazar",
      description:
        "Abrí un pedido para ver el detalle. Aceptar genera una venta en borrador — el stock recién se descuenta cuando la confirmes en Ventas. Rechazar te pide un motivo breve para que el cliente sepa por qué.",
      permission: "catalog_orders.manage",
    },
  ],
};

registerTour(publicCatalogTour);
