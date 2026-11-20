/**
 * Single seam between the UI and the Rust side.
 *
 * Inside Tauri these call the real commands/events. In a plain browser
 * (`npm run dev`) they are simulated, so the whole UI can be developed and
 * tested without Windows: hold the middle mouse button (or Space) to open
 * the ring, move to a slice, release.
 */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";

export const inTauri = "__TAURI_INTERNALS__" in window;

type Unlisten = () => void;
const bus = new EventTarget();

export function emitDev(event: string, detail: unknown): void {
  bus.dispatchEvent(new CustomEvent(event, { detail }));
}

/** Browser-only hooks for tests/inspection. */
if (!inTauri) (window as any).__emitDev = emitDev;

/** Calls made while running in a browser, for tests/inspection. */
export const devCalls: { cmd: string; args?: Record<string, unknown> }[] = [];
(window as any).__devCalls = devCalls;

/** The browser viewport stands in for the monitor. */
const viewportBounds = () => {
  const k = window.devicePixelRatio || 1;
  return { bx0: 0, by0: 0, bx1: innerWidth * k, by1: innerHeight * k };
};

let devAutostart = true;

const SAMPLE_CLIPBOARD = [
  "https://example.com/some/long/link?with=params",
  "meeting notes: ship the radial menu on Friday",
  "const ring = new Wheel(8);",
];

/** In-memory stand-in for the notes folder (the real app writes .txt files). */
const devNotes = new Map<string, { text: string; updated: number }>();
(window as any).__seedNotes = (items: { id: string; text: string; updated: number }[]) =>
  items.forEach((n) => devNotes.set(n.id, { text: n.text, updated: n.updated }));

function devTitlePreview(text: string): [string, string] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
  return [cut(lines[0] ?? "", 60), cut(lines.slice(1, 4).join(" "), 140)];
}

async function devInvoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  devCalls.push({ cmd, args });
  const id = args?.id as string;
  switch (cmd) {
    case "clipboard_history":
      return SAMPLE_CLIPBOARD;
    case "overlay_prepare": {
      const k = window.devicePixelRatio || 1;
      return { x: (innerWidth / 2) * k, y: (innerHeight / 2) * k, ...viewportBounds() };
    }
    case "autostart_get":
      return devAutostart;
    case "autostart_set":
      devAutostart = Boolean(args?.on);
      return undefined;
    case "app_version":
      return "0.4.0";
    case "notes_dir":
      return "C:\\Users\\you\\Documents\\Wheelie Notes";
    case "notes_list":
      return [...devNotes.entries()]
        .map(([nid, n]) => ({ id: nid, ...(([title, preview]) => ({ title, preview }))(devTitlePreview(n.text)), updated: n.updated }))
        .sort((a, b) => b.updated - a.updated);
    case "notes_read":
      return devNotes.get(id)?.text ?? "";
    case "notes_write":
      devNotes.set(id, { text: args?.text as string, updated: Date.now() });
      return undefined;
    case "notes_delete":
      devNotes.delete(id);
      return undefined;
    default:
      return undefined;
  }
}

export async function invoke<T = void>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (inTauri) return tauriInvoke<T>(cmd, args);
  return (await devInvoke(cmd, args)) as T;
}

export async function listen<T>(event: string, cb: (payload: T) => void): Promise<Unlisten> {
  if (inTauri) return tauriListen<T>(event, (e) => cb(e.payload));
  const handler = (e: Event) => cb((e as CustomEvent).detail as T);
  bus.addEventListener(event, handler);
  return () => bus.removeEventListener(event, handler);
}

/** Browser-only: emulate the hold gesture with the mouse / Space bar. */
export function installDevTrigger(): void {
  if (inTauri) return;
  const dpr = window.devicePixelRatio || 1;
  let held = false;
  // Same shape the Rust side sends: ring centre plus the screen bounds, in physical px.
  const open = (x: number, y: number) => ({ x: x * dpr, y: y * dpr, ...viewportBounds() });
  const pt = (e: MouseEvent) => ({ x: e.clientX * dpr, y: e.clientY * dpr });
  let last = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    last = pt(e);
    if (held) emitDev("ring:move", last);
  });
  window.addEventListener("mousedown", (e) => {
    if (e.button !== 1 || held) return;
    e.preventDefault();
    held = true;
    emitDev("ring:open", open(e.clientX, e.clientY));
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button !== 1 || !held) return;
    held = false;
    emitDev("ring:close", null);
  });
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat || held) return;
    if ((e.target as HTMLElement)?.matches?.("input,textarea,select,[contenteditable]")) return;
    e.preventDefault();
    held = true;
    emitDev("ring:open", last.x || last.y ? open(last.x / dpr, last.y / dpr) : open(innerWidth / 2, innerHeight / 2));
  });
  window.addEventListener("keyup", (e) => {
    if (e.code !== "Space" || !held) return;
    held = false;
    emitDev("ring:close", null);
  });
}
