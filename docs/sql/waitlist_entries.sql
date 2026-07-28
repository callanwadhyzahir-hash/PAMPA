-- PAMPA waitlist for Supabase PostgreSQL.
-- Execute this file manually in Supabase Dashboard > SQL Editor > New query.
-- It is intentionally not executed by this repository.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  company text,
  role text,
  consent boolean NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'landing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_waitlist_entries_status CHECK (status IN ('pending', 'invited', 'joined', 'unsubscribed'))
);

-- This enforces case-insensitive uniqueness and safely resolves concurrent inserts.
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_entries_email_lower
  ON public.waitlist_entries (lower(email));

CREATE OR REPLACE FUNCTION public.set_waitlist_entries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_entries_updated_at ON public.waitlist_entries;
CREATE TRIGGER trg_waitlist_entries_updated_at
BEFORE UPDATE ON public.waitlist_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_waitlist_entries_updated_at();

-- The public browser never accesses this table. The Next.js Route Handler uses
-- the server-only Supabase service role key, which bypasses RLS.
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
