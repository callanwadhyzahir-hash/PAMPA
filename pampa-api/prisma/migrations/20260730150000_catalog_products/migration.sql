-- Precondition audit: product and product_category are empty in the local beta
-- database. The guards also make this migration fail closed if incompatible
-- rows are introduced before deployment.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product" p
    JOIN "product_category" pc ON pc."id" = p."category_id"
    WHERE p."category_id" IS NOT NULL
      AND p."company_id" <> pc."company_id"
  ) THEN
    RAISE EXCEPTION 'Cross-tenant product/category rows must be repaired first';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "product"
    WHERE "barcode" IS NOT NULL
    GROUP BY "company_id", "barcode"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate product barcodes inside a tenant must be repaired first';
  END IF;
END
$$;

ALTER TABLE "product"
ADD COLUMN "sale_price" DECIMAL(15,2) NOT NULL DEFAULT 0;

ALTER TABLE "product"
DROP CONSTRAINT "uq_product_barcode";

ALTER TABLE "product"
DROP CONSTRAINT "fk_product_category";

CREATE UNIQUE INDEX "uq_product_category_id_company"
ON "product_category"("id", "company_id");

CREATE UNIQUE INDEX "uq_product_company_barcode"
ON "product"("company_id", "barcode");

ALTER TABLE "product"
ADD CONSTRAINT "fk_product_category_company"
FOREIGN KEY ("category_id", "company_id")
REFERENCES "product_category"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "product"
ADD CONSTRAINT "ck_product_cost_nonnegative"
CHECK ("cost" >= 0);

ALTER TABLE "product"
ADD CONSTRAINT "ck_product_sale_price_nonnegative"
CHECK ("sale_price" >= 0);

ALTER TABLE "product"
ADD CONSTRAINT "ck_product_tax_rate_range"
CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100);
