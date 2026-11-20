import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS, DEFAULT_TOOL_ORDER, SLOT_COUNT, assignLaunch, assignTool, clearSlot, defaultSlots, migrate, moveSlot, normalizeSlots, ringSlots,
  type Slot,
} from "./model.ts";

const TOOLS = [...DEFAULT_TOOL_ORDER, "colors", "snippets", "passwords", "worldclock"];
const THEMES = ["dark", "light", "midnight"];
const ids = (s: (Slot | null)[]) => s.map((x) => (x ? x.id : null));

test("defaults: 8 slots, all tools", () => {
  assert.equal(defaultSlots().length, SLOT_COUNT);
  assert.deepEqual(ids(defaultSlots()), DEFAULT_TOOL_ORDER);
});

test("migration from the old order/disabled settings keeps the user's choices", () => {
  const old = { theme: "tinted", accent: "#ff0000", keyboard: "ctrl+alt+space", mouse: "x1", order: ["notes", "calc", "todo", "clock"], disabled: ["todo"] };
  const s = migrate(old, TOOLS, [...THEMES, "tinted"]);
  assert.deepEqual(ids(s.slots), ["notes", "calc", "clock", null, null, null, null, null]);
  assert.equal(s.theme, "tinted");
  assert.equal(s.accent, "#ff0000");
  assert.equal(s.keyboard, "ctrl+alt+space");
  assert.equal(s.mouse, "x1");
  assert.equal(s.motion, DEFAULT_SETTINGS.motion, "new settings get defaults");
});

test("migrate tolerates garbage and empty input", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const s = migrate(bad, TOOLS, THEMES);
    assert.deepEqual(ids(s.slots), DEFAULT_TOOL_ORDER);
    assert.equal(s.theme, "dark");
  }
  const s = migrate({ theme: "nope", accent: "red", motion: "wild", ringOpacity: 9, iconWeight: 3 }, TOOLS, THEMES);
  assert.equal(s.theme, "dark");
  assert.equal(s.accent, DEFAULT_SETTINGS.accent);
  assert.equal(s.motion, "full");
  assert.equal(s.ringOpacity, 1, "clamped");
  assert.equal(s.iconWeight, "regular");
});

test("normalizeSlots drops unknown/duplicate tools, pads to 8, never leaves fewer than 2", () => {
  const n = normalizeSlots([{ kind: "tool", id: "calc" }, { kind: "tool", id: "calc" }, { kind: "tool", id: "ghost" }, { kind: "tool", id: "notes" }], TOOLS);
  assert.deepEqual(ids(n), ["calc", null, null, "notes", null, null, null, null]);
  assert.deepEqual(ids(normalizeSlots([{ kind: "tool", id: "calc" }], TOOLS)), DEFAULT_TOOL_ORDER, "too few -> defaults");
  assert.equal(normalizeSlots(Array(20).fill({ kind: "tool", id: "calc" }), TOOLS).length, SLOT_COUNT);
});

test("launch slots survive normalisation; empty targets are dropped", () => {
  const n = normalizeSlots(
    [{ kind: "tool", id: "calc" }, { kind: "tool", id: "notes" }, { kind: "launch", id: "l1", name: "Chrome", target: "chrome.exe", icon: "globe" }, { kind: "launch", id: "l2", name: "x", target: "  ", icon: "star" }],
    TOOLS,
  );
  assert.deepEqual(n[2], { kind: "launch", id: "l1", name: "Chrome", target: "chrome.exe", icon: "globe", color: undefined });
  assert.equal(n[3], null);
});

test("assignTool swaps when the tool is already placed elsewhere", () => {
  const s = assignTool(defaultSlots(), 0, "notes"); // notes was at 2
  assert.deepEqual(ids(s).slice(0, 3), ["notes", "clock", "calc"]);
  assert.equal(new Set(ids(s)).size, 8, "no duplicates");
  assert.deepEqual(ids(assignTool(defaultSlots(), 0, "calc")), DEFAULT_TOOL_ORDER, "same slot: no change");
});

test("assignTool puts a library tool into a slot, replacing what was there", () => {
  const s = assignTool(defaultSlots(), 3, "colors");
  assert.equal(ids(s)[3], "colors");
  assert.ok(!ids(s).includes("todo"));
});

test("assignLaunch and clearSlot", () => {
  let s = assignLaunch(defaultSlots(), 7, { id: "l1", name: "Chrome", target: "chrome.exe", icon: "globe" });
  assert.equal(s[7]?.kind, "launch");
  s = clearSlot(s, 7);
  assert.equal(s[7], null);
  // cannot go below two slots
  let few = defaultSlots();
  for (let i = 0; i < 8; i++) few = clearSlot(few, i);
  assert.equal(ringSlots(few).length, 2);
});

test("moveSlot swaps neighbours and respects the ends", () => {
  assert.deepEqual(ids(moveSlot(defaultSlots(), 1, -1)).slice(0, 2), ["clock", "calc"]);
  assert.deepEqual(ids(moveSlot(defaultSlots(), 0, -1)), DEFAULT_TOOL_ORDER);
  assert.deepEqual(ids(moveSlot(defaultSlots(), 7, 1)), DEFAULT_TOOL_ORDER);
});

test("ringSlots skips empties and keeps order", () => {
  const s = assignTool([...defaultSlots()], 1, "colors");
  assert.equal(ringSlots(clearSlot(s, 0)).length, 7);
});

test("the default accent is empty, meaning 'use the theme's own'", () => {
  assert.equal(DEFAULT_SETTINGS.accent, "");
  assert.equal(migrate({ accent: "" }, TOOLS, THEMES).accent, "");
});

test("Wheelie starts in the dark theme, and an unknown or missing theme falls back to it", () => {
  assert.equal(DEFAULT_SETTINGS.theme, "dark");
  assert.equal(migrate({}, TOOLS, THEMES).theme, "dark");
  assert.equal(migrate({ theme: "nope" }, TOOLS, THEMES).theme, "dark");
});
