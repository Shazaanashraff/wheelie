import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, convert, formatNum } from "./unitdata.ts";

const u = (cat: string, id: string) => CATEGORIES.find((c) => c.id === cat)!.units.find((x) => x.id === id)!;
const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test("linear conversions", () => {
  close(convert(1, u("length", "mi"), u("length", "km")), 1.609344);
  close(convert(12, u("length", "in"), u("length", "ft")), 1);
  close(convert(1, u("weight", "lb"), u("weight", "g")), 453.59237);
  close(convert(1, u("data", "gib"), u("data", "mib")), 1024);
  close(convert(100, u("speed", "kmh"), u("speed", "ms")), 27.7777778);
});

test("temperature conversions", () => {
  close(convert(100, u("temp", "c"), u("temp", "f")), 212);
  close(convert(32, u("temp", "f"), u("temp", "c")), 0);
  close(convert(0, u("temp", "c"), u("temp", "k")), 273.15);
  close(convert(-40, u("temp", "c"), u("temp", "f")), -40);
});

test("round trip is stable", () => {
  for (const cat of CATEGORIES)
    for (const a of cat.units)
      for (const b of cat.units) close(convert(convert(42, a, b), b, a), 42, 1e-6);
});

test("formatting", () => {
  assert.equal(formatNum(0), "0");
  assert.equal(formatNum(1.5), "1.5");
  assert.equal(formatNum(0.1 + 0.2), "0.3");
  assert.equal(formatNum(NaN), "–");
});
