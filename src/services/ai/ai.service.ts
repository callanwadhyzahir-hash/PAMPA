import { apiFetch } from "@/services/api";

interface ApiEnvelope<T> {
  data: T;
}

export interface AiUsageStatus {
  enabled: boolean;
  plan: string | null;
  creditsUsed: number;
  creditsLimit: number;
  percentageUsed: number;
  periodStart: string | null;
  periodEnd: string | null;
  remaining: number;
}

export interface AiConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResult {
  reply: string;
  usage: {
    creditsUsed: number;
    creditsRemaining: number;
    percentageUsed: number;
  };
}

export const aiService = {
  async usage() {
    return (await apiFetch<ApiEnvelope<AiUsageStatus>>("/ai/usage")).data;
  },

  async chat(message: string, conversationContext?: AiConversationTurn[]) {
    return (
      await apiFetch<ApiEnvelope<AiChatResult>>("/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationContext }),
      })
    ).data;
  },
};
