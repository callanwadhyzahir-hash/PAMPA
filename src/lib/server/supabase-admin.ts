import { createClient } from "@supabase/supabase-js";

import type { WaitlistStorage } from "./waitlist";

type WaitlistRow = {
  name: string;
  email: string;
  company?: string;
  role?: string;
  consent: true;
  source: "landing";
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Waitlist storage is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const supabaseWaitlistStorage: WaitlistStorage = {
  async create(entry) {
    const row: WaitlistRow = { ...entry, source: "landing" };
    const { error } = await getSupabaseAdmin().from("waitlist_entries").insert(row);

    if (!error) return "created";
    if (error.code === "23505") return "duplicate";

    throw new Error("Could not store waitlist entry.");
  },
};
