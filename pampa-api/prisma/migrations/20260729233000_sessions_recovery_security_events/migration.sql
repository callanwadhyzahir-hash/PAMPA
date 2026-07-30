ALTER TABLE "user"
ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "session" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "refresh_token_hash" VARCHAR(64) NOT NULL,
  "user_agent" VARCHAR(255),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_token" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_event" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "actor_user_id" UUID,
  "target_user_id" UUID,
  "session_id" UUID,
  "event_type" VARCHAR(60) NOT NULL,
  "result" VARCHAR(20) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_refresh_token_hash_key"
ON "session"("refresh_token_hash");
CREATE INDEX "idx_session_user_revoked"
ON "session"("user_id", "revoked_at");
CREATE INDEX "idx_session_family" ON "session"("family_id");
CREATE INDEX "idx_session_expires" ON "session"("expires_at");

CREATE UNIQUE INDEX "password_reset_token_token_hash_key"
ON "password_reset_token"("token_hash");
CREATE INDEX "idx_password_reset_user_created"
ON "password_reset_token"("user_id", "created_at");
CREATE INDEX "idx_password_reset_expires"
ON "password_reset_token"("expires_at");

CREATE INDEX "idx_security_event_company_created"
ON "security_event"("company_id", "created_at");
CREATE INDEX "idx_security_event_actor_created"
ON "security_event"("actor_user_id", "created_at");
CREATE INDEX "idx_security_event_type_created"
ON "security_event"("event_type", "created_at");

ALTER TABLE "session"
ADD CONSTRAINT "fk_session_user"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "password_reset_token"
ADD CONSTRAINT "fk_password_reset_user"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "security_event"
ADD CONSTRAINT "fk_security_event_company"
FOREIGN KEY ("company_id") REFERENCES "company"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "security_event"
ADD CONSTRAINT "fk_security_event_actor"
FOREIGN KEY ("actor_user_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "security_event"
ADD CONSTRAINT "fk_security_event_target"
FOREIGN KEY ("target_user_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "security_event"
ADD CONSTRAINT "fk_security_event_session"
FOREIGN KEY ("session_id") REFERENCES "session"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
