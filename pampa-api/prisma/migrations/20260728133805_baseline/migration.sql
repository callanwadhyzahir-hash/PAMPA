-- CreateSchema
-- PostgreSQL extension required by UUID defaults below.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "address" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID NOT NULL,
    "street" VARCHAR(150) NOT NULL,
    "number" VARCHAR(20),
    "floor" VARCHAR(20),
    "apartment" VARCHAR(20),
    "neighborhood" VARCHAR(100),
    "zip_code" VARCHAR(20),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "state_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "postal_code" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "address_id" UUID,
    "code" VARCHAR(30) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "business_name" VARCHAR(200),
    "tax_id" VARCHAR(30),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "is_company" BOOLEAN NOT NULL DEFAULT false,
    "credit_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_client" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_type_id" UUID NOT NULL,
    "tax_condition_id" UUID NOT NULL,
    "currency_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legal_name" VARCHAR(250),
    "tax_id" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "website" VARCHAR(255),
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_type" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "iso_code" CHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone_code" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50),
    "invoice_type" VARCHAR(10),
    "cae" VARCHAR(50),
    "cae_expiration" DATE,
    "issued_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_id" UUID NOT NULL,
    "payment_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_payment" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "transaction_reference" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_payment_item" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_permission" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "category_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "barcode" VARCHAR(100),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "product_type" VARCHAR(20) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'UNIT',
    "cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "tracks_stock" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_product" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_product_category" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_role" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_role_permission" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID,
    "user_id" UUID NOT NULL,
    "sale_number" BIGSERIAL NOT NULL,
    "sale_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_sale" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "pk_sale_item" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "minimum_quantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "maximum_quantity" DECIMAL(15,3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_stock" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "reference_id" UUID,
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "pk_stock_movement" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_condition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" VARCHAR(50),
    "avatar_url" TEXT,
    "last_login_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_user" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_user_role" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "warehouse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_warehouse" PRIMARY KEY ("id")
);

-- AddUniqueConstraint
ALTER TABLE "branch" ADD CONSTRAINT "uq_branch_code" UNIQUE ("company_id", "code");

-- AddUniqueConstraint
ALTER TABLE "city" ADD CONSTRAINT "uq_city_state" UNIQUE ("state_id", "name");

-- CreateIndex
CREATE INDEX "idx_client_business_name" ON "client"("business_name");

-- CreateIndex
CREATE INDEX "idx_client_company" ON "client"("company_id");

-- CreateIndex
CREATE INDEX "idx_client_tax_id" ON "client"("tax_id");

-- AddUniqueConstraint
ALTER TABLE "client" ADD CONSTRAINT "uq_client_company_code" UNIQUE ("company_id", "code");

-- AddUniqueConstraint
ALTER TABLE "company" ADD CONSTRAINT "company_tax_id_key" UNIQUE ("tax_id");

-- AddUniqueConstraint
ALTER TABLE "company_type" ADD CONSTRAINT "company_type_code_key" UNIQUE ("code");

-- AddUniqueConstraint
ALTER TABLE "country" ADD CONSTRAINT "country_iso_code_key" UNIQUE ("iso_code");

-- AddUniqueConstraint
ALTER TABLE "country" ADD CONSTRAINT "country_name_key" UNIQUE ("name");

-- AddUniqueConstraint
ALTER TABLE "currency" ADD CONSTRAINT "currency_code_key" UNIQUE ("code");

-- AddUniqueConstraint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_sale_id_key" UNIQUE ("sale_id");

-- CreateIndex
CREATE INDEX "idx_invoice_number" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_payment_sale" ON "payment"("sale_id");

-- AddUniqueConstraint
ALTER TABLE "permission" ADD CONSTRAINT "uq_permission_code" UNIQUE ("code");

-- CreateIndex
CREATE INDEX "idx_permission_module" ON "permission"("module");

-- AddUniqueConstraint
ALTER TABLE "product" ADD CONSTRAINT "uq_product_barcode" UNIQUE ("barcode");

-- CreateIndex
CREATE INDEX "idx_product_category" ON "product"("category_id");

-- CreateIndex
CREATE INDEX "idx_product_company" ON "product"("company_id");

-- CreateIndex
CREATE INDEX "idx_product_name" ON "product"("name");

-- AddUniqueConstraint
ALTER TABLE "product" ADD CONSTRAINT "uq_product_company_code" UNIQUE ("company_id", "code");

-- AddUniqueConstraint
ALTER TABLE "product_category" ADD CONSTRAINT "uq_product_category_company_name" UNIQUE ("company_id", "name");

-- CreateIndex
CREATE INDEX "idx_role_company" ON "role"("company_id");

-- AddUniqueConstraint
ALTER TABLE "role" ADD CONSTRAINT "uq_role_company_name" UNIQUE ("company_id", "name");

-- CreateIndex
CREATE INDEX "idx_sale_client" ON "sale"("client_id");

-- CreateIndex
CREATE INDEX "idx_sale_company" ON "sale"("company_id");

-- CreateIndex
CREATE INDEX "idx_sale_date" ON "sale"("sale_date");

-- CreateIndex
CREATE INDEX "idx_sale_item_product" ON "sale_item"("product_id");

-- AddUniqueConstraint
ALTER TABLE "sale_item" ADD CONSTRAINT "uq_sale_item_line" UNIQUE ("sale_id", "line_number");

-- AddUniqueConstraint
ALTER TABLE "state" ADD CONSTRAINT "uq_state_country" UNIQUE ("country_id", "name");

-- CreateIndex
CREATE INDEX "idx_stock_product" ON "stock"("product_id");

-- CreateIndex
CREATE INDEX "idx_stock_warehouse" ON "stock"("warehouse_id");

-- AddUniqueConstraint
ALTER TABLE "stock" ADD CONSTRAINT "uq_stock" UNIQUE ("warehouse_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_stock_movement_date" ON "stock_movement"("created_at");

-- CreateIndex
CREATE INDEX "idx_stock_movement_product" ON "stock_movement"("product_id");

-- AddUniqueConstraint
ALTER TABLE "tax_condition" ADD CONSTRAINT "tax_condition_code_key" UNIQUE ("code");

-- AddUniqueConstraint
ALTER TABLE "user" ADD CONSTRAINT "uq_user_email" UNIQUE ("email");

-- CreateIndex
CREATE INDEX "idx_user_branch" ON "user"("branch_id");

-- CreateIndex
CREATE INDEX "idx_user_company" ON "user"("company_id");

-- AddUniqueConstraint
ALTER TABLE "warehouse" ADD CONSTRAINT "uq_warehouse_company_code" UNIQUE ("company_id", "code");

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "fk_address_city" FOREIGN KEY ("city_id") REFERENCES "city"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "fk_branch_address" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "fk_branch_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "city" ADD CONSTRAINT "fk_city_state" FOREIGN KEY ("state_id") REFERENCES "state"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "fk_client_address" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "fk_client_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "fk_company_currency" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "fk_company_tax_condition" FOREIGN KEY ("tax_condition_id") REFERENCES "tax_condition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "fk_company_type" FOREIGN KEY ("company_type_id") REFERENCES "company_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "fk_invoice_sale" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "fk_payment_sale" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_item" ADD CONSTRAINT "fk_payment_item_payment" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "fk_product_category" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "fk_product_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_category" ADD CONSTRAINT "fk_product_category_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "fk_role_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "fk_role_permission_permission" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "fk_role_permission_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "fk_sale_branch" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "fk_sale_client" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "fk_sale_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "fk_sale_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "fk_sale_item_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "fk_sale_item_sale" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "state" ADD CONSTRAINT "fk_state_country" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "fk_stock_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "fk_stock_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "fk_stock_movement_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "fk_stock_movement_user" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "fk_stock_movement_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "fk_user_branch" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "fk_user_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "fk_user_role_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "fk_user_role_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warehouse" ADD CONSTRAINT "fk_warehouse_branch" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warehouse" ADD CONSTRAINT "fk_warehouse_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Constraints present in the existing PostgreSQL schema but not represented by Prisma.
ALTER TABLE "product" ADD CONSTRAINT "ck_product_type" CHECK (((product_type)::text = ANY ((ARRAY['PRODUCT'::character varying, 'SERVICE'::character varying])::text[])));
ALTER TABLE "sale" ADD CONSTRAINT "ck_sale_status" CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])));
ALTER TABLE "stock_movement" ADD CONSTRAINT "ck_stock_movement_type" CHECK (((movement_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'SALE'::character varying, 'ADJUSTMENT'::character varying, 'TRANSFER'::character varying, 'RETURN'::character varying])::text[])));

-- Table comments present in the existing PostgreSQL schema but not represented by Prisma.
COMMENT ON TABLE "client" IS 'Stores customers of the company.';
COMMENT ON TABLE "payment" IS 'Represents the payment associated with a sale.';
COMMENT ON TABLE "payment_item" IS 'Each payment method used in a payment.';
COMMENT ON TABLE "permission" IS 'Atomic actions that can be granted to roles.';
COMMENT ON TABLE "product" IS 'Products and services offered by the company.';
COMMENT ON TABLE "product_category" IS 'Groups products into logical categories.';
COMMENT ON TABLE "role" IS 'Groups permissions assigned to users.';
COMMENT ON TABLE "role_permission" IS 'Many-to-many relationship between roles and permissions.';
COMMENT ON TABLE "sale" IS 'Represents a sales transaction.';
COMMENT ON TABLE "sale_item" IS 'Stores the products included in a sale.';
COMMENT ON TABLE "stock" IS 'Current stock by warehouse and product.';
COMMENT ON TABLE "stock_movement" IS 'History of all inventory movements.';
COMMENT ON TABLE "user" IS 'Application users.';
COMMENT ON TABLE "user_role" IS 'Assigns one or more roles to a user.';
COMMENT ON TABLE "warehouse" IS 'Physical locations where inventory is stored.';
