import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_OPTS, activeSets, clampLength, cryptoInt, entropyBits, generate, strengthLabel, type PassOpts } from "./passgen.ts";

const opts = (o: Partial<PassOpts> = {}): PassOpts => ({ ...DEFAULT_OPTS, ...o });

test("length and clamping", () => {
  assert.equal(generate(opts({ length: 24 })).length, 24);
  assert.equal(generate(opts({ length: 2 })).length, 8, "minimum 8");
  assert.equal(generate(opts({ length: 500 })).length, 64, "maximum 64");
  assert.equal(clampLength(NaN), 20);
});

test("every selected set is represented, every time", () => {
  for (let i = 0; i < 300; i++) {
    const p = generate(opts({ length: 8 }));
    assert.match(p, /[a-z]/);
    assert.match(p, /[A-Z]/);
    assert.match(p, /[0-9]/);
    assert.match(p, /[^a-zA-Z0-9]/);
  }
});

test("only characters from the chosen sets", () => {
  for (let i = 0; i < 100; i++) assert.match(generate(opts({ upper: false, symbols: false, length: 30 })), /^[a-z0-9]+$/);
  for (let i = 0; i < 100; i++) assert.match(generate(opts({ lower: false, upper: false, symbols: false })), /^[0-9]+$/);
});

test("ambiguous characters can be excluded", () => {
  for (let i = 0; i < 200; i++) assert.doesNotMatch(generate(opts({ avoidAmbiguous: true, length: 64 })), /[0Oo1lI|]/);
});

test("no sets selected -> empty string, not a crash", () => {
  assert.equal(generate(opts({ lower: false, upper: false, digits: false, symbols: false })), "");
  assert.deepEqual(activeSets(opts({ lower: false, upper: false, digits: false, symbols: false })), []);
});

test("rejection sampling is uniform (no modulo bias)", () => {
  // 3 does not divide 2^32, so a plain `% 3` would be (slightly) biased; check we land near 1/3 each.
  const counts = [0, 0, 0];
  const N = 30000;
  for (let i = 0; i < N; i++) counts[cryptoInt(3)]++;
  for (const c of counts) assert.ok(Math.abs(c / N - 1 / 3) < 0.02, `skewed: ${counts}`);
  assert.throws(() => cryptoInt(0));
});

test("shuffle: guaranteed characters are not always at the front", () => {
  let upperFirst = 0;
  for (let i = 0; i < 400; i++) if (/[a-z]/.test(generate(opts({ length: 8 }))[0])) upperFirst++;
  assert.ok(upperFirst < 400 && upperFirst > 50, "first char should vary across sets");
});

test("passwords are not repeated", () => {
  const seen = new Set(Array.from({ length: 500 }, () => generate(opts())));
  assert.equal(seen.size, 500);
});

test("entropy and strength", () => {
  assert.equal(entropyBits(opts({ length: 8, upper: false, symbols: false, digits: true })), Math.round(8 * Math.log2(36)));
  assert.equal(entropyBits(opts({ lower: false, upper: false, digits: false, symbols: false })), 0);
  assert.equal(strengthLabel(30), "Weak");
  assert.equal(strengthLabel(60), "Fair");
  assert.equal(strengthLabel(90), "Strong");
  assert.equal(strengthLabel(130), "Excellent");
});
