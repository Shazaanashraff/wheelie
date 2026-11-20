import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, parseColor, textOn, toHex, toHsl, toHslString, toRgbString } from "./colorutil.ts";

test("parsing", () => {
  assert.deepEqual(parseColor("#fff"), { r: 255, g: 255, b: 255 });
  assert.deepEqual(parseColor("7C8CFF"), { r: 124, g: 140, b: 255 });
  assert.deepEqual(parseColor("rgb(1, 2, 3)"), { r: 1, g: 2, b: 3 });
  assert.deepEqual(parseColor("10 20 30"), { r: 10, g: 20, b: 30 });
  assert.deepEqual(parseColor("  #0a0b0c "), { r: 10, g: 11, b: 12 });
});

test("rejects things that are not colours", () => {
  for (const bad of ["", "#12", "#ggg", "rgb(300,0,0)", "blue", "1,2", "#1234567"]) assert.equal(parseColor(bad), null, bad);
});

test("hex / rgb / hsl output", () => {
  const c = { r: 124, g: 140, b: 255 };
  assert.equal(toHex(c), "#7c8cff");
  assert.equal(toRgbString(c), "rgb(124, 140, 255)");
  assert.equal(toHslString(c), "hsl(233, 100%, 74%)");
  assert.equal(toHex({ r: 0, g: 5, b: 300 }), "#0005ff", "clamped");
});

test("hsl of primaries and greys", () => {
  assert.deepEqual(toHsl({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, l: 50 });
  assert.deepEqual(toHsl({ r: 0, g: 255, b: 0 }), { h: 120, s: 100, l: 50 });
  assert.deepEqual(toHsl({ r: 0, g: 0, b: 255 }), { h: 240, s: 100, l: 50 });
  assert.deepEqual(toHsl({ r: 128, g: 128, b: 128 }), { h: 0, s: 0, l: 50 });
});

test("parse -> hex round trip", () => {
  for (const hex of ["#000000", "#ffffff", "#123456", "#abcdef"]) assert.equal(toHex(parseColor(hex)!), hex);
});

test("readable text colour and contrast", () => {
  assert.equal(textOn({ r: 255, g: 255, b: 255 }), "#000000");
  assert.equal(textOn({ r: 0, g: 0, b: 0 }), "#ffffff");
  assert.equal(textOn({ r: 255, g: 220, b: 0 }), "#000000");
  assert.equal(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21);
  assert.equal(contrastRatio({ r: 10, g: 10, b: 10 }, { r: 10, g: 10, b: 10 }), 1);
});
