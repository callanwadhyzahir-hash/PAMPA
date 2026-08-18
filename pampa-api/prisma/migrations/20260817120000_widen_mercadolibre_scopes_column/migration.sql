-- Mercado Libre real OAuth returns a scope string longer than the
-- VARCHAR(200) the column was created with (observed: 306 chars), which
-- made every real connection attempt fail with Prisma P2000 on upsert.
-- Widen to unbounded TEXT, matching the other free-form OAuth fields
-- (access_token_encrypted, refresh_token_encrypted, last_error).
ALTER TABLE "mercadolibre_connection" ALTER COLUMN "scopes" TYPE TEXT;
