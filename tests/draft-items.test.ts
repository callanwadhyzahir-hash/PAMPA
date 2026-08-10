import assert from "node:assert/strict";
import test from "node:test";

import { addProductToDraft } from "../src/lib/sales/draft-items.ts";

test("appends a new product with quantity 1", () => {
  const result = addProductToDraft([], "product-a");

  assert.deepEqual(result, [
    { productId: "product-a", quantity: "1", discountPercent: "0" },
  ]);
});

test("re-scanning an already-added product increments its quantity instead of duplicating it", () => {
  const first = addProductToDraft([], "product-a");
  const second = addProductToDraft(first, "product-a");
  const third = addProductToDraft(second, "product-a");

  assert.equal(third.length, 1);
  assert.equal(third[0].quantity, "3");
});

test("keeps other draft items and their discount untouched", () => {
  const items = [
    { productId: "product-a", quantity: "2", discountPercent: "10" },
    { productId: "product-b", quantity: "1", discountPercent: "0" },
  ];

  const result = addProductToDraft(items, "product-a");

  assert.deepEqual(result, [
    { productId: "product-a", quantity: "3", discountPercent: "10" },
    { productId: "product-b", quantity: "1", discountPercent: "0" },
  ]);
});
