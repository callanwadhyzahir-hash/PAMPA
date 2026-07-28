import { NextRequest, NextResponse } from "next/server";

import { resendWaitlistConfirmationSender } from "@/lib/server/send-waitlist-confirmation";
import { supabaseWaitlistStorage } from "@/lib/server/supabase-admin";
import { parseWaitlistPayload, registerWaitlist, WaitlistStorageError } from "@/lib/server/waitlist";

const MAX_BODY_BYTES = 8_192;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestsByClient = new Map<string, number[]>();

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getClientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(clientKey: string, now = Date.now()) {
  const requests = (requestsByClient.get(clientKey) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  requests.push(now);
  requestsByClient.set(clientKey, requests);
  return requests.length > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, message: "El contenido debe ser JSON." }, 400);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, message: "La solicitud es demasiado grande." }, 400);
  }

  if (isRateLimited(getClientKey(request))) {
    return json({ ok: false, message: "Demasiados intentos. Probá nuevamente en un minuto." }, 429);
  }

  let payload: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return json({ ok: false, message: "La solicitud es demasiado grande." }, 400);
    }
    payload = JSON.parse(text);
  } catch {
    return json({ ok: false, message: "Solicitud inválida." }, 400);
  }

  const parsed = parseWaitlistPayload(payload);
  if (!parsed.success) {
    return json({ ok: false, message: parsed.message }, 400);
  }

  try {
    const result = await registerWaitlist(
      parsed.data,
      supabaseWaitlistStorage,
      resendWaitlistConfirmationSender,
    );

    if (result.alreadyRegistered) {
      return json(
        { ok: true, alreadyRegistered: true, message: "Este correo ya estaba registrado en la lista." },
        200,
      );
    }

    if (!result.confirmationSent) {
      return json(
        {
          ok: true,
          emailPending: true,
          message: "Registramos tu solicitud. Te enviaremos novedades pronto.",
        },
        201,
      );
    }

    return json({ ok: true, message: "Registramos tu solicitud. Revisá tu correo." }, 201);
  } catch (error) {
    if (error instanceof WaitlistStorageError) {
      console.error("Waitlist storage failed.");
    } else {
      console.error("Waitlist endpoint failed.");
    }
    return json({ ok: false, message: "No pudimos registrar tu solicitud. Intentá nuevamente más tarde." }, 500);
  }
}
