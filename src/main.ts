import "./style.css";
import "./iconMotion.css";
import { installDevTrigger, invoke, listen } from "./bridge.ts";
import { h } from "./dom.ts";
import { ic, UI_ICONS } from "./icons.ts";
import { icon } from "./dom.ts";
import { ringSlots, type Settings, type Slot } from "./model.ts";
import { hitTest, renderRing, type RingView, type Slice } from "./ring.ts";
import { loadSettings } from "./settingsStore.ts";
import { applyAppearance } from "./themes.ts";
import { watchAlarms } from "./tools/clock.ts";
import { LIBRARY } from "./tools/registry.ts";
import { settingsTool } from "./tools/settings.ts";
import type { Tool, ToolCtx } from "./tools/types.ts";

const byId = new Map<string, Tool>([...LIBRARY, settingsTool].map((t) => [t.id, t]));

const ringEl = document.getElementById("ring")!;
const panelEl = document.getElementById("panel")!;

type Mode = "idle" | "ring" | "panel";
let mode: Mode = "idle";
let settings: Settings = loadSettings();
let slices: Slice[] = [];
let shown: Slot[] = [];
let view: RingView | null = null;
let center = { x: 280, y: 280 };
let openedAt = 0;
let sticky = false;
let hover = -1;
let cleanup: void | (() => void);
let panelOpenedAt = 0;
/** While true (mic prompt, eyedropper...) losing focus must not close the panel. */
let pinned = false;
let enterTimer: number | undefined;

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
  void invoke("set_trigger_config", { keyboard: settings.keyboard, mouse: settings.mouse });
}

const ctx: ToolCtx = {
  hide,
  settingsChanged: applySettings,
  keepOpen(on) {
    pinned = on;
  },
};

function hide() {
  closePanelContent();
  pinned = false;
  mode = "idle";
  sticky = false;
  ringEl.hidden = true;
  panelEl.hidden = true;
  void invoke("hide_window");
}

function closePanelContent() {
  if (typeof cleanup === "function") cleanup();
  cleanup = undefined;
  panelEl.replaceChildren();
}

// ----- ring ---------------------------------------------------------------

function openRing(x: number, y: number) {
  closePanelContent();
  pinned = false;
  panelEl.hidden = true;
  slices = currentSlices();
  center = { x: x / dpr(), y: y / dpr() };
  mode = "ring";
  openedAt = performance.now();
  sticky = false;
  hover = -1;
  view = renderRing(ringEl, slices, center.x, center.y);
  ringEl.hidden = false;
  ringEl.classList.remove("pop");
  void ringEl.offsetWidth; // restart the entrance animation
  ringEl.classList.add("pop");
}

function pointerAt(x: number, y: number) {
  if (mode !== "ring" || !view) return;
  hover = hitTest(x - center.x, y - center.y, slices.length);
  view.setHover(hover);
}

/** Run what is in a ring slot: open a tool panel, or launch an app/link and get out of the way. */
function activate(index: number) {
  const slot = shown[index];
  if (!slot) return;
  if (slot.kind === "tool") return openTool(slot.id);
  void invoke("open_target", { target: slot.target });
  hide();
}

function releaseRing() {
  if (mode !== "ring") return;
  if (hover >= 0) return activate(hover);
  if (performance.now() - openedAt < TAP_MS) {
    // Quick tap: keep the ring up so you can click a tool or press its number.
    sticky = true;
    void invoke("focus_window");
    return;
  }
  hide();
}

// ----- panels ---------------------------------------------------------------

function openTool(id: string) {
  const tool = byId.get(id);
  if (!tool) return;
  closePanelContent();
  mode = "panel";
  sticky = false;
  pinned = false;
  ringEl.hidden = true;
  panelEl.hidden = false;
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
      h("button", { class: "icon-btn", title: "Close (Esc)", onClick: hide }, icon(UI_ICONS.close, 16)),
    ),
    body,
  );
  panelEl.style.width = `${tool.size[0]}px`;
  panelEl.style.height = `${tool.size[1]}px`;
  panelEl.classList.remove("rise");
  void panelEl.offsetWidth;
  panelEl.classList.add("rise");
  cleanup = tool.mount(body, ctx);
  void invoke("enter_panel", { w: tool.size[0] + 24, h: tool.size[1] + 24 });
}

// ----- wiring -----------------------------------------------------------------

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mode !== "idle") {
    e.preventDefault();
    hide();
    return;
  }
  if (mode === "ring" && /^[1-8]$/.test(e.key)) {
    // Swallow the keystroke: the tool we are about to open focuses an input,
    // and the key's default action would otherwise type the digit into it.
    e.preventDefault();
    const i = Number(e.key) - 1;
    if (i < slices.length) activate(i);
  }
});

// While the key/button is held, pointer position comes from Rust (the window
// is not focused). Once focused (tap mode) the DOM events take over.
window.addEventListener("pointermove", (e) => pointerAt(e.clientX, e.clientY));
// In tap mode, click a slice to run it; clicking the hub or anywhere else closes the ring.
document.addEventListener("click", (e) => {
  if (mode !== "ring" || !sticky) return;
  const i = hitTest(e.clientX - center.x, e.clientY - center.y, slices.length);
  if (i >= 0) activate(i);
  else hide();
});

// Clicking away from a panel dismisses it (ignore the focus churn right after opening).
window.addEventListener("blur", () => {
  if (mode === "panel" && !pinned && performance.now() - panelOpenedAt > 500) hide();
});

void listen<{ x: number; y: number }>("ring:open", (p) => openRing(p.x, p.y));
void listen<{ x: number; y: number }>("ring:move", (p) => pointerAt(p.x / dpr(), p.y / dpr()));
void listen("ring:close", releaseRing);
void listen<string>("app:open-tool", (id) => openTool(id));

installDevTrigger();
applySettings();
watchAlarms(() => openTool("clock"));
