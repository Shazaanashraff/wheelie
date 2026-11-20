import { test } from "node:test";
import assert from "node:assert/strict";
import { expand } from "./snippetfmt.ts";

const t = new Date(2026, 2, 5, 9, 7); // 5 Mar 2026, 09:07 local, a Thursday

test("placeholders expand", () => {
  assert.equal(expand("Today is {date}", t), "Today is 2026-03-05");
  assert.equal(expand("{time}", t), "09:07");
  assert.equal(expand("{datetime}", t), "2026-03-05 09:07");
  assert.equal(expand("{weekday}", t), "Thursday");
  assert.equal(expand("{date} {date}", t), "2026-03-05 2026-03-05");
});

test("unknown braces and code are left untouched", () => {
  assert.equal(expand("const o = { date: 1 };", t), "const o = { date: 1 };");
  assert.equal(expand("{unknown} {Date}", t), "{unknown} {Date}");
  assert.equal(expand("", t), "");
});
