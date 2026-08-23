-- DropIndex
ALTER TABLE "stock" DROP CONSTRAINT "uq_stock";

-- AlterTable
ALTER TABLE "catalog_order_item" ADD COLUMN     "variant_id" UUID,
ADD COLUMN     "variant_label" VARCHAR(50);

-- AlterTable
ALTER TABLE "product_category" ADD COLUMN     "attribute_kind" VARCHAR(20) NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "sale_item" ADD COLUMN     "variant_id" UUID,
ADD COLUMN     "variant_label" VARCHAR(50);

-- AlterTable
ALTER TABLE "stock" ADD COLUMN     "variant_id" UUID;

-- AlterTable
ALTER TABLE "stock_movement" ADD COLUMN     "variant_id" UUID;

-- CreateTable
CREATE TABLE "product_category_attribute_option" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_pcao" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "sku_suffix" VARCHAR(30),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_product_variant" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pcao_category" ON "product_category_attribute_option"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pcao_category_label" ON "product_category_attribute_option"("category_id", "label");

-- CreateIndex
CREATE INDEX "idx_product_variant_company" ON "product_variant"("company_id");

-- CreateIndex
CREATE INDEX "idx_product_variant_product" ON "product_variant"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_variant_product_label" ON "product_variant"("product_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_variant_id_company" ON "product_variant"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_catalog_order_item_variant" ON "catalog_order_item"("variant_id");

-- CreateIndex
CREATE INDEX "idx_sale_item_variant" ON "sale_item"("variant_id");

-- CreateIndex
CREATE INDEX "idx_stock_variant" ON "stock"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stock_variant" ON "stock"("warehouse_id", "product_id", "variant_id");

-- CreateIndex: partial unique index, not representable in schema.prisma (no partial-index DSL).
-- Keeps the pre-variant guarantee of one stock row per warehouse+product for products
-- that have no variants (variant_id IS NULL). Do not let a future `prisma migrate dev`
-- drop this unreviewed — see the NOTE comment above the `stock` model in schema.prisma.
CREATE UNIQUE INDEX "uq_stock_no_variant" ON "stock"("warehouse_id", "product_id") WHERE "variant_id" IS NULL;

-- CreateIndex
CREATE INDEX "idx_stock_movement_variant" ON "stock_movement"("variant_id");

-- AddForeignKey
ALTER TABLE "catalog_order_item" ADD CONSTRAINT "fk_catalog_order_item_variant_company" FOREIGN KEY ("variant_id", "company_id") REFERENCES "product_variant"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_category_attribute_option" ADD CONSTRAINT "fk_pcao_category" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "fk_product_variant_product_company" FOREIGN KEY ("product_id", "company_id") REFERENCES "product"("id", "company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "fk_sale_item_variant_company" FOREIGN KEY ("variant_id", "company_id") REFERENCES "product_variant"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "fk_stock_variant_company" FOREIGN KEY ("variant_id", "company_id") REFERENCES "product_variant"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "fk_stock_movement_variant_company" FOREIGN KEY ("variant_id", "company_id") REFERENCES "product_variant"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
