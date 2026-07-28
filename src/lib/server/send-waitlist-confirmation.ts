import { Resend } from "resend";

import type { WaitlistConfirmationSender, WaitlistEntry } from "./waitlist";

export class WaitlistConfirmationError extends Error {
  readonly resendError?: unknown;

  constructor(message: string, resendError?: unknown) {
    super(message);
    this.name = "WaitlistConfirmationError";
    this.resendError = resendError;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://pampa-erp.com";
}

export async function sendWaitlistConfirmation(entry: WaitlistEntry) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM_EMAIL;
  const replyTo = process.env.WAITLIST_REPLY_TO_EMAIL || undefined;

  console.info("Waitlist Resend configuration", {
    from,
    replyTo,
    hasResendApiKey: Boolean(apiKey),
  });

  if (!apiKey || !from) {
    throw new WaitlistConfirmationError("Waitlist email is not configured.");
  }

  const siteUrl = getSiteUrl();
  const safeName = escapeHtml(entry.name);
  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from,
      to: [entry.email],
      subject: "Ya estás en la lista de espera de PAMPA",
      replyTo,
      text: `Hola ${entry.name},\n\nRegistramos tu solicitud para recibir novedades de PAMPA. Estamos construyendo una plataforma de gestión para empresas argentinas y la beta privada está prevista para el 28 de agosto de 2026.\n\nRecibirás novedades y futuras invitaciones, pero este registro no implica una aceptación automática a la beta.\n\nConocé PAMPA: ${siteUrl}`,
      html: `<main style="background:#f7f7f2;color:#151812;font-family:Arial,sans-serif;padding:32px"><section style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border:1px solid #d9dcd1"><p style="font-size:20px;font-weight:700;letter-spacing:-.5px;margin:0">PAMPA<span style="color:#729b32">.</span></p><h1 style="font-size:26px;line-height:1.2;margin:32px 0 16px">Hola, ${safeName}.</h1><p>Registramos tu solicitud para recibir novedades de PAMPA.</p><p>Estamos construyendo una plataforma de gestión para empresas argentinas. La beta privada está prevista para el <strong>28 de agosto de 2026</strong>.</p><p>Vas a recibir novedades y futuras invitaciones. Este registro no implica una aceptación automática a la beta.</p><p style="margin-top:28px"><a href="${siteUrl}" style="background:#b8e26b;color:#0b0d0a;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">Conocer PAMPA</a></p></section></main>`,
    });

    if (error) {
      console.error("Resend API returned a waitlist email error (raw)", error);
      console.error("Resend API returned a waitlist email error (JSON)", JSON.stringify(error));
      throw new WaitlistConfirmationError("Waitlist email could not be sent.", error);
    }
  } catch (error) {
    logWaitlistConfirmationError(error);
    throw error;
  }
}

export const resendWaitlistConfirmationSender: WaitlistConfirmationSender = {
  send: sendWaitlistConfirmation,
};

export function logWaitlistConfirmationError(error: unknown) {
  const errorRecord = isRecord(error) ? error : undefined;
  const resendError = error instanceof WaitlistConfirmationError ? error.resendError : undefined;
  const resendErrorRecord = isRecord(resendError) ? resendError : undefined;

  console.error("Waitlist confirmation email failed with details", {
    error,
    message: error instanceof Error ? error.message : undefined,
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    response: errorRecord?.response ?? resendErrorRecord?.response,
    resendError,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
