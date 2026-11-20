import { test } from "node:test";
import assert from "node:assert/strict";
import { CITIES, describeDifference, dayRelation, offsetMinutes } from "./timezones.ts";

const winter = new Date("2026-01-15T12:00:00Z");
const summer = new Date("2026-07-15T12:00:00Z");

test("fixed offsets", () => {
  assert.equal(offsetMinutes("UTC", winter), 0);
  assert.equal(offsetMinutes("Asia/Kolkata", winter), 330);
  assert.equal(offsetMinutes("Asia/Colombo", winter), 330);
  assert.equal(offsetMinutes("Asia/Tokyo", winter), 540);
  assert.equal(offsetMinutes("Asia/Dubai", winter), 240);
});

test("daylight saving is respected", () => {
  assert.equal(offsetMinutes("Europe/London", winter), 0);
  assert.equal(offsetMinutes("Europe/London", summer), 60);
  assert.equal(offsetMinutes("America/New_York", winter), -300);
  assert.equal(offsetMinutes("America/New_York", summer), -240);
  assert.equal(offsetMinutes("Australia/Sydney", winter), 660);
  assert.equal(offsetMinutes("Australia/Sydney", summer), 600);
});

test("fractional-hour zones in the difference text", () => {
  assert.equal(describeDifference(0), "same time");
  assert.equal(describeDifference(330), "+5h 30m");
  assert.equal(describeDifference(-300), "-5h");
  assert.equal(describeDifference(-570), "-9h 30m");
});

test("day relation across the date line", () => {
  const t = new Date("2026-03-10T20:00:00Z");
  assert.equal(dayRelation("Pacific/Auckland", "America/Los_Angeles", t), "tomorrow");
  assert.equal(dayRelation("America/Los_Angeles", "Pacific/Auckland", t), "yesterday");
  assert.equal(dayRelation("Europe/London", "Europe/Paris", new Date("2026-03-10T12:00:00Z")), "today");
});

test("every built-in city has a valid zone", () => {
  for (const c of CITIES) assert.doesNotThrow(() => offsetMinutes(c.tz, winter), c.name);
  assert.equal(new Set(CITIES.map((c) => c.name)).size, CITIES.length, "no duplicate names");
});
