import { test } from "node:test";
import assert from "node:assert/strict";
import { CURIOUS, GAZE_RANGE, blinkDelay, gaze, hopDelay, hopPixels, isDoubleBlink, pixelGaze, pointerTookOver } from "./mascotmath.ts";

test("with the pointer on top of it, the character looks straight ahead", () => {
  assert.deepEqual(gaze(0, 0), { x: 0, y: 0 });
});

test("it looks toward the pointer, in the same direction", () => {
  const g = gaze(50, -50);
  assert.ok(g.x > 0 && g.y < 0);
  assert.ok(Math.abs(g.x + g.y) < 1e-9, "equal and opposite for a 45 degree pointer");
});

test("it never turns further than 1, however far the pointer is", () => {
  for (const d of [GAZE_RANGE, GAZE_RANGE * 2, 5000]) {
    const g = gaze(d, 0);
    assert.ok(Math.hypot(g.x, g.y) <= 1 + 1e-9);
  }
  assert.equal(gaze(5000, 0).x, 1);
});

test("a nearby pointer already turns it noticeably, and more distance turns it more", () => {
  const near = Math.hypot(gaze(20, 0).x, gaze(20, 0).y);
  const far = Math.hypot(gaze(100, 0).x, gaze(100, 0).y);
  assert.ok(near > 0.2);
  assert.ok(far > near);
});

test("blinks and hops come at natural, bounded intervals", () => {
  assert.equal(blinkDelay(0), 2200);
  assert.ok(blinkDelay(0.999) < 5800);
  assert.equal(hopDelay(0), 6500);
  assert.ok(hopDelay(0.999) < 11500);
});

test("about one blink in five is a double", () => {
  assert.equal(isDoubleBlink(0.1), true);
  assert.equal(isDoubleBlink(0.5), false);
});

test("the curious look is in time order and ends facing forward", () => {
  const times = CURIOUS.map((c) => c.at);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.deepEqual({ x: CURIOUS.at(-1)!.x, y: CURIOUS.at(-1)!.y }, { x: 0, y: 0 });
});

test("a small pointer wobble does not interrupt the scripted look, a real move does", () => {
  assert.equal(pointerTookOver(3, 3), false);
  assert.equal(pointerTookOver(30, 0), true);
});

test("the pixel eyes move in whole pixels: nothing for a nudge, one pixel for a clear look", () => {
  assert.deepEqual(pixelGaze({ x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(pixelGaze({ x: 0.2, y: 0.1 }), { x: 0, y: 0 });
  assert.deepEqual(pixelGaze({ x: 0.9, y: 0 }), { x: 1, y: 0 });
  assert.deepEqual(pixelGaze({ x: -0.9, y: 0.2 }), { x: -1, y: 0 });
  assert.deepEqual(pixelGaze({ x: 0, y: -1 }), { x: 0, y: -1 });
  assert.deepEqual(pixelGaze({ x: 1, y: 1 }), { x: 1, y: 1 });
});

test("a hop is a whole number of pixels, never negative and never more than two", () => {
  assert.equal(hopPixels(0), 0);
  assert.equal(hopPixels(-0.4), 0);
  assert.equal(hopPixels(0.5), 1);
  assert.equal(hopPixels(1), 2);
  assert.equal(hopPixels(5), 2);
});
