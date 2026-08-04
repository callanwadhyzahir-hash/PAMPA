-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "arca_error_code" VARCHAR(50),
ADD COLUMN     "arca_error_message" TEXT,
ADD COLUMN     "fiscal_approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "fiscal_requested_at" TIMESTAMPTZ(6),
ADD COLUMN     "fiscal_status" VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "point_of_sale" VARCHAR(10),
ADD COLUMN     "qr_data" TEXT,
ADD COLUMN     "voucher_type_code" VARCHAR(10);

-- CreateTable
CREATE TABLE "invoice_fiscal_attempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "environment" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "request_payload" JSONB NOT NULL,
    "response_payload" JSONB,
    "error_code" VARCHAR(50),
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_invoice_fiscal_attempt" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_invoice_fiscal_attempt_company_started" ON "invoice_fiscal_attempt"("company_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoice_fiscal_attempt_number" ON "invoice_fiscal_attempt"("invoice_id", "attempt_number");

-- CreateIndex
CREATE INDEX "idx_invoice_fiscal_status" ON "invoice"("fiscal_status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoice_id_company" ON "invoice"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoice_fiscal_document" ON "invoice"("company_id", "point_of_sale", "voucher_type_code", "invoice_number");

-- AddForeignKey
ALTER TABLE "invoice_fiscal_attempt" ADD CONSTRAINT "fk_invoice_fiscal_attempt_invoice_company" FOREIGN KEY ("invoice_id", "company_id") REFERENCES "invoice"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

