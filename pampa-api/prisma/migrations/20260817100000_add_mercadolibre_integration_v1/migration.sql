-- Mercado Libre integration v1: connection, listings, product links, orders.
-- Purely additive. Access/refresh tokens are stored encrypted at the
-- application layer (mercadolibre_connection.access_token_encrypted /
-- refresh_token_encrypted) and are never selected into API responses.

-- CreateTable
CREATE TABLE "mercadolibre_connection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "provider" VARCHAR(10) NOT NULL,
    "ml_user_id" VARCHAR(50) NOT NULL,
    "nickname" VARCHAR(100) NOT NULL,
    "site_id" VARCHAR(10) NOT NULL,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "scopes" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_mercadolibre_connection" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercadolibre_listing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "ml_item_id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "currency_id" VARCHAR(10) NOT NULL,
    "available_quantity" INTEGER NOT NULL DEFAULT 0,
    "sold_quantity" INTEGER NOT NULL DEFAULT 0,
    "thumbnail_url" TEXT,
    "permalink" TEXT,
    "last_synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_mercadolibre_listing" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercadolibre_product_link" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_mercadolibre_product_link" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercadolibre_order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "ml_order_id" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency_id" VARCHAR(10) NOT NULL,
    "buyer_nickname" VARCHAR(100),
    "date_created" TIMESTAMPTZ(6) NOT NULL,
    "date_closed" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_mercadolibre_order" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_connection_company" ON "mercadolibre_connection"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_connection_id_company" ON "mercadolibre_connection"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_mercadolibre_listing_company" ON "mercadolibre_listing"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_listing_connection_item" ON "mercadolibre_listing"("connection_id", "ml_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_listing_id_company" ON "mercadolibre_listing"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_mercadolibre_product_link_company" ON "mercadolibre_product_link"("company_id");

-- CreateIndex
CREATE INDEX "idx_mercadolibre_product_link_product" ON "mercadolibre_product_link"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_product_link_listing" ON "mercadolibre_product_link"("listing_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_product_link_id_company" ON "mercadolibre_product_link"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_mercadolibre_order_company_date" ON "mercadolibre_order"("company_id", "date_created");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_order_connection_order" ON "mercadolibre_order"("connection_id", "ml_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mercadolibre_order_id_company" ON "mercadolibre_order"("id", "company_id");

-- AddForeignKey
ALTER TABLE "mercadolibre_connection" ADD CONSTRAINT "fk_mercadolibre_connection_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mercadolibre_listing" ADD CONSTRAINT "fk_mercadolibre_listing_connection_company" FOREIGN KEY ("connection_id", "company_id") REFERENCES "mercadolibre_connection"("id", "company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mercadolibre_product_link" ADD CONSTRAINT "fk_mercadolibre_product_link_listing_company" FOREIGN KEY ("listing_id", "company_id") REFERENCES "mercadolibre_listing"("id", "company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mercadolibre_product_link" ADD CONSTRAINT "fk_mercadolibre_product_link_product_company" FOREIGN KEY ("product_id", "company_id") REFERENCES "product"("id", "company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mercadolibre_order" ADD CONSTRAINT "fk_mercadolibre_order_connection_company" FOREIGN KEY ("connection_id", "company_id") REFERENCES "mercadolibre_connection"("id", "company_id") ON DELETE CASCADE ON UPDATE NO ACTION;
