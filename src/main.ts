import "./style.css";
import "./iconMotion.css";
import { inTauri, installDevTrigger, invoke, listen } from "./bridge.ts";
import { h, icon } from "./dom.ts";
import { ic, UI_ICONS } from "./icons.ts";
import { placePanel, type Box, type Rect } from "./layout.ts";
import { ringSlots, type Settings, type Slot } from "./model.ts";
import { loop, motionLevel, setMotionLevel, springEasing } from "./motion.ts";
import { hitTest, renderRing, type RingView, type Slice } from "./ring.ts";
import { loadSettings } from "./settingsStore.ts";
import { applyAppearance } from "./themes.ts";
import { watchAlarms } from "./tools/clock.ts";
import { LIBRARY } from "./tools/registry.ts";
import type { Tool, ToolCtx } from "./tools/types.ts";

/**
 * The overlay: the quick-touch half of Wheelie. A fixed-size transparent window that shows
 * the ring while you hold the trigger and a tool panel after you choose. Everything that is
 * customised (themes, tools, startup) lives in the Wheelie app window, not here.
 */

const byId = new Map<string, Tool>(LIBRARY.map((t) => [t.id, t]));

const ringEl = document.getElementById("ring")!;
const panelEl = document.getElementById("panel")!;

type Mode = "idle" | "ring" | "panel";
interface OpenPayload {
  x: number;
  y: number;
  bx0: number;
  by0: number;
  bx1: number;
  by1: number;
}

let mode: Mode = "idle";
let settings: Settings = loadSettings();
let slices: Slice[] = [];
let shown: Slot[] = [];
let view: RingView | null = null;
let center = { x: 350, y: 350 };
let screenBox: Box = { x0: -1e5, y0: -1e5, x1: 1e5, y1: 1e5 };
let openedAt = 0;
let sticky = false;
let hover = -1;
let cleanup: void | (() => void);
let panelOpenedAt = 0;
/** While true (mic prompt, eyedropper...) losing focus must not close the panel. */
let pinned = false;
let enterTimer: number | undefined;
/** Bumped whenever something new opens, so a slow "closing" animation never hides a newer one. */
let epoch = 0;

/** A quick tap-and-release (under this) keeps the ring open instead of picking. */
const TAP_MS = 280;

const dpr = () => window.devicePixelRatio || 1;

function currentSlices(): Slice[] {
  shown = ringSlots(settings.slots).filter((s) => s.kind === "launch" || byId.has(s.id));
  return shown.map((s) => (s.kind === "tool" ? { id: s.id, name: byId.get(s.id)!.name, icon: s.id } : { id: s.id, name: s.name, icon: s.icon }));
}

function applySettings() {
  settings = loadSettings();
  applyAppearance(settings);
  setMotionLevel(settings.motion);
  void invoke("set_trigger_config", { keyboard: settings.keyboard, mouse: settings.mouse });
}

const ctx: ToolCtx = {
  hide: () => void hide(),
  settingsChanged: applySettings,
  keepOpen(on) {
    pinned = on;
  },
};

function setPlacement(p: OpenPayload) {
  const k = dpr();
  center = { x: p.x / k, y: p.y / k };
  const b = (v: number | undefined, fallback: number) => (typeof v === "number" ? v / k : fallback);
  screenBox = { x0: b(p.bx0, -1e5), y0: b(p.by0, -1e5), x1: b(p.bx1, 1e5), y1: b(p.by1, 1e5) };
}

// ----- leaving -----------------------------------------------------------------

function runPanelCleanup() {
  if (typeof cleanup === "function") cleanup();
  cleanup = undefined;
}

/** Fade the panel out with a small shrink. */
function animateOut(node: HTMLElement): Promise<void> {
  if (motionLevel() === "off") return Promise.resolve();
  const a = node.animate(
    [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.95)" },
    ],
    { duration: 150, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
  );
  return a.finished.then(() => undefined).catch(() => undefined);
}

async function hide() {
  if (mode === "idle") return;
  const was = mode;
  const mine = ++epoch;
  mode = "idle";
  pinned = false;
  sticky = false;
  runPanelCleanup();
  await (was === "panel" ? animateOut(panelEl) : view ? view.close() : Promise.resolve());
  if (mine !== epoch) return; // something opened while we were animating out
  view?.destroy();
  view = null;
  panelEl.replaceChildren();
  ringEl.hidden = true;
  panelEl.hidden = true;
  void invoke("hide_window");
}

// ----- ring ---------------------------------------------------------------

function openRing(p: OpenPayload) {
  epoch++;
  runPanelCleanup();
  panelEl.getAnimations().forEach((a) => a.cancel());
  panelEl.hidden = true;
  panelEl.replaceChildren();
  view?.destroy();
  pinned = false;
  setPlacement(p);
  slices = currentSlices();
  mode = "ring";
  openedAt = performance.now();
  sticky = false;
  hover = -1;
  ringEl.hidden = false;
  view = renderRing(ringEl, slices, center.x, center.y);
}

function pointerAt(x: number, y: number) {
  if (mode !== "ring" || !view) return;
  const dx = x - center.x;
  const dy = y - center.y;
  hover = hitTest(dx, dy, slices.length);
  view.setPointer(dx, dy);
  view.setHover(hover);
}

/** Run what is in a ring slot: open a tool panel, or launch an app/link and get out of the way. */
async function activate(index: number) {
  const slot = shown[index];
  const v = view;
  if (!slot || !v || mode !== "ring") return;
  const from = v.slicePoint(index);
  const committing = v.commit(index);
  if (slot.kind === "tool") {
    openTool(slot.id, from);
    await committing;
    if ((mode as Mode) === "panel" && view === v) {
      v.destroy();
      view = null;
      ringEl.hidden = true;
    }
    return;
  }
  void invoke("open_target", { target: slot.target });
  await committing;
  mode = "ring"; // hide() expects to be leaving something
  void hide();
}

function releaseRing() {
  if (mode !== "ring") return;
  if (hover >= 0) return void activate(hover);
  if (performance.now() - openedAt < TAP_MS) {
    // Quick tap: keep the ring up so you can click a tool or press its number.
    sticky = true;
    void invoke("focus_window");
    return;
  }
  void hide();
}

// ----- panels ---------------------------------------------------------------

/** Where the panel grows from: the chosen slice, or just the middle when opened without the ring. */
function animateIn(rect: Rect, from?: { x: number; y: number }) {
  const level = motionLevel();
  if (level === "off") return;
  const spring = springEasing({ stiffness: 480, damping: 29 }); // lively, settles in ~300ms
  const keyframes: Keyframe[] =
    from && level === "full"
      ? [
          { opacity: 0, transform: "scale(0.2)", borderRadius: "46px" },
          { opacity: 1, transform: "scale(1)", borderRadius: "14px" },
        ]
      : [
          { opacity: 0, transform: "translateY(12px) scale(0.965)" },
          { opacity: 1, transform: "none" },
        ];
  if (from && level === "full") panelEl.style.transformOrigin = `${(from.x - rect.x).toFixed(1)}px ${(from.y - rect.y).toFixed(1)}px`;
  else panelEl.style.transformOrigin = "50% 50%";
  panelEl.animate(keyframes, { duration: spring.duration, easing: spring.easing, fill: "backwards" });
  // The contents arrive a beat later, so the shape is seen to grow first.
  for (const child of Array.from(panelEl.children)) {
    child.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: from && level === "full" ? 110 : 40, easing: "ease-out", fill: "backwards" });
  }
}

function openTool(id: string, from?: { x: number; y: number }) {
  const tool = byId.get(id);
  if (!tool) return;
  epoch++;
  runPanelCleanup();
  mode = "panel";
  sticky = false;
  pinned = false;
  panelEl.hidden = false;
  panelEl.getAnimations().forEach((a) => a.cancel());
  panelOpenedAt = performance.now();

  const body = h("div", { class: "panel-body enter" });
  clearTimeout(enterTimer);
  enterTimer = window.setTimeout(() => body.classList.remove("enter"), 800); // stagger only the first paint, not later re-renders
  const headIcon = h("span", { class: "panel-icon anim-play" }, ic(tool.id, 18));
  setTimeout(() => headIcon.classList.remove("anim-play"), 1300); // the icon plays once as the panel opens
  panelEl.replaceChildren(
    h(
      "div",
      { class: "panel-head", "data-tauri-drag-region": "" },
      headIcon,
      h("span", { class: "panel-title" }, tool.name),
      h("button", { class: "icon-btn", title: "Close (Esc)", onClick: () => void hide() }, icon(UI_ICONS.close, 16)),
    ),
    body,
  );
  const rect = placePanel(center, { w: tool.size[0], h: tool.size[1] }, screenBox, { w: window.innerWidth, h: window.innerHeight });
  Object.assign(panelEl.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
  cleanup = tool.mount(body, ctx);
  animateIn(rect, from);
  void invoke("focus_window");
}

/** Open a tool without the ring (a timer went off). */
async function openToolCentered(id: string) {
  const p = await invoke<OpenPayload | null>("overlay_prepare");
  if (!p) return;
  setPlacement(p);
  ringEl.hidden = true;
  view?.destroy();
  view = null;
  openTool(id);
}

// ----- wiring -----------------------------------------------------------------

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mode !== "idle") {
    e.preventDefault();
    void hide();
    return;
  }
  if (mode === "ring" && /^[1-8]$/.test(e.key)) {
    // Swallow the keystroke: the tool we are about to open focuses an input,
    // and the key's default action would otherwise type the digit into it.
    e.preventDefault();
    const i = Number(e.key) - 1;
    if (i < slices.length) void activate(i);
  }
});

// While the key/button is held, pointer position comes from Rust (the window
// is not focused). Once focused (tap mode) the DOM events take over.
window.addEventListener("pointermove", (e) => pointerAt(e.clientX, e.clientY));

// In tap mode, click a slice to run it; clicking the hub or anywhere else closes the ring.
document.addEventListener("click", (e) => {
  if (mode !== "ring" || !sticky) return;
  const i = hitTest(e.clientX - center.x, e.clientY - center.y, slices.length);
  if (i >= 0) void activate(i);
  else void hide();
});

// Clicking outside the panel (the window around it is transparent) dismisses it.
document.addEventListener("pointerdown", (e) => {
  if (mode === "panel" && !panelEl.contains(e.target as Node) && performance.now() - panelOpenedAt > 250) void hide();
});

// Clicking another app dismisses the panel too (ignoring focus churn right after opening).
window.addEventListener("blur", () => {
  if (mode === "panel" && !pinned && performance.now() - panelOpenedAt > 500) void hide();
});

// Settings are changed in the Wheelie app window; pick them up live.
window.addEventListener("storage", (e) => {
  if (e.key === null || e.key === "wheelie:settings") applySettings();
});

void listen<OpenPayload>("ring:open", openRing);
void listen<{ x: number; y: number }>("ring:move", (p) => pointerAt(p.x / dpr(), p.y / dpr()));
void listen("ring:close", releaseRing);
void listen<string>("app:open-tool", (id) => void openToolCentered(id));

installDevTrigger();
// Browser-only: lets previews and tests step the springs by hand, frame by frame.
if (!inTauri) (window as any).__motion = { loop };
applySettings();
watchAlarms(() => void openToolCentered("clock"));
