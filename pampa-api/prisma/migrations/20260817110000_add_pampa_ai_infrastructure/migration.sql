-- PAMPA IA infrastructure (Sprint 1): tenant AI quota/economics and the
-- provider-usage ledger. Purely additive — no existing table is touched.
-- Deliberately does NOT create a table for conversation content: this
-- migration only adds the economic ledger (AI Usage Ledger), never the
-- AI Conversation History concept described in docs/pampa-ai-architecture.md.

-- CreateTable
CREATE TABLE "company_ai_subscription" (
    "company_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "plan_code" VARCHAR(20) NOT NULL DEFAULT 'AI_FREE',
    "monthly_credit_limit" INTEGER NOT NULL DEFAULT 0,
    "internal_cost_limit_usd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "credits_used_period" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "reserved_credits_period" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "cost_used_period_usd" DECIMAL(12,8) NOT NULL DEFAULT 0,
    "reserved_cost_period_usd" DECIMAL(12,8) NOT NULL DEFAULT 0,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_company_ai_subscription" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "ai_usage_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "user_id" UUID,
    "provider" VARCHAR(20) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "operation" VARCHAR(40) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(12,8) NOT NULL DEFAULT 0,
    "credits_used" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL,
    "error_code" VARCHAR(60),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_ai_usage_ledger" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ai_usage_ledger_company_created" ON "ai_usage_ledger"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_ai_usage_ledger_user_created" ON "ai_usage_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_ai_usage_ledger_created" ON "ai_usage_ledger"("created_at");

-- CreateIndex
CREATE INDEX "idx_ai_usage_ledger_provider_model" ON "ai_usage_ledger"("provider", "model");

-- AddForeignKey
ALTER TABLE "company_ai_subscription" ADD CONSTRAINT "fk_company_ai_subscription_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "fk_ai_usage_ledger_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "fk_ai_usage_ledger_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
