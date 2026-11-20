import { test } from "node:test";
import assert from "node:assert/strict";
import { R_IN, R_OUT, hitTest, influence, polar, sliceAngle, sliceCenter } from "./ringmath.ts";

const at = (i: number, n: number, r = 150) => {
  const [x, y] = polar(r, sliceAngle(i, n));
  return { x, y };
};

test("hit testing: every slice is found at its own centre, hub is nothing", () => {
  for (const n of [2, 3, 5, 8]) for (let i = 0; i < n; i++) assert.equal(hitTest(at(i, n).x, at(i, n).y, n), i, `n=${n} i=${i}`);
  assert.equal(hitTest(0, 0, 8), -1);
  assert.equal(hitTest(R_IN - 1, 0, 8), -1);
  assert.equal(hitTest(0, 0, 0), -1);
  assert.equal(hitTest(0, -150, 8), 0, "straight up is slice 0");
  assert.equal(hitTest(150, 0, 8), 2, "straight right is slice 2 of 8");
});

test("slice centres sit between the hub and the rim", () => {
  for (let i = 0; i < 8; i++) {
    const { x, y } = sliceCenter(i, 8);
    const r = Math.hypot(x, y);
    assert.ok(r > R_IN && r < R_OUT);
  }
  assert.ok(sliceCenter(0, 8).y < 0 && Math.abs(sliceCenter(0, 8).x) < 1e-9);
});

test("influence: peaks on the pointed slice, tapers to neighbours, none in the hub", () => {
  const w = influence(at(2, 8).x, at(2, 8).y, 8);
  assert.ok(w[2] > 0.99);
  assert.ok(w[1] > 0.1 && w[1] < 0.3, "neighbours get a little");
  assert.ok(Math.abs(w[1] - w[3]) < 1e-9, "symmetric");
  assert.ok(w[6] < 0.001 && w[4] < 0.001, "slices two or more away get nothing");
  assert.ok(influence(0, 0, 8).every((v) => v === 0));
  assert.ok(influence(10, 10, 8).every((v) => v === 0));
});

test("influence eases in as the pointer leaves the hub (no pop)", () => {
  const near = influence(0, -(R_IN + 5), 8)[0];
  const far = influence(0, -(R_IN + 60), 8)[0];
  assert.ok(near > 0 && near < far);
  assert.ok(far > 0.99);
});

test("influence between two slices is shared evenly", () => {
  const n = 8;
  const mid = (sliceAngle(0, n) + sliceAngle(1, n)) / 2;
  const [x, y] = polar(150, mid);
  const w = influence(x, y, n);
  assert.ok(Math.abs(w[0] - w[1]) < 1e-9);
  assert.ok(w[0] > 0.3 && w[0] < 0.7);
});

test("handles any slice count", () => {
  for (const n of [1, 2, 7]) assert.equal(influence(0, -150, n).length, n);
});
