import { apiFetch } from "@/services/api";
import type { ApiEnvelope, AuthUser } from "@/types/auth";

export interface LoginCredentials {
  email: string;
  password: string;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await apiFetch<ApiEnvelope<AuthUser>>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiFetch<ApiEnvelope<AuthUser>>("/auth/me");
    return response.data;
  },

  async logout() {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  },

  async forgotPassword(email: string) {
    return apiFetch<ApiEnvelope<{ message: string }>>("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    await apiFetch<void>("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
  },
};
