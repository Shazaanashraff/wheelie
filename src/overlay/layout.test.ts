import { test } from "node:test";
import assert from "node:assert/strict";
import { placePanel } from "./layout.ts";

const win = { w: 700, h: 700 };
const full = { x0: -2000, y0: -2000, x1: 4000, y1: 4000 };

test("panel is centred when there is room", () => {
  const r = placePanel({ x: 350, y: 350 }, { w: 400, h: 500 }, full, win);
  assert.deepEqual(r, { x: 150, y: 100, w: 400, h: 500 });
});

test("panel is pulled back inside the screen near an edge", () => {
  // the screen's bottom edge is 240px below the window's centre
  const r = placePanel({ x: 350, y: 350 }, { w: 400, h: 500 }, { x0: -2000, y0: -2000, x1: 4000, y1: 590 }, win);
  assert.equal(r.y + r.h, 590 - 14, "bottom stays 14px above the screen edge");
  assert.equal(r.x, 150, "horizontal position untouched");
});

test("panel is pulled right of a left screen edge", () => {
  const r = placePanel({ x: 350, y: 350 }, { w: 400, h: 400 }, { x0: 300, y0: -2000, x1: 4000, y1: 4000 }, win);
  assert.equal(r.x, 314);
});

test("never leaves the window, even if the screen is larger", () => {
  const r = placePanel({ x: 900, y: 900 }, { w: 400, h: 400 }, full, win);
  assert.ok(r.x + r.w <= win.w - 14 && r.y + r.h <= win.h - 14);
  const l = placePanel({ x: -300, y: -300 }, { w: 400, h: 400 }, full, win);
  assert.ok(l.x >= 14 && l.y >= 14);
});

test("a panel bigger than the available space shows its top-left corner", () => {
  const r = placePanel({ x: 350, y: 350 }, { w: 600, h: 600 }, { x0: 100, y0: 100, x1: 500, y1: 500 }, win);
  assert.equal(r.x, 114);
  assert.equal(r.y, 114);
});
