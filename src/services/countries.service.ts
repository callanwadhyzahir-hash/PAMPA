import { apiFetch } from "@/services/api";
import type { Country } from "@/types/country";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  timestamp: string;
  data: T;
};

async function getCountries(): Promise<Country[]> {
  const response = await apiFetch<ApiResponse<Country[]>>("/countries");

  return response.data;
}

export { getCountries };
