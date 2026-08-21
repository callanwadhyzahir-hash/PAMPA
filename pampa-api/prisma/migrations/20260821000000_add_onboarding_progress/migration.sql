-- PAMPA guided onboarding (Sprint 1): per-user, per-tour progress, persisted
-- server-side instead of localStorage so a tour can be resumed from another
-- device/session. tour_id is a stable string id from the frontend onboarding
-- registry (src/components/onboarding/onboarding-registry.ts), not a FK.

-- CreateTable
CREATE TABLE "user_onboarding_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tour_id" VARCHAR(60) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'not_started',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "onboarding_version" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_user_onboarding_progress" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_onboarding_progress_user_tour" ON "user_onboarding_progress"("user_id", "tour_id");

-- CreateIndex
CREATE INDEX "idx_user_onboarding_progress_company" ON "user_onboarding_progress"("company_id");

-- AddForeignKey
ALTER TABLE "user_onboarding_progress" ADD CONSTRAINT "fk_user_onboarding_progress_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_onboarding_progress" ADD CONSTRAINT "fk_user_onboarding_progress_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
