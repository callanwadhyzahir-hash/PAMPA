import assert from "node:assert/strict";
import test from "node:test";

import {
  detectBarcodeFormat,
  isInternalBarcode,
} from "../src/lib/barcode/format.ts";

test("detects a valid EAN-13 by its GS1 check digit", () => {
  // 4006381333931 is the textbook-valid EAN-13 example.
  assert.equal(detectBarcodeFormat("4006381333931"), "EAN13");
});

test("falls back to CODE128 for a 13-digit value with a bad check digit", () => {
  assert.equal(detectBarcodeFormat("4006381333930"), "CODE128");
});

test("detects a valid UPC-A by its GS1 check digit", () => {
  assert.equal(detectBarcodeFormat("036000291452"), "UPC");
});

test("detects a valid EAN-8 by its GS1 check digit", () => {
  assert.equal(detectBarcodeFormat("96385074"), "EAN8");
});

test("never claims EAN/UPC for a non-numeric value, even at the right length", () => {
  assert.equal(detectBarcodeFormat("PMP-ABCDEFGH12"), "CODE128");
});

test("falls back to CODE128 for PAMPA's own internal namespace", () => {
  assert.equal(detectBarcodeFormat("PMP-ABC123DEF456"), "CODE128");
});

test("recognizes PAMPA's internal barcode namespace", () => {
  assert.equal(isInternalBarcode("PMP-ABC123DEF456"), true);
  assert.equal(isInternalBarcode("4006381333931"), false);
  assert.equal(isInternalBarcode("pmp-abc123def456"), false);
});
