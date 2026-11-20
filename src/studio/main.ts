import "../styles/base.css";
import { wheelieMark } from "../overlay/mark.ts";
import "../styles/icons.css";
import "./studio.css";
import { invoke } from "../core/bridge.ts";
import { h } from "../core/dom.ts";
import { ic } from "../core/icons.ts";
import type { Settings } from "../core/model.ts";
import { SPRINGS, motionLevel, setMotionLevel, springEasing } from "../core/motion.ts";
import { loadSettings, saveSettings } from "../core/settingsStore.ts";
import { applyAppearance } from "../core/themes.ts";
import "../tools/registry.ts"; // registers the tool ids before settings are read
import type { Page, PageId, StudioCtx } from "./ctx.ts";
import { appearance } from "./pages/appearance.ts";
import { general } from "./pages/general.ts";
import { home } from "./pages/home.ts";
import { library } from "./pages/library.ts";
import { ringPage } from "./pages/ring.ts";
import { voicePage } from "./pages/voice.ts";

/**
 * The Wheelie app window: everything that is customised lives here. It starts with Windows,
 * sits in the tray, and the overlay (the wheel itself) picks up every change live.
 */

const PAGES: { id: PageId; label: string; icon: string; build: (c: StudioCtx) => Page }[] = [
  { id: "home", label: "Home", icon: "home", build: home },
  { id: "appearance", label: "Appearance", icon: "colors", build: appearance },
  { id: "ring", label: "Ring", icon: "ring", build: ringPage },
  { id: "library", label: "Library", icon: "apps", build: library },
  { id: "voice", label: "Voice", icon: "voice", build: voicePage },
  { id: "general", label: "General", icon: "settings", build: general },
];

let settings: Settings = loadSettings();
const applyAll = () => {
  applyAppearance(settings);
  setMotionLevel(settings.motion);
};
applyAll();
void invoke("set_trigger_config", { keyboard: settings.keyboard, mouse: settings.mouse });

const ctx: StudioCtx = {
  get settings() {
    return settings;
  },
  update(patch) {
    settings = { ...settings, ...patch };
    saveSettings(settings); // the overlay window hears this through a storage event
    applyAll();
    if (patch.keyboard !== undefined || patch.mouse !== undefined) void invoke("set_trigger_config", { keyboard: settings.keyboard, mouse: settings.mouse });
  },
  go: (id) => show(id),
};

// ---- shell -----------------------------------------------------------------
const indicator = h("div", { class: "nav-indicator" });
const navButtons = new Map<PageId, HTMLButtonElement>();
const nav = h(
  "nav",
  { class: "nav" },
  indicator,
  ...PAGES.map((p) => {
    const b = h("button", { class: "nav-item anim-host", onClick: () => show(p.id) }, ic(p.icon, 20), h("span", {}, p.label));
    navButtons.set(p.id, b);
    return b;
  }),
);
const content = h("main", { class: "content" });
document.getElementById("app")!.append(
  h("aside", { class: "sidebar" }, h("div", { class: "brand" }, wheelieMark(3), h("span", {}, "Wheelie")), nav, h("div", { class: "side-foot" }, h("i", { class: "pulse" }), "Wheel is running")),
  content,
);

let current: Page | null = null;
let currentId: PageId | null = null;

function moveIndicator(id: PageId) {
  const b = navButtons.get(id)!;
  indicator.style.height = `${b.offsetHeight}px`;
  indicator.style.transform = `translateY(${b.offsetTop}px)`;
}

function show(id: PageId) {
  if (id === currentId) return;
  currentId = id;
  history.replaceState(null, "", `#/${id}`);
  navButtons.forEach((b, k) => b.classList.toggle("on", k === id));
  moveIndicator(id);
  current?.destroy?.();
  current = PAGES.find((p) => p.id === id)!.build(ctx);
  content.replaceChildren(current.el);
  content.scrollTop = 0;
  if (motionLevel() === "off") return;
  // The page rises into place on a spring, and its sections follow one after another.
  const spring = springEasing(SPRINGS.soft);
  const sections = Array.from(current.el.children) as HTMLElement[];
  sections.forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: spring.duration, easing: spring.easing, delay: motionLevel() === "full" ? i * 45 : 0, fill: "backwards" }));
}

const fromHash = (): PageId => {
  const id = location.hash.replace("#/", "") as PageId;
  return PAGES.some((p) => p.id === id) ? id : "home";
};
show(fromHash());
requestAnimationFrame(() => moveIndicator(currentId!));
window.addEventListener("resize", () => currentId && moveIndicator(currentId));
