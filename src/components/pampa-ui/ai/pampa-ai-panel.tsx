"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, Ban, LoaderCircle, Sparkles, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api";
import { aiService, type AiConversationTurn, type AiUsageStatus } from "@/services/ai/ai.service";
import { PampaAiWidget } from "./pampa-ai-widget";

export interface PampaAiPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ErrorKind =
  | "quota_exceeded"
  | "rate_limited"
  | "provider_unavailable"
  | "permission_denied"
  | "network_error"
  | "generic";

interface ChatError {
  kind: ErrorKind;
  message: string;
}

const EXAMPLE_PROMPTS = [
  "¿Cómo vienen las ventas esta semana?",
  "¿Qué productos tienen poco stock?",
  "¿Cuáles fueron mis productos más vendidos?",
  "Resumime el negocio de este mes.",
];

/** Prior turns kept in-memory only for this panel session — never persisted, never sent beyond the last N turns. See docs/pampa-ai-architecture.md §Conversaciones. */
const MAX_CLIENT_CONTEXT_TURNS = 10;
/** Purely cosmetic: after this delay we swap "Pensando…" for a more specific-sounding label. POST /ai/chat is a single request/response — PAMPA IA has no real per-tool progress channel this sprint (that would need streaming), so this never names an actual tool, just signals "still working". */
const CONSULTING_LABEL_DELAY_MS = 900;

function errorFromApiError(error: unknown): ChatError {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return { kind: "network_error", message: "No pudimos conectarnos con PAMPA. Revisá tu conexión." };
    }
    if (error.status === 402) {
      return {
        kind: "quota_exceeded",
        message: error.message || "Alcanzaste el límite mensual de PAMPA IA.",
      };
    }
    if (error.status === 429) {
      return { kind: "rate_limited", message: error.message || "Estás consultando demasiado rápido." };
    }
    if (error.status === 403) {
      return { kind: "permission_denied", message: "No tenés permiso para usar PAMPA IA." };
    }
    if (error.status === 503 || error.status === 502) {
      return {
        kind: "provider_unavailable",
        message: error.message || "PAMPA IA no está disponible en este momento.",
      };
    }
    return { kind: "generic", message: error.message };
  }
  return { kind: "generic", message: "No pudimos completar la consulta." };
}

function errorIcon(kind: ErrorKind) {
  switch (kind) {
    case "network_error":
      return WifiOff;
    case "quota_exceeded":
      return Ban;
    default:
      return AlertTriangle;
  }
}

export function PampaAiPanel({ open, onOpenChange }: PampaAiPanelProps) {
  const [usage, setUsage] = useState<AiUsageStatus | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking" | "consulting">("idle");
  const [error, setError] = useState<ChatError | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setUsageLoading(true);
      void aiService
        .usage()
        .then((result) => {
          if (!cancelled) setUsage(result);
        })
        .catch(() => {
          if (!cancelled) setUsage(null);
        })
        .finally(() => {
          if (!cancelled) setUsageLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const disabled = usage ? !usage.enabled : false;
  const quotaExceeded = usage ? usage.enabled && usage.percentageUsed >= 100 : false;
  const blocked = disabled || quotaExceeded;
  const busy = status !== "idle";

  async function send(message: string) {
    const text = message.trim();
    if (!text || busy || blocked) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const context: AiConversationTurn[] = messages.slice(-MAX_CLIENT_CONTEXT_TURNS).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setStatus("thinking");
    const consultingTimer = window.setTimeout(() => setStatus("consulting"), CONSULTING_LABEL_DELAY_MS);

    try {
      const result = await aiService.chat(text, context);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: result.reply },
      ]);
      setUsage((prev) =>
        prev
          ? {
              ...prev,
              creditsUsed: Math.max(0, prev.creditsLimit - result.usage.creditsRemaining),
              percentageUsed: result.usage.percentageUsed,
              remaining: result.usage.creditsRemaining,
            }
          : prev,
      );
    } catch (reason) {
      setError(errorFromApiError(reason));
    } finally {
      window.clearTimeout(consultingTimer);
      setStatus("idle");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b border-border px-4 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-primary" aria-hidden />
            PAMPA IA
          </SheetTitle>
          <p className="text-caption text-muted-foreground">Asistente administrativo</p>
        </SheetHeader>

        {!usageLoading && usage && (
          <div className="border-b border-border px-4 py-3">
            <PampaAiWidget status={usage} />
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-body-sm text-muted-foreground">
                Preguntale algo sobre tu negocio…
              </p>
              <div className="flex flex-col gap-1.5">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    disabled={busy || blocked}
                    className="rounded-sm border border-border bg-card px-3 py-2 text-left text-body-sm text-foreground transition-colors hover:border-primary/40 hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-sm px-3 py-2 text-body-sm leading-6 whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-body-sm text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                {status === "consulting" ? "Consultando datos de tu negocio…" : "Pensando…"}
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="flex max-w-[90%] items-start gap-2 rounded-sm border border-destructive/30 bg-destructive-bg px-3 py-2 text-body-sm text-destructive">
                {(() => {
                  const Icon = errorIcon(error.kind);
                  return <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />;
                })()}
                <span>{error.message}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          {disabled ? (
            <div className="rounded-sm bg-destructive-bg px-3 py-2 text-caption text-destructive">
              PAMPA IA no está habilitada para tu empresa.
            </div>
          ) : quotaExceeded ? (
            <div className="rounded-sm bg-destructive-bg px-3 py-2 text-caption text-destructive">
              Alcanzaste el límite mensual de PAMPA IA. El resto de PAMPA continúa funcionando
              normalmente.
              <button type="button" className="ml-1 font-medium underline underline-offset-2">
                Ampliar capacidad
              </button>
            </div>
          ) : (
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Preguntale algo sobre tu negocio…"
                disabled={busy}
                maxLength={4000}
                className="min-h-10 flex-1 resize-none"
                rows={1}
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Enviar">
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowUp className="size-4" aria-hidden />
                )}
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
