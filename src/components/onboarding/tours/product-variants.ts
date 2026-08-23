import { registerTour, type Tour } from "../onboarding-registry";

export const productVariantsTour: Tour = {
  id: "product-variants",
  title: "Talles, ml y litros por producto",
  permission: "product_categories.update",
  autoStartRoute: "/dashboard/product-categories",
  steps: [
    {
      id: "category-template",
      target: "category-new-button",
      route: "/dashboard/product-categories",
      title: "Definí el tipo de variante por categoría",
      description:
        "Al crear o editar una categoría, elegís si sus productos tienen talles, mililitros, litros o una plantilla personalizada, y cargás las opciones sugeridas (por ejemplo S/M/L o 500ml/1L).",
      placement: "bottom",
    },
    {
      id: "product-editor",
      target: "product-new-button",
      route: "/dashboard/products",
      title: "El producto arma sus variantes solo",
      description:
        "Si elegís una categoría con plantilla, el producto precarga esas opciones como variantes editables — podés agregar, renombrar o quitar filas antes de guardar.",
      placement: "bottom",
      permission: "products.update",
    },
  ],
};

registerTour(productVariantsTour);
