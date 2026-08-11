-- AlterTable
ALTER TABLE "user" ADD COLUMN     "email_verified_at" TIMESTAMPTZ(6);

-- Backfill: users that already exist before this migration are considered
-- verified (they were able to log in before verification existed). Users
-- created after this migration start with email_verified_at = NULL and must
-- verify through the new /auth/verify-email flow.
UPDATE "user" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;

-- CreateTable
CREATE TABLE "email_verification_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_token_token_hash_key" ON "email_verification_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_email_verification_user_created" ON "email_verification_token"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_email_verification_expires" ON "email_verification_token"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_user_id_key" ON "platform_admin"("user_id");

-- AddForeignKey
ALTER TABLE "email_verification_token" ADD CONSTRAINT "fk_email_verification_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "platform_admin" ADD CONSTRAINT "fk_platform_admin_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
