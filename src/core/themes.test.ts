import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "./model.ts";
import { PALETTES, buildVars, effectiveAccent, luminance, onAccent } from "./themes.ts";

test("a theme uses its own accent until one is picked", () => {
  for (const p of PALETTES) assert.equal(effectiveAccent({ ...DEFAULT_SETTINGS, theme: p.id }), p.accent);
  assert.equal(effectiveAccent({ ...DEFAULT_SETTINGS, theme: "sunset", accent: "#123456" }), "#123456");
});

test("themes do not all share one accent", () => {
  assert.ok(new Set(PALETTES.map((p) => p.accent)).size >= PALETTES.length - 1);
});

test("luminance runs from black to white", () => {
  assert.equal(luminance("#000000"), 0);
  assert.ok(Math.abs(luminance("#ffffff") - 1) < 1e-9);
});

test("text on an accent is readable: white on deep colours, dark on pale ones", () => {
  assert.equal(onAccent("#5b6cff"), "#ffffff");
  assert.equal(onAccent("#e5e5e5"), "#14161b"); // Graphite
  assert.equal(onAccent("#facc15"), "#14161b"); // yellow
});

test("every theme and accent gets at least 3:1 contrast for its button text", () => {
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  for (const p of PALETTES) {
    const v = buildVars({ ...DEFAULT_SETTINGS, theme: p.id });
    assert.ok(ratio(v["--accent"], v["--on-accent"]) >= 3, `${p.id}: ${v["--accent"]} on ${v["--on-accent"]}`);
  }
});
