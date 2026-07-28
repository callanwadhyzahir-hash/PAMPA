"use client";

import { useEffect, useState } from "react";

import { getCountries } from "@/services/countries.service";
import type { Country } from "@/types/country";

function useCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    void getCountries()
      .then((data) => {
        if (active) {
          setCountries(data);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause : new Error("No se pudieron cargar los paises."));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { countries, loading, error };
}

export { useCountries };
