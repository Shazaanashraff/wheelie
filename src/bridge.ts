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

const SAMPLE_CLIPBOARD = [
  "https://example.com/some/long/link?with=params",
  "meeting notes: ship the radial menu on Friday",
  "const ring = new Wheel(8);",
];

async function devInvoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  devCalls.push({ cmd, args });
  if (cmd === "clipboard_history") return SAMPLE_CLIPBOARD;
  return undefined;
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
    emitDev("ring:open", pt(e));
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
    emitDev("ring:open", last.x || last.y ? last : { x: innerWidth / 2 * dpr, y: innerHeight / 2 * dpr });
  });
  window.addEventListener("keyup", (e) => {
    if (e.code !== "Space" || !held) return;
    held = false;
    emitDev("ring:close", null);
  });
}
