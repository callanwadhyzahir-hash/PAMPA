-- Precondition: commercial transaction tables were audited as empty locally.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "sale"
    UNION ALL SELECT 1 FROM "sale_item"
    UNION ALL SELECT 1 FROM "payment"
    UNION ALL SELECT 1 FROM "payment_item"
    UNION ALL SELECT 1 FROM "invoice"
  ) THEN
    RAISE EXCEPTION 'Commercial tables must be audited and migrated with an explicit backfill';
  END IF;
END
$$;

CREATE UNIQUE INDEX "uq_client_id_company"
ON "client"("id", "company_id");

ALTER TABLE "sale"
ADD COLUMN "warehouse_id" UUID NOT NULL,
ADD COLUMN "confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN "cancelled_by" UUID,
ADD COLUMN "cancellation_reason" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE UNIQUE INDEX "uq_sale_id_company"
ON "sale"("id", "company_id");

CREATE INDEX "idx_sale_company_status_date"
ON "sale"("company_id", "status", "sale_date");

ALTER TABLE "sale_item"
ADD COLUMN "company_id" UUID NOT NULL,
ADD COLUMN "product_code" VARCHAR(50) NOT NULL;

ALTER TABLE "payment"
ADD COLUMN "company_id" UUID NOT NULL,
ADD COLUMN "created_by" UUID NOT NULL,
ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN "reference" VARCHAR(255),
ADD COLUMN "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN "cancellation_reason" TEXT;

CREATE INDEX "idx_payment_company_date"
ON "payment"("company_id", "payment_date");

ALTER TABLE "invoice"
ADD COLUMN "company_id" UUID NOT NULL,
ADD COLUMN "internal_number" VARCHAR(50) NOT NULL,
ADD COLUMN "document_label" VARCHAR(100) NOT NULL DEFAULT 'COMPROBANTE INTERNO — NO FISCAL',
ADD COLUMN "company_snapshot" JSONB NOT NULL,
ADD COLUMN "client_snapshot" JSONB,
ADD COLUMN "items_snapshot" JSONB NOT NULL,
ADD COLUMN "totals_snapshot" JSONB NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ISSUED';

CREATE UNIQUE INDEX "invoice_internal_number_key"
ON "invoice"("internal_number");

CREATE UNIQUE INDEX "uq_invoice_sale_company"
ON "invoice"("sale_id", "company_id");

ALTER TABLE "sale"
DROP CONSTRAINT "fk_sale_branch",
DROP CONSTRAINT "fk_sale_client",
DROP CONSTRAINT "fk_sale_user",
DROP CONSTRAINT "ck_sale_status";

ALTER TABLE "sale_item"
DROP CONSTRAINT "fk_sale_item_product",
DROP CONSTRAINT "fk_sale_item_sale";

ALTER TABLE "payment"
DROP CONSTRAINT "fk_payment_sale";

ALTER TABLE "invoice"
DROP CONSTRAINT "fk_invoice_sale";

ALTER TABLE "sale"
ADD CONSTRAINT "fk_sale_branch_company"
FOREIGN KEY ("branch_id", "company_id")
REFERENCES "branch"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_sale_warehouse_company"
FOREIGN KEY ("warehouse_id", "company_id")
REFERENCES "warehouse"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_sale_client_company"
FOREIGN KEY ("client_id", "company_id")
REFERENCES "client"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_sale_user_company"
FOREIGN KEY ("user_id", "company_id")
REFERENCES "user"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_sale_cancelled_by_company"
FOREIGN KEY ("cancelled_by", "company_id")
REFERENCES "user"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "ck_sale_status"
CHECK ("status" IN ('DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')),
ADD CONSTRAINT "ck_sale_totals_nonnegative"
CHECK (
  "subtotal" >= 0 AND "tax_total" >= 0
  AND "discount_total" >= 0 AND "total" >= 0
);

ALTER TABLE "sale_item"
ADD CONSTRAINT "fk_sale_item_product_company"
FOREIGN KEY ("product_id", "company_id")
REFERENCES "product"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_sale_item_sale_company"
FOREIGN KEY ("sale_id", "company_id")
REFERENCES "sale"("id", "company_id")
ON DELETE CASCADE ON UPDATE NO ACTION,
ADD CONSTRAINT "ck_sale_item_quantity_positive"
CHECK ("quantity" > 0),
ADD CONSTRAINT "ck_sale_item_prices_nonnegative"
CHECK (
  "unit_price" >= 0 AND "subtotal" >= 0 AND "total" >= 0
  AND "tax_rate" >= 0 AND "tax_rate" <= 100
  AND "discount_percent" >= 0 AND "discount_percent" <= 100
);

ALTER TABLE "payment"
ADD CONSTRAINT "fk_payment_sale_company"
FOREIGN KEY ("sale_id", "company_id")
REFERENCES "sale"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "fk_payment_user_company"
FOREIGN KEY ("created_by", "company_id")
REFERENCES "user"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "ck_payment_total_positive"
CHECK ("total" > 0),
ADD CONSTRAINT "ck_payment_status"
CHECK ("status" IN ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'));

ALTER TABLE "payment_item"
ADD CONSTRAINT "ck_payment_item_amount_positive"
CHECK ("amount" > 0),
ADD CONSTRAINT "ck_payment_item_method"
CHECK ("payment_method" IN (
  'CASH',
  'BANK_TRANSFER',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'MERCADO_PAGO_MANUAL',
  'OTHER'
));

ALTER TABLE "invoice"
ADD CONSTRAINT "fk_invoice_sale_company"
FOREIGN KEY ("sale_id", "company_id")
REFERENCES "sale"("id", "company_id")
ON DELETE NO ACTION ON UPDATE NO ACTION,
ADD CONSTRAINT "ck_invoice_internal_status"
CHECK ("status" IN ('ISSUED', 'CANCELLED'));
