-- Precondition: run `npm run integrity:audit` and require every count to be 0.

ALTER TABLE "user_role"
ADD COLUMN "company_id" UUID;

UPDATE "user_role" ur
SET "company_id" = u."company_id"
FROM "user" u
WHERE u."id" = ur."user_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "user_role" WHERE "company_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill user_role.company_id';
  END IF;
END
$$;

ALTER TABLE "user_role"
ALTER COLUMN "company_id" SET NOT NULL;

CREATE UNIQUE INDEX "uq_branch_id_company"
ON "branch"("id", "company_id");

CREATE UNIQUE INDEX "uq_role_id_company"
ON "role"("id", "company_id");

CREATE UNIQUE INDEX "uq_user_id_company"
ON "user"("id", "company_id");

CREATE INDEX "idx_user_role_company"
ON "user_role"("company_id");

CREATE UNIQUE INDEX "uq_branch_company_active_main"
ON "branch"("company_id")
WHERE "is_main" = true AND "is_active" = true;

ALTER TABLE "user"
DROP CONSTRAINT "fk_user_branch";

ALTER TABLE "user_role"
DROP CONSTRAINT "fk_user_role_role";

ALTER TABLE "user_role"
DROP CONSTRAINT "fk_user_role_user";

ALTER TABLE "warehouse"
DROP CONSTRAINT "fk_warehouse_branch";

ALTER TABLE "user"
ADD CONSTRAINT "fk_user_branch_company"
FOREIGN KEY ("branch_id", "company_id")
REFERENCES "branch"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "user_role"
ADD CONSTRAINT "fk_user_role_role_company"
FOREIGN KEY ("role_id", "company_id")
REFERENCES "role"("id", "company_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "user_role"
ADD CONSTRAINT "fk_user_role_user_company"
FOREIGN KEY ("user_id", "company_id")
REFERENCES "user"("id", "company_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "warehouse"
ADD CONSTRAINT "fk_warehouse_branch_company"
FOREIGN KEY ("branch_id", "company_id")
REFERENCES "branch"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION;
