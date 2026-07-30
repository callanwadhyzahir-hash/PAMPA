-- Precondition audit: warehouse, stock and stock_movement are empty locally.
-- Guards keep deployment fail-closed if that changes before this migration runs.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "stock" s
    JOIN "product" p ON p."id" = s."product_id"
    JOIN "warehouse" w ON w."id" = s."warehouse_id"
    WHERE p."company_id" <> w."company_id"
  ) THEN
    RAISE EXCEPTION 'Cross-tenant stock rows must be repaired first';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "stock_movement" sm
    JOIN "product" p ON p."id" = sm."product_id"
    JOIN "warehouse" w ON w."id" = sm."warehouse_id"
    WHERE p."company_id" <> w."company_id"
  ) THEN
    RAISE EXCEPTION 'Cross-tenant stock movements must be repaired first';
  END IF;
END
$$;

ALTER TABLE "warehouse"
ADD COLUMN "is_main" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "stock"
ADD COLUMN "company_id" UUID;

UPDATE "stock" s
SET "company_id" = w."company_id"
FROM "warehouse" w
WHERE w."id" = s."warehouse_id";

ALTER TABLE "stock"
ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "stock_movement"
ADD COLUMN "company_id" UUID,
ADD COLUMN "reference_code" VARCHAR(80),
ADD COLUMN "origin" VARCHAR(30) NOT NULL DEFAULT 'MANUAL';

UPDATE "stock_movement" sm
SET "company_id" = w."company_id"
FROM "warehouse" w
WHERE w."id" = sm."warehouse_id";

ALTER TABLE "stock_movement"
ALTER COLUMN "company_id" SET NOT NULL;

CREATE UNIQUE INDEX "uq_product_id_company"
ON "product"("id", "company_id");

CREATE UNIQUE INDEX "uq_warehouse_id_company"
ON "warehouse"("id", "company_id");

CREATE UNIQUE INDEX "uq_warehouse_branch_active_main"
ON "warehouse"("branch_id")
WHERE "is_main" = true AND "is_active" = true;

CREATE INDEX "idx_stock_company"
ON "stock"("company_id");

CREATE INDEX "idx_stock_movement_company_date"
ON "stock_movement"("company_id", "created_at");

CREATE INDEX "idx_stock_movement_reference_code"
ON "stock_movement"("reference_code");

ALTER TABLE "stock"
DROP CONSTRAINT "fk_stock_product",
DROP CONSTRAINT "fk_stock_warehouse";

ALTER TABLE "stock_movement"
DROP CONSTRAINT "fk_stock_movement_product",
DROP CONSTRAINT "fk_stock_movement_warehouse",
DROP CONSTRAINT "ck_stock_movement_type";

ALTER TABLE "stock"
ADD CONSTRAINT "fk_stock_product_company"
FOREIGN KEY ("product_id", "company_id")
REFERENCES "product"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_stock_warehouse_company"
FOREIGN KEY ("warehouse_id", "company_id")
REFERENCES "warehouse"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "ck_stock_quantity_nonnegative"
CHECK ("quantity" >= 0),
ADD CONSTRAINT "ck_stock_minimum_nonnegative"
CHECK ("minimum_quantity" >= 0),
ADD CONSTRAINT "ck_stock_maximum_valid"
CHECK ("maximum_quantity" IS NULL OR "maximum_quantity" >= "minimum_quantity");

ALTER TABLE "stock_movement"
ADD CONSTRAINT "fk_stock_movement_product_company"
FOREIGN KEY ("product_id", "company_id")
REFERENCES "product"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_stock_movement_warehouse_company"
FOREIGN KEY ("warehouse_id", "company_id")
REFERENCES "warehouse"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "ck_stock_movement_quantity_positive"
CHECK ("quantity" > 0),
ADD CONSTRAINT "ck_stock_movement_type"
CHECK ("movement_type" IN (
  'INITIAL',
  'PURCHASE',
  'SALE',
  'SALE_CANCEL',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'RETURN_IN',
  'RETURN_OUT'
));
