import { test } from "node:test";
import assert from "node:assert/strict";
import { MotionLoop, SPRINGS, Spring, dampingRatio, springEasing } from "./motion.ts";

const run = (s: Spring, seconds: number, dt = 1 / 60) => {
  const trace: number[] = [];
  for (let t = 0; t < seconds; t += dt) {
    s.step(dt);
    trace.push(s.value);
  }
  return trace;
};

test("a spring comes to rest exactly on its target", () => {
  for (const cfg of Object.values(SPRINGS)) {
    const s = new Spring(0, cfg);
    s.set(1);
    run(s, 3);
    assert.equal(s.value, 1);
    assert.equal(s.velocity, 0);
    assert.ok(s.settled);
  }
});

test("underdamped springs overshoot; smooth ones never do", () => {
  const b = new Spring(0, SPRINGS.bouncy);
  b.set(1);
  assert.ok(Math.max(...run(b, 2)) > 1.05, "bouncy should overshoot");
  const m = new Spring(0, SPRINGS.smooth);
  m.set(1);
  assert.ok(Math.max(...run(m, 2)) <= 1.0005, "smooth must not overshoot");
  assert.ok(dampingRatio(SPRINGS.bouncy) < 1 && dampingRatio(SPRINGS.smooth) > 1);
});

test("redirecting mid-flight keeps velocity: no jump in position", () => {
  const s = new Spring(0, SPRINGS.snappy);
  s.set(1);
  run(s, 0.08);
  const before = s.value;
  const v = s.velocity;
  assert.ok(v > 0);
  s.set(0); // change of mind
  s.step(1 / 240);
  assert.ok(Math.abs(s.value - before) <= (Math.abs(v) / 240) * 1.5 + 1e-6, "position moves by no more than velocity allows (no jump)");
  assert.ok(s.velocity < v, "but it starts slowing down");
});

test("a huge frame hitch cannot destabilise the simulation", () => {
  const s = new Spring(0, SPRINGS.snappy);
  s.set(10);
  s.step(5); // 5 seconds in one go
  assert.ok(Number.isFinite(s.value) && Number.isFinite(s.velocity));
  assert.ok(Math.abs(s.value) < 20);
  s.step(-1); // negative time is ignored
  assert.ok(Number.isFinite(s.value));
});

test("snap jumps with no leftover motion", () => {
  const s = new Spring(0);
  s.set(5);
  run(s, 0.05);
  s.snap(2);
  assert.equal(s.value, 2);
  assert.equal(s.velocity, 0);
  assert.ok(s.settled);
});

test("springEasing bakes the physics into a CSS linear() easing", () => {
  for (const cfg of Object.values(SPRINGS)) {
    const e = springEasing(cfg);
    assert.match(e.easing, /^linear\(0, .*, 1\)$/);
    assert.equal(e.values[0], 0);
    assert.equal(e.values.at(-1), 1);
    assert.ok(e.duration >= 120 && e.duration <= 1600, `duration ${e.duration}`);
    assert.ok(e.values.length >= 15 && e.values.length <= 65);
    assert.ok(e.values.every(Number.isFinite));
  }
  assert.ok(Math.max(...springEasing(SPRINGS.bouncy).values) > 1.05, "bouncy easing overshoots");
  assert.ok(Math.max(...springEasing(SPRINGS.smooth).values) <= 1.001, "smooth easing does not");
  assert.equal(springEasing(SPRINGS.soft), springEasing(SPRINGS.soft), "cached");
});

test("stiffer springs settle faster", () => {
  assert.ok(springEasing({ stiffness: 900, damping: 40 }).duration < springEasing({ stiffness: 120, damping: 20 }).duration);
});

test("loop runs tickers until they finish, then goes idle", () => {
  const l = new MotionLoop();
  let calls = 0;
  l.add((dt) => ++calls < 3 && dt >= 0);
  l.step(0.016);
  l.step(0.016);
  assert.equal(l.active, true);
  l.step(0.016);
  assert.equal(calls, 3);
  assert.equal(l.active, false);
});
