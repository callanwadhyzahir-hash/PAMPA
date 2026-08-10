import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCameraError,
  isCameraSecureContext,
  resolveBarcodeDetector,
} from "../src/lib/barcode/camera-detector.ts";

test("prefers the native BarcodeDetector over the ponyfill", async () => {
  const native = function FakeNative() {} as unknown as Parameters<
    typeof resolveBarcodeDetector
  >[0];
  let ponyfillLoaded = false;

  const result = await resolveBarcodeDetector(native, async () => {
    ponyfillLoaded = true;
    return { BarcodeDetector: native! };
  });

  assert.equal(result, native);
  assert.equal(ponyfillLoaded, false);
});

test("falls back to the ponyfill when native support is missing", async () => {
  const fallback = function FakePonyfill() {} as unknown as NonNullable<
    Parameters<typeof resolveBarcodeDetector>[0]
  >;

  const result = await resolveBarcodeDetector(undefined, async () => ({
    BarcodeDetector: fallback,
  }));

  assert.equal(result, fallback);
});

test("returns null when the ponyfill fails to load (unsupported browser)", async () => {
  const result = await resolveBarcodeDetector(undefined, async () => {
    throw new Error("no wasm support");
  });

  assert.equal(result, null);
});

test("classifies a denied camera permission", () => {
  const error = new DOMException("denied", "NotAllowedError");
  assert.equal(classifyCameraError(error).reason, "permission-denied");
});

test("classifies a missing camera device", () => {
  const error = new DOMException("missing", "NotFoundError");
  assert.equal(classifyCameraError(error).reason, "no-camera");
});

test("classifies an unrecognized failure as a generic camera error", () => {
  const error = new DOMException("boom", "NotReadableError");
  assert.equal(classifyCameraError(error).reason, "camera-error");
  assert.equal(classifyCameraError(new Error("boom")).reason, "camera-error");
});

test("reports no secure context outside a browser (no window)", () => {
  assert.equal(isCameraSecureContext(), false);
});
