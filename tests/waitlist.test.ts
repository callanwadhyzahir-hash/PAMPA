import assert from "node:assert/strict";
import test from "node:test";

import {
  parseWaitlistPayload,
  registerWaitlist,
  WaitlistStorageError,
  type WaitlistConfirmationSender,
  type WaitlistEntry,
  type WaitlistStorage,
} from "../src/lib/server/waitlist.ts";

const now = 1_800_000_000_000;
const validPayload = {
  name: "  Ana Pérez  ",
  email: " ANA@EXAMPLE.COM ",
  company: "  PAMPA SRL ",
  role: "  Administración ",
  consent: true,
  website: "",
  formStartedAt: now - 2_000,
};

function parseValidEntry(): WaitlistEntry {
  const result = parseWaitlistPayload(validPayload, now);
  if (!result.success) throw new Error("Expected a valid waitlist payload.");
  return result.data;
}

test("accepts a valid payload and normalizes email and text", () => {
  assert.deepEqual(parseValidEntry(), {
    name: "Ana Pérez",
    email: "ana@example.com",
    company: "PAMPA SRL",
    role: "Administración",
    consent: true,
  });
});

test("rejects invalid email, false consent, honeypot and long fields", () => {
  assert.equal(parseWaitlistPayload({ ...validPayload, email: "invalid" }, now).success, false);
  assert.equal(parseWaitlistPayload({ ...validPayload, consent: false }, now).success, false);
  assert.equal(parseWaitlistPayload({ ...validPayload, website: "bot" }, now).success, false);
  assert.equal(parseWaitlistPayload({ ...validPayload, name: "a".repeat(101) }, now).success, false);
});

test("does not send confirmation for a duplicate email", async () => {
  const storage: WaitlistStorage = { create: async () => "duplicate" };
  let sent = false;
  const sender: WaitlistConfirmationSender = { send: async () => { sent = true; } };

  const result = await registerWaitlist(parseValidEntry(), storage, sender);
  assert.deepEqual(result, { alreadyRegistered: true, confirmationSent: false });
  assert.equal(sent, false);
});

test("wraps a Supabase storage failure without sending an email", async () => {
  const storage: WaitlistStorage = { create: async () => { throw new Error("Supabase unavailable"); } };
  const sender: WaitlistConfirmationSender = { send: async () => { throw new Error("must not run"); } };

  await assert.rejects(registerWaitlist(parseValidEntry(), storage, sender), WaitlistStorageError);
});

test("keeps a successful registration when Resend fails", async () => {
  const storage: WaitlistStorage = { create: async () => "created" };
  const sender: WaitlistConfirmationSender = { send: async () => { throw new Error("Resend unavailable"); } };

  const result = await registerWaitlist(parseValidEntry(), storage, sender);
  assert.deepEqual(result, { alreadyRegistered: false, confirmationSent: false });
});
