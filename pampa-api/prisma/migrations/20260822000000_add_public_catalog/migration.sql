-- AlterTable
ALTER TABLE "product" ADD COLUMN     "catalog_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "catalog_position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "catalog_visible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "catalog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "logo_pathname" VARCHAR(500),
    "whatsapp" VARCHAR(50),
    "contact_email" VARCHAR(255),
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "show_prices" BOOLEAN NOT NULL DEFAULT true,
    "show_availability" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_catalog" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "catalog_id" UUID NOT NULL,
    "order_number" BIGSERIAL NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "customer_name" VARCHAR(150) NOT NULL,
    "customer_phone" VARCHAR(50) NOT NULL,
    "customer_email" VARCHAR(255),
    "notes" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "client_id" UUID,
    "sale_id" UUID,
    "accepted_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "requester_ip_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_catalog_order" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_order_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "product_code" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "pk_catalog_order_item" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_catalog_slug" ON "catalog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "uq_catalog_company" ON "catalog"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_catalog_id_company" ON "catalog"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_catalog_order_company_status_created" ON "catalog_order"("company_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_catalog_order_client" ON "catalog_order"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_catalog_order_id_company" ON "catalog_order"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_catalog_order_sale_company" ON "catalog_order"("sale_id", "company_id");

-- CreateIndex
CREATE INDEX "idx_catalog_order_item_product" ON "catalog_order_item"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_catalog_order_item_line" ON "catalog_order_item"("order_id", "line_number");

-- CreateIndex
CREATE INDEX "idx_product_company_catalog_visible" ON "product"("company_id", "catalog_visible");

-- AddForeignKey
ALTER TABLE "catalog" ADD CONSTRAINT "fk_catalog_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog" ADD CONSTRAINT "fk_catalog_branch_company" FOREIGN KEY ("branch_id", "company_id") REFERENCES "branch"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog" ADD CONSTRAINT "fk_catalog_warehouse_company" FOREIGN KEY ("warehouse_id", "company_id") REFERENCES "warehouse"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog_order" ADD CONSTRAINT "fk_catalog_order_catalog_company" FOREIGN KEY ("catalog_id", "company_id") REFERENCES "catalog"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog_order" ADD CONSTRAINT "fk_catalog_order_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog_order" ADD CONSTRAINT "fk_catalog_order_client_company" FOREIGN KEY ("client_id", "company_id") REFERENCES "client"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog_order" ADD CONSTRAINT "fk_catalog_order_sale_company" FOREIGN KEY ("sale_id", "company_id") REFERENCES "sale"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog_order_item" ADD CONSTRAINT "fk_catalog_order_item_order_company" FOREIGN KEY ("order_id", "company_id") REFERENCES "catalog_order"("id", "company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalog_order_item" ADD CONSTRAINT "fk_catalog_order_item_product_company" FOREIGN KEY ("product_id", "company_id") REFERENCES "product"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
