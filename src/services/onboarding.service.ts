import { apiFetch } from "@/services/api";

interface ApiEnvelope<T> {
  data: T;
}

export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface OnboardingProgress {
  tour_id: string;
  status: OnboardingStatus;
  current_step: number;
  onboarding_version: number;
}

export interface SetupStatus {
  company: boolean;
  branches: boolean;
  warehouses: boolean;
  categories: boolean;
  products: boolean;
  stock: boolean;
  clients: boolean;
  sales: boolean;
  mercadolibre: boolean;
}

export interface UpdateProgressInput {
  status: OnboardingStatus;
  currentStep?: number;
  onboardingVersion?: number;
}

export const onboardingService = {
  async listProgress() {
    return (await apiFetch<ApiEnvelope<OnboardingProgress[]>>("/onboarding/progress")).data;
  },
  async updateProgress(tourId: string, input: UpdateProgressInput) {
    return (
      await apiFetch<ApiEnvelope<OnboardingProgress>>(`/onboarding/progress/${tourId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async setupStatus() {
    return (await apiFetch<ApiEnvelope<SetupStatus>>("/onboarding/setup-status")).data;
  },
};
