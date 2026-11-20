import "./style.css";
import { installDevTrigger, invoke, listen } from "./bridge.ts";
import { h, icon } from "./dom.ts";
import { ICONS } from "./icons.ts";
import { hitTest, renderRing, type RingView, type Slice } from "./ring.ts";
import { loadSettings, type Settings } from "./store.ts";
import { apps } from "./tools/apps.ts";
import { calc } from "./tools/calc.ts";
import { clipboard } from "./tools/clipboard.ts";
import { clock, watchAlarms } from "./tools/clock.ts";
import { links } from "./tools/links.ts";
import { notes } from "./tools/notes.ts";
import { settingsTool } from "./tools/settings.ts";
import { todo } from "./tools/todo.ts";
import type { Tool, ToolCtx } from "./tools/types.ts";
import { units } from "./tools/units.ts";

const ALL: Tool[] = [calc, clock, notes, todo, clipboard, units, links, apps];
const byId = new Map<string, Tool>([...ALL, settingsTool].map((t) => [t.id, t]));

const ringEl = document.getElementById("ring")!;
const panelEl = document.getElementById("panel")!;

type Mode = "idle" | "ring" | "panel";
let mode: Mode = "idle";
let settings: Settings = loadSettings();
let slices: Slice[] = [];
let view: RingView | null = null;
let center = { x: 280, y: 280 };
let openedAt = 0;
let sticky = false;
let hover = -1;
let cleanup: void | (() => void);
let panelOpenedAt = 0;

/** A quick tap-and-release (under this) keeps the ring open instead of picking. */
const TAP_MS = 280;

const dpr = () => window.devicePixelRatio || 1;

function activeSlices(): Slice[] {
  return settings.order
    .filter((id) => !settings.disabled.includes(id) && byId.has(id))
    .slice(0, 8)
    .map((id) => ({ id, name: byId.get(id)!.name }));
}

function applySettings() {
  settings = loadSettings();
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.style.setProperty("--accent", settings.accent);
  void invoke("set_trigger_config", { keyboard: settings.keyboard, mouse: settings.mouse });
}

const ctx: ToolCtx = {
  hide,
  settingsChanged: applySettings,
};

function hide() {
  closePanelContent();
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
  panelEl.hidden = true;
  slices = activeSlices();
  center = { x: x / dpr(), y: y / dpr() };
  mode = "ring";
  openedAt = performance.now();
  sticky = false;
  hover = -1;
  view = renderRing(ringEl, slices, center.x, center.y);
  ringEl.hidden = false;
  ringEl.classList.remove("pop");
  void ringEl.offsetWidth; // restart the pop-in animation
  ringEl.classList.add("pop");
}

function pointerAt(x: number, y: number) {
  if (mode !== "ring" || !view) return;
  hover = hitTest(x - center.x, y - center.y, slices.length);
  view.setHover(hover);
}

function releaseRing() {
  if (mode !== "ring") return;
  if (hover >= 0) return openTool(slices[hover].id);
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
  ringEl.hidden = true;
  panelEl.hidden = false;
  panelOpenedAt = performance.now();

  const body = h("div", { class: "panel-body" });
  panelEl.replaceChildren(
    h(
      "div",
      { class: "panel-head", "data-tauri-drag-region": "" },
      h("span", { class: "panel-icon" }, icon(ICONS[tool.id] ?? ICONS.apps, 16)),
      h("span", { class: "panel-title" }, tool.name),
      h("button", { class: "icon-btn", title: "Close (Esc)", onClick: hide }, icon(ICONS.close, 16)),
    ),
    body,
  );
  panelEl.style.width = `${tool.size[0]}px`;
  panelEl.style.height = `${tool.size[1]}px`;
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
    if (i < slices.length) openTool(slices[i].id);
  }
});

// While the key/button is held, pointer position comes from Rust (the window
// is not focused). Once focused (tap mode) the DOM events take over.
window.addEventListener("pointermove", (e) => pointerAt(e.clientX, e.clientY));
// In tap mode, click a slice to open it; clicking the hub or anywhere else closes the ring.
document.addEventListener("click", (e) => {
  if (mode !== "ring" || !sticky) return;
  const i = hitTest(e.clientX - center.x, e.clientY - center.y, slices.length);
  if (i >= 0) openTool(slices[i].id);
  else hide();
});

// Clicking away from a panel dismisses it (ignore the focus churn right after opening).
window.addEventListener("blur", () => {
  if (mode === "panel" && performance.now() - panelOpenedAt > 500) hide();
});

void listen<{ x: number; y: number }>("ring:open", (p) => openRing(p.x, p.y));
void listen<{ x: number; y: number }>("ring:move", (p) => pointerAt(p.x / dpr(), p.y / dpr()));
void listen("ring:close", releaseRing);
void listen<string>("app:open-tool", (id) => openTool(id));

installDevTrigger();
applySettings();
watchAlarms(() => openTool("clock"));
