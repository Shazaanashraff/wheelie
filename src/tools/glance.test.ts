import { test } from "node:test";
import assert from "node:assert/strict";
import { clockText, fit, launchGlance, short, toolGlance, type Reader } from "./glance.ts";

const NOW = new Date("2026-03-01T12:00:00Z");
const reader = (data: Record<string, unknown>): Reader => ({ get: <T>(k: string, fb: T) => (k in data ? (data[k] as T) : fb) });
const T = (id: string, data: Record<string, unknown> = {}, extras = {}) => toolGlance(id, id, reader(data), NOW, extras);

test("a running timer shows the time left and how far through it is", () => {
  const g = T("clock", { "clock.cd": { endAt: NOW.getTime() + 90_000, total: 120, label: "", pomo: null } });
  assert.equal(g.value, "01:30");
  assert.equal(g.sub, "Timer");
  assert.ok(Math.abs(g.progress! - 0.25) < 1e-9);
  assert.equal(g.live, true);
});

test("a pomodoro says whether it is focus or break", () => {
  const focus = T("clock", { "clock.cd": { endAt: NOW.getTime() + 600_000, total: 1500, label: "", pomo: "focus" } });
  const rest = T("clock", { "clock.cd": { endAt: NOW.getTime() + 60_000, total: 300, label: "", pomo: "break" } });
  assert.equal(focus.sub, "Focus");
  assert.equal(rest.sub, "Break");
});

test("a finished or missing timer falls back to the stopwatch, then to Ready", () => {
  const sw = T("clock", { "clock.cd": { endAt: NOW.getTime() - 1, total: 60, label: "", pomo: null }, "clock.sw": { running: true, startedAt: NOW.getTime() - 65_000, acc: 0, laps: [] } });
  assert.equal(sw.value, "01:05");
  assert.equal(sw.sub, "Stopwatch");
  assert.equal(sw.progress, null);
  const paused = T("clock", { "clock.sw": { running: false, startedAt: 0, acc: 30_000, laps: [] } });
  assert.equal(paused.sub, "Stopwatch paused");
  assert.equal(T("clock").value, "Ready");
  assert.equal(T("clock").live, false);
});

test("timer progress stays between 0 and 1", () => {
  const g = T("clock", { "clock.cd": { endAt: NOW.getTime() + 5000, total: 1, label: "", pomo: null } });
  assert.ok(g.progress! >= 0 && g.progress! <= 1);
});

test("to-do shows what is left, with the finished fraction as progress", () => {
  const g = T("todo", { "todo.items": [{ done: true }, { done: true }, { done: false }, { done: false }] });
  assert.equal(g.value, "2 left");
  assert.equal(g.sub, "2 of 4 done");
  assert.equal(g.progress, 0.5);
  assert.equal(T("todo", { "todo.items": [{ done: true }] }).value, "All done");
  assert.equal(T("todo").value, "Empty");
  assert.equal(T("todo").progress, null);
});

test("the calculator shows the last result", () => {
  assert.equal(T("calc", { "calc.history": [{ expr: "2+2", result: "4" }] }).value, "4");
  assert.equal(T("calc").value, "Ready");
});

test("the unit converter shows its last conversion", () => {
  const g = T("units", { "units.state": { cat: "length", from: "m", to: "ft", value: "1" } });
  assert.equal(g.value, "3.2808 ft");
  assert.equal(g.sub, "from 1 m");
});

test("counts are pluralised properly", () => {
  assert.equal(T("links", { "links.items": [{}] }).value, "1 link");
  assert.equal(T("links", { "links.items": [{}, {}] }).value, "2 links");
  assert.equal(T("links").value, "No links");
});

test("notes and clipboard use the extras once they have arrived, and a placeholder before", () => {
  assert.equal(T("notes").value, "Notes");
  assert.equal(T("notes", {}, { notes: { count: 12, latest: "Project ideas" } }).value, "12 notes");
  assert.equal(T("notes", {}, { notes: { count: 12, latest: "Project ideas" } }).sub, "Project ideas");
  assert.equal(T("notes", {}, { notes: { count: 0, latest: "" } }).value, "No notes");
  assert.equal(T("clipboard", {}, { clip: "hello world" }).value, "hello world");
  assert.equal(T("clipboard").value, "History");
});

test("the world clock shows a live time in another zone", () => {
  const g = T("worldclock", { "worldclock.zones": ["Asia/Tokyo"] });
  assert.equal(g.value, "21:00");
  assert.equal(g.sub, "Tokyo");
  assert.equal(g.live, true);
});

test("launchers show where they go and when they open", () => {
  assert.equal(launchGlance("Docs", "https://www.example.com/a/b").value, "example.com");
  assert.equal(launchGlance("Notepad", "C:\\Windows\\notepad.exe").value, "notepad.exe");
  assert.equal(launchGlance("X", "notepad.exe").sub, "Opens on release");
});

test("long text is cut with an ellipsis so it fits the hub", () => {
  assert.equal(fit("short", 11), "short");
  assert.equal(fit("a very long clipboard entry", 11), "a very lon…");
  assert.ok(T("clipboard", {}, { clip: "x".repeat(100) }).value.length <= 11);
});

test("clock text rounds down and adds hours when needed", () => {
  assert.equal(clockText(59_999), "00:59");
  assert.equal(clockText(3_725_000), "1:02:05");
});

test("numbers are shortened for the hub", () => {
  assert.equal(short(3.28083989501), "3.2808");
  assert.equal(short(0), "0");
  assert.equal(short(1.5e12), "1.50e12");
  assert.equal(short(0.00002), "2.00e-5");
  assert.equal(short(NaN), "–");
});

test("a folder, a mail link and a Windows path all show something sensible", () => {
  assert.equal(launchGlance("Docs", "C:\\Users\\me\\Documents").value, "Documents");
  assert.equal(launchGlance("Mail", "mailto:a@b.co").value, "a@b.co");
});
