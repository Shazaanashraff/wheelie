import { test } from "node:test";
import assert from "node:assert/strict";
import { BODY, COLS, EYES, FEET, SMILE } from "./sprite.ts";

test("every sprite row is exactly as wide as the sprite", () => {
  for (const row of [...BODY, ...FEET]) assert.equal(row.length, COLS, row);
});

test("the body is left-right symmetrical apart from its highlight and shade", () => {
  for (const row of BODY) {
    const plain = row.replace(/[34]/g, "1");
    assert.equal(plain, [...plain].reverse().join(""), row);
  }
});

test("the eyes mirror each other, and the feet and smile fit inside the sprite", () => {
  assert.equal(EYES.left + EYES.right, COLS - 1);
  for (const f of FEET) assert.equal(f, [...f].reverse().join(""));
  for (const [c, r] of SMILE) assert.ok(c >= 0 && c < COLS && r >= 0 && r < BODY.length);
  assert.ok(EYES.top + 1 < BODY.length);
});
