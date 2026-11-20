import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTranscript, formatClock, joinDictation } from "./dictationText.ts";

test("silence markers are removed", () => {
  assert.equal(cleanTranscript("[BLANK_AUDIO]"), "");
  assert.equal(cleanTranscript(" (silence) "), "");
  assert.equal(cleanTranscript("Hello [ Silence ] world"), "Hello world");
  assert.equal(cleanTranscript("[Music] Buy milk."), "Buy milk.");
});

test("real speech is left alone, including brackets with content", () => {
  assert.equal(cleanTranscript("  Call Sam   tomorrow. "), "Call Sam tomorrow.");
  assert.equal(cleanTranscript("The total is (roughly) five."), "The total is (roughly) five.");
});

test("joining dictation onto existing text", () => {
  assert.equal(joinDictation("", "Hello"), "Hello");
  assert.equal(joinDictation("Notes", "more"), " more");
  assert.equal(joinDictation("Line one\n", "Line two"), "Line two");
  assert.equal(joinDictation("ends with space ", "x"), "x");
  assert.equal(joinDictation("abc", ""), "");
});

test("clock", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(7_400), "0:07");
  assert.equal(formatClock(75_000), "1:15");
});
