import { z } from "zod";

import { logWaitlistConfirmationError } from "./send-waitlist-confirmation.ts";

const WAITLIST_MIN_SUBMISSION_MS = 1_000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || undefined)
    .optional();

export const waitlistPayloadSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
    email: z.string().trim().toLowerCase().email("Ingresá un correo válido.").max(254),
    company: optionalText(120),
    role: optionalText(100),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Debés aceptar recibir novedades de PAMPA." }),
    }),
    website: z.string().max(0, "Solicitud inválida."),
    formStartedAt: z.number().finite().int().positive(),
  })
  .strict();

export type WaitlistEntry = Omit<z.output<typeof waitlistPayloadSchema>, "website" | "formStartedAt">;

export type WaitlistStorage = {
  create: (entry: WaitlistEntry) => Promise<"created" | "duplicate">;
};

export type WaitlistConfirmationSender = {
  send: (entry: WaitlistEntry) => Promise<void>;
};

export class WaitlistStorageError extends Error {}

export function parseWaitlistPayload(payload: unknown, now = Date.now()):
  | { success: true; data: WaitlistEntry }
  | { success: false; message: string } {
  const result = waitlistPayloadSchema.safeParse(payload);

  if (!result.success) {
    return { success: false, message: result.error.issues[0]?.message ?? "Solicitud inválida." };
  }

  const elapsed = now - result.data.formStartedAt;
  if (elapsed < WAITLIST_MIN_SUBMISSION_MS || elapsed < -MAX_FUTURE_CLOCK_SKEW_MS) {
    return { success: false, message: "Solicitud inválida." };
  }

  const data: WaitlistEntry = {
    name: result.data.name,
    email: result.data.email,
    company: result.data.company,
    role: result.data.role,
    consent: result.data.consent,
  };
  return { success: true, data };
}

export async function registerWaitlist(
  entry: WaitlistEntry,
  storage: WaitlistStorage,
  confirmationSender: WaitlistConfirmationSender,
): Promise<{ alreadyRegistered: boolean; confirmationSent: boolean }> {
  let outcome: "created" | "duplicate";

  try {
    outcome = await storage.create(entry);
  } catch (error) {
    console.error("Waitlist storage failed with details", {
      error,
      message: error instanceof Error ? error.message : undefined,
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new WaitlistStorageError("Waitlist storage failed.");
  }

  if (outcome === "duplicate") {
    return { alreadyRegistered: true, confirmationSent: false };
  }

  try {
    await confirmationSender.send(entry);
    return { alreadyRegistered: false, confirmationSent: true };
  } catch (error) {
    logWaitlistConfirmationError(error);
    return { alreadyRegistered: false, confirmationSent: false };
  }
}
