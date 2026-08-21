-- Product images (Catálogo -> foto de producto). Single primary image per
-- product, stored in Vercel Blob (public). image_pathname is kept alongside
-- image_url so the backend can delete/replace the blob without parsing the
-- URL. Both columns are nullable: existing products keep working with no
-- image, and it is never required to have one.

-- AlterTable
ALTER TABLE "product" ADD COLUMN "image_url" VARCHAR(500),
ADD COLUMN "image_pathname" VARCHAR(500);
