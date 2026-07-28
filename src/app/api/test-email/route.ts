import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// TEMPORARY DIAGNOSTIC ENDPOINT — REMOVE AFTER EMAIL VALIDATION

const requiredVariables = ["RESEND_API_KEY", "WAITLIST_FROM_EMAIL", "EMAIL_TEST_TO"] as const;

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function secretsMatch(received: string | null, configured: string | undefined) {
  if (!received || !configured) return false;

  const receivedBuffer = Buffer.from(received);
  const configuredBuffer = Buffer.from(configured);

  return receivedBuffer.length === configuredBuffer.length
    && timingSafeEqual(receivedBuffer, configuredBuffer);
}

export async function POST(request: NextRequest) {
  if (!secretsMatch(request.headers.get("x-test-secret"), process.env.EMAIL_TEST_SECRET)) {
    return json({ ok: false, stage: "authorization" }, 401);
  }

  const missing = requiredVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    return json({ ok: false, stage: "configuration", missing }, 500);
  }

  const apiKey = getRequiredEnvironment("RESEND_API_KEY");
  const from = getRequiredEnvironment("WAITLIST_FROM_EMAIL");
  const to = getRequiredEnvironment("EMAIL_TEST_TO");
  const replyTo = process.env.WAITLIST_REPLY_TO_EMAIL || undefined;

  console.info("Temporary PAMPA email test configuration", {
    hasResendApiKey: Boolean(apiKey),
    from,
    to,
    replyTo,
  });

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    replyTo,
    subject: "Prueba de correo PAMPA",
    text: "Este es un correo de prueba de la integración entre Vercel y Resend.",
  });

  console.info("Temporary PAMPA email test Resend result", { data, error });

  if (error) {
    return json({ ok: false, stage: "resend", error: getResendErrorDetails(error) }, 502);
  }

  return json({ ok: true, stage: "sent", emailId: data?.id }, 200);
}

function getResendErrorDetails(error: unknown) {
  const details = isRecord(error) ? error : undefined;

  return {
    name: readString(details?.name) ?? "ResendError",
    message: readString(details?.message) ?? "Resend did not provide an error message.",
    statusCode: readNumber(details?.statusCode),
    type: readString(details?.type),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function getRequiredEnvironment(name: (typeof requiredVariables)[number]) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
