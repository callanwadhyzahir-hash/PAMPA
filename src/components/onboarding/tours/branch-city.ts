import { registerTour, type Tour } from "../onboarding-registry";

export const branchCityTour: Tour = {
  id: "branch-city",
  title: "Ciudad de la sucursal",
  permission: "branches.create",
  autoStartRoute: "/dashboard/branches",
  steps: [
    {
      id: "city-select",
      target: "branch-new-button",
      route: "/dashboard/branches",
      title: "Elegí la ciudad con buscador",
      description:
        "Al cargar una sucursal, el campo Ciudad tiene buscador: escribí el nombre y elegí entre las ciudades principales de las 24 provincias del país.",
      placement: "bottom",
    },
  ],
};

registerTour(branchCityTour);
