-- Roles personalizados mantienen system_code en NULL. PostgreSQL permite
-- múltiples NULL dentro de un índice UNIQUE compuesto.
ALTER TABLE "role"
ADD COLUMN "system_code" VARCHAR(30);

CREATE UNIQUE INDEX "uq_role_company_system_code"
ON "role"("company_id", "system_code");
