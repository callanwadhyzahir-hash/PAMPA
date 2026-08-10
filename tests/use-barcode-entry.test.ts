import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBarcodeEntry } from "../src/hooks/use-barcode-entry.ts";

test("trims surrounding whitespace from scanner/manual input", () => {
  assert.equal(normalizeBarcodeEntry("  779000000001  ", false, false), "779000000001");
});

test("rejects a blank or whitespace-only value", () => {
  assert.equal(normalizeBarcodeEntry("   ", false, false), null);
  assert.equal(normalizeBarcodeEntry("", false, false), null);
});

test("blocks concurrent scans while one is already in flight", () => {
  assert.equal(normalizeBarcodeEntry("779000000001", false, true), null);
});

test("rejects input while explicitly disabled", () => {
  assert.equal(normalizeBarcodeEntry("779000000001", true, false), null);
});
