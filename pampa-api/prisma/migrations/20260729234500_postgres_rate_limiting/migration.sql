CREATE TABLE "rate_limit_bucket" (
  "action" VARCHAR(40) NOT NULL,
  "key_hash" VARCHAR(64) NOT NULL,
  "window_started" TIMESTAMPTZ(6) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "blocked_until" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_bucket_pkey" PRIMARY KEY ("action", "key_hash")
);

CREATE INDEX "idx_rate_limit_blocked_until"
ON "rate_limit_bucket"("blocked_until");
