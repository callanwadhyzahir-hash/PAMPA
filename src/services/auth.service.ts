import { ApiError, apiFetch } from "@/services/api";
import type { ApiEnvelope, AuthUser } from "@/types/auth";

/**
 * The global backend exception filter only forwards `message` and `details`
 * from an error response — a top-level `code` field would be dropped. The
 * login gate encodes EMAIL_NOT_VERIFIED as `details: { code: ... }`, so this
 * is the only place that should know that shape.
 */
export function isEmailNotVerifiedError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const details = error.details;
  return (
    typeof details === "object" &&
    details !== null &&
    "code" in details &&
    (details as { code?: unknown }).code === "EMAIL_NOT_VERIFIED"
  );
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterAccount {
  firstName: string;
  lastName: string;
  companyName: string;
  taxId: string;
  email: string;
  password: string;
}

export const authService = {
  async register(account: RegisterAccount) {
    await apiFetch<ApiEnvelope<{ created: boolean }>>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    });
  },
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

  async verifyEmail(token: string) {
    await apiFetch<void>("/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  },

  async resendVerification(email: string) {
    const response = await apiFetch<ApiEnvelope<{ message: string }>>(
      "/auth/resend-verification",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );
    return response.data;
  },
};
