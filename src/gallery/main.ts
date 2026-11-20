/**
 * Wheelie motion gallery: every motion in one page you can hover and click.
 * It is built from the app's real modules (the ring engine, icon set, spring
 * physics, panel motion and stylesheets), so what you see is what ships.
 */
import "../style.css";
import "../iconMotion.css";
import "../studio/studio.css";
import "./gallery.css";
import { h } from "../dom.ts";
import { ic, LAUNCH_ICONS, TOOL_ICONS } from "../icons.ts";
import { DEFAULT_SETTINGS, type Settings } from "../model.ts";
import { loop, setMotionLevel } from "../motion.ts";
import { panelIn, panelOut } from "../panelmotion.ts";
import type { Slice } from "../ring.ts";
import { ringPreview } from "../studio/preview.ts";
import { ACCENTS, PALETTES, applyAppearance } from "../themes.ts";
import { seg, toggle } from "../ui.ts";

(window as any).__motion = { loop };

let s: Settings = { ...DEFAULT_SETTINGS, iconColor: "colorful", iconStyle: "duotone" };
const apply = () => {
  applyAppearance(s);
  setMotionLevel(s.motion);
};
apply();

const SLICES: Slice[] = [
  { id: "calc", name: "Calculator", icon: "calc" },
  { id: "clock", name: "Clock", icon: "clock" },
  { id: "notes", name: "Notes", icon: "notes" },
  { id: "passwords", name: "Passwords", icon: "passwords" },
  { id: "colors", name: "Colours", icon: "colors" },
  { id: "worldclock", name: "World clock", icon: "worldclock" },
  { id: "snippets", name: "Snippets", icon: "snippets" },
  { id: "apps", name: "Apps", icon: "apps" },
];

const section = (title: string, blurb: string, ...body: Node[]) => h("section", { class: "gal-sec" }, h("h2", {}, title), h("p", {}, blurb), ...body);
const card = (...kids: Node[]) => h("div", { class: "gal-card" }, ...kids);

// ============ 1. the wheel =================================================
function wheel(): HTMLElement {
  const stage = h("div", { class: "gal-stage" });
  const stageWrap = h("div", { class: "gal-stage-wrap" }, stage);
  let host: HTMLElement | null = null;
  let busy = false;
  const preview = ringPreview({ size: 480, getSlices: () => SLICES, onSelect: (i) => void choose(i) });
  stage.append(preview.el);

  const reset = () => {
    host?.remove();
    host = null;
    busy = false;
    preview.refresh();
    preview.replay();
    preview.el.style.visibility = "visible";
  };
  const mockPanel = (i: number) => {
    const sl = SLICES[i];
    const w = 300, hh = 340;
    const el = h("div", { class: "gal-panel" });
    Object.assign(el.style, { left: `${240 - w / 2}px`, top: `${240 - hh / 2}px`, width: `${w}px`, height: `${hh}px` });
    el.append(
      h("div", { class: "panel-head" }, h("span", { class: "panel-icon" }, ic(sl.icon, 18)), h("span", { class: "panel-title" }, sl.name), h("button", { class: "icon-btn", onClick: () => void closePanel() }, ic("close", 16))),
      h("div", { class: "panel-body enter" }, h("div", { class: "gal-list stg" }, ...[0, 1, 2, 3, 4].map((k) => h("div", { class: "gal-li" }, h("i"), h("span", {}, `${sl.name} item ${k + 1}`))))),
    );
    return { el, rect: { x: 240 - w / 2, y: 240 - hh / 2 } };
  };
  async function choose(i: number) {
    if (busy) return;
    busy = true;
    const v = preview.view();
    if (!v) return;
    const from = v.slicePoint(i);
    const committing = v.commit(i);
    const { el, rect } = mockPanel(i);
    host = el;
    stage.append(el);
    panelIn(el, rect, from);
    await committing;
    preview.view()?.destroy();
  }
  async function closePanel() {
    if (!host) return;
    await panelOut(host);
    reset();
  }
  const cancel = async () => {
    if (busy) return;
    busy = true;
    await preview.view()?.close();
    reset();
  };

  // On a narrow screen the 480px stage shrinks to fit (everything inside scales with it).
  const fit = () => {
    const room = (stageWrap.parentElement?.parentElement?.clientWidth ?? 520) - 44;
    stageWrap.style.setProperty("--k", String(Math.max(0.5, Math.min(1, room / 480))));
  };
  new ResizeObserver(fit).observe(document.body);
  requestAnimationFrame(fit);

  return section(
    "1 · The wheel",
    "Move your mouse over the ring. Click a slice to choose it, and the panel grows out of that slice.",
    card(
      h(
        "div",
        { class: "gal-row" },
        stageWrap,
        h(
          "div",
          { class: "gal-side" },
          h("button", { class: "btn", onClick: reset }, "↻ Replay launch"),
          h("button", { class: "btn", onClick: () => void choose(3) }, "Choose “Passwords”"),
          h("button", { class: "btn", onClick: () => void cancel() }, "Cancel (release in the hub)"),
          h("button", { class: "btn", onClick: () => void closePanel() }, "Close the panel"),
          h(
            "p",
            { class: "gal-hint" },
            h("b", {}, "Launch: "), "slices bloom clockwise out of the centre with a soft blur-in.", h("br"),
            h("b", {}, "Hover: "), "the slice leans toward you and grows; neighbours are pulled a little, like the Dock; the ring tilts toward the pointer and a highlight follows it.", h("br"),
            h("b", {}, "Choose: "), "the slice pulses and dissolves into the panel growing out of it.",
          ),
        ),
      ),
    ),
  );
}

// ============ 2. icons ======================================================
function icons(): HTMLElement {
  const make = (set: Record<string, string>) => h("div", { class: "gal-icons" }, ...Object.keys(set).map((id) => h("button", { class: "gal-icon anim-host" }, ic(id, 42), h("span", {}, id))));
  const tools = make(TOOL_ICONS);
  const more = make(LAUNCH_ICONS);
  const all = (on: boolean) => [tools, more].forEach((g) => g.classList.toggle("anim-play", on));
  return section(
    "2 · Icons",
    `${Object.keys(TOOL_ICONS).length + Object.keys(LAUNCH_ICONS).length} hand-drawn icons. Hover each one, or switch on “Play all”. In the app they play while their slice is hovered.`,
    card(
      h("div", { class: "gal-sub" }, h("h3", {}, "Tool icons"), h("label", { class: "gal-bar-label", style: "display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px" }, "Play all", toggle(false, all, "Play all icons"))),
      tools,
      h("div", { class: "gal-sub" }, h("h3", {}, "Launcher icons (for apps, folders and links)")),
      more,
    ),
  );
}

// ============ 3. panels & lists ==============================================
function panels(): HTMLElement {
  const body = h("div", { class: "panel-body enter" });
  const list = h("div", { class: "gal-list stg" }, ...["Project ideas", "Groceries", "Meeting with Priya", "Book recommendations", "Trip ideas", "Weekend plan"].map((t) => h("div", { class: "gal-li" }, h("i"), h("span", {}, t))));
  body.append(list);
  const panel = h("div", { class: "gal-panel", style: "position:relative;width:min(340px,100%);height:400px;flex:none" }, h("div", { class: "panel-head" }, h("span", { class: "panel-icon" }, ic("notes", 18)), h("span", { class: "panel-title" }, "Notes"), ic("close", 16)), body);
  const cascade = () => {
    body.classList.remove("enter");
    void body.offsetWidth;
    body.classList.add("enter");
  };
  const rise = () => {
    panel.getAnimations().forEach((a) => a.cancel());
    panelIn(panel, { x: 0, y: 0 });
    cascade();
  };
  const out = async () => {
    await panelOut(panel);
    panel.getAnimations().forEach((a) => a.cancel());
  };
  return section(
    "3 · Panels and lists",
    "Panels spring into place and their rows cascade in one after another. Closing fades and shrinks a little.",
    card(
      h(
        "div",
        { class: "gal-row" },
        panel,
        h("div", { class: "gal-side" }, h("button", { class: "btn", onClick: rise }, "↻ Open panel"), h("button", { class: "btn", onClick: cascade }, "↻ Replay row cascade"), h("button", { class: "btn", onClick: () => void out() }, "Close panel"), h("p", { class: "gal-hint" }, "Row delay is 26ms per row. In “Subtle” the cascade is off, in “Off” everything is instant.")),
      ),
    ),
  );
}

// ============ 4. the app ===================================================
function app(): HTMLElement {
  const NAMES: [string, string][] = [["Home", "home"], ["Appearance", "colors"], ["Ring", "ring"], ["Library", "apps"], ["Voice", "voice"], ["General", "settings"]];
  const indicator = h("div", { class: "nav-indicator" });
  const buttons: HTMLButtonElement[] = [];
  const nav = h("nav", { class: "nav" }, indicator, ...NAMES.map(([label, icon], i) => {
    const b = h("button", { class: "nav-item anim-host", onClick: () => go(i) }, ic(icon, 20), h("span", {}, label));
    buttons.push(b);
    return b;
  }));
  const content = h("main", { class: "content" });
  const root = h("div", { class: "gal-app" }, h("aside", { class: "sidebar" }, h("div", { class: "brand" }, ic("ring", 22), h("span", {}, "Wheelie")), nav), content);
  function go(i: number) {
    buttons.forEach((b, k) => b.classList.toggle("on", k === i));
    indicator.style.height = `${buttons[i].offsetHeight}px`;
    indicator.style.transform = `translateY(${buttons[i].offsetTop}px)`;
    const page = h("div", { class: "gal-page" }, h("h1", { style: "margin:0;font-size:26px;letter-spacing:-.02em" }, NAMES[i][0]), h("div", { class: "card" }, h("b", {}, "A card"), h("p", { class: "hint", style: "margin:4px 0 0" }, "Sections rise in one after another on a spring.")), h("div", { class: "stats", style: "grid-template-columns:repeat(3,1fr)" }, ...[1, 2, 3].map((n) => h("div", { class: "stat" }, h("span", { class: "stat-big" }, String(n * 4)), h("span", { class: "stat-small" }, "stat")))));
    content.replaceChildren(page);
    const kids = Array.from(page.children) as HTMLElement[];
    const sp = getComputedStyle(document.documentElement).getPropertyValue("--spring");
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spring-ms")) || 440;
    if (s.motion !== "off") kids.forEach((el, k) => el.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: ms, easing: sp || "ease-out", delay: s.motion === "full" ? k * 45 : 0, fill: "backwards" }));
  }
  requestAnimationFrame(() => go(0));
  return section("4 · The Wheelie app", "Click through the sidebar: the highlight slides on a spring and each page rises in with its sections following one after another.", card(root, h("div", { class: "gal-sub" }, h("button", { class: "btn", onClick: () => go(0) }, "↻ Replay app launch"))));
}

// ============ 5. controls ===================================================
function controls(): HTMLElement {
  const bar = h("div", { class: "progress" }, h("div", { class: "progress-fill" }));
  const fill = bar.firstElementChild as HTMLElement;
  let pct = 0;
  const swatches = h("div", { class: "gal-swatches" }, ...ACCENTS.slice(0, 7).map((a) => h("button", { class: "swatch", style: `background:${a}`, "aria-label": a })));
  return section(
    "5 · Small controls",
    "Switches stretch and bounce, segmented controls highlight, bars ease, cards lift. Everything reacts the moment you touch it.",
    h(
      "div",
      { class: "gal-ctrls" },
      h("div", { class: "gal-ctrl" }, h("b", {}, "Switch (spring knob)"), h("div", { class: "row" }, toggle(false, () => {}, "Off"), toggle(true, () => {}, "On"))),
      h("div", { class: "gal-ctrl" }, h("b", {}, "Segmented control"), seg("a", [["a", "Full"], ["b", "Subtle"], ["c", "Off"]], () => {})),
      h("div", { class: "gal-ctrl" }, h("b", {}, "Progress"), bar, h("button", { class: "btn", onClick: () => ((pct = pct >= 100 ? 0 : Math.min(100, pct + 35)), (fill.style.width = pct + "%")) }, "Advance")),
      h("div", { class: "gal-ctrl" }, h("b", {}, "Accent swatches"), swatches),
      h("div", { class: "gal-ctrl" }, h("b", {}, "Stat card (hover, press)"), h("button", { class: "stat anim-host" }, h("span", { class: "stat-ic" }, ic("ring", 22)), h("span", { class: "stat-big" }, "8 of 8"), h("span", { class: "stat-small" }, "slots in use"))),
      h("div", { class: "gal-ctrl" }, h("b", {}, "Buttons"), h("div", { class: "row" }, h("button", { class: "btn" }, "Default"), h("button", { class: "btn primary" }, "Primary"), h("button", { class: "btn danger-btn" }, "Danger"))),
    ),
  );
}

// ============ 6. voice ======================================================
function voice(): HTMLElement {
  const N = 11;
  const bars = Array.from({ length: N }, () => h("span", { class: "vbar" }));
  const status = h("span", { class: "voice-status" }, "Listening…");
  const clock = h("span", { class: "voice-clock mono" }, "0:00");
  const bar = h("div", { class: "voice-bar", "data-state": "recording" }, h("span", { class: "rec-dot" }), h("span", { class: "vbars" }, ...bars), clock, status, h("span", { class: "grow" }), h("button", { class: "btn stop-btn" }, "Done"));
  const levels: number[] = Array(N).fill(0);
  let phase = 0;
  let t0 = performance.now();
  setInterval(() => {
    if (bar.dataset.state !== "recording") return;
    phase += 0.35;
    levels.push(Math.min(1, Math.max(0.05, 0.45 + 0.4 * Math.sin(phase) * Math.sin(phase * 0.37) + (Math.random() - 0.5) * 0.35)));
    levels.shift();
    bars.forEach((b, i) => (b.style.transform = `scaleY(${0.12 + levels[i] * 0.88})`));
    const sec = Math.floor((performance.now() - t0) / 1000);
    clock.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }, 60);
  const set = (state: string, text: string) => {
    bar.dataset.state = state;
    status.textContent = text;
    if (state === "recording") t0 = performance.now();
  };
  return section(
    "6 · Voice note bar",
    "While you speak, the bars follow your voice and the red dot pulses. Then it spins while transcribing.",
    card(h("div", { class: "gal-voice" }, bar), h("div", { class: "row", style: "margin-top:14px" }, h("button", { class: "btn", onClick: () => set("recording", "Listening…") }, "Listening"), h("button", { class: "btn", onClick: () => set("transcribing", "Transcribing…") }, "Transcribing"), h("button", { class: "btn", onClick: () => set("error", "Microphone is blocked.") }, "Error"))),
  );
}

// ============ 7. calculator =================================================
function keys(): HTMLElement {
  const defs: [string, string][] = [["C", "clear"], ["⌫", "util"], ["%", "op"], ["÷", "op"], ["7", "num"], ["8", "num"], ["9", "num"], ["×", "op"], ["4", "num"], ["5", "num"], ["6", "num"], ["−", "op"], ["1", "num"], ["2", "num"], ["3", "num"], ["+", "op"]];
  return section("7 · Calculator keys", "Keys shrink under your finger and brighten, on a spring, so they feel physical.", card(h("div", { class: "gal-keys" }, ...defs.map(([l, k]) => h("button", { class: `ckey ${k}` }, l)))));
}

// ============ page ============================================================
const bar = h(
  "div",
  { class: "gal-bar" },
  h("label", {}, "Theme", (() => { const el = h("select", { class: "input select" }, ...PALETTES.map((p) => h("option", { value: p.id }, p.name))); el.addEventListener("change", () => ((s = { ...s, theme: el.value, accent: PALETTES.find((p) => p.id === el.value)!.accent }), apply())); return el; })()),
  h("label", {}, "Motion", seg(s.motion, [["full", "Full"], ["subtle", "Subtle"], ["off", "Off"]], (v) => ((s = { ...s, motion: v }), apply()))),
  h("label", {}, "Icon colour", seg(s.iconColor, [["auto", "Theme"], ["accent", "Accent"], ["colorful", "Colourful"]], (v) => ((s = { ...s, iconColor: v }), apply()))),
  h("label", {}, "Style", seg(s.iconStyle, [["line", "Line"], ["duotone", "Duotone"]], (v) => ((s = { ...s, iconStyle: v }), apply()))),
);

document.getElementById("app")!.append(
  h(
    "div",
    { class: "gal" },
    h("header", { class: "gal-head" }, h("h1", {}, "Wheelie motion gallery"), h("p", {}, "Every animation in Wheelie, live. It is built from the app's own code, so what you see here is what runs. Use the bar to change the theme or turn motion down to Subtle or Off.")),
    ...(matchMedia("(prefers-reduced-motion: reduce)").matches ? [h("p", { class: "gal-note" }, "Your device asks for reduced motion, so animations are switched off on this page.")] : []),
    bar,
    wheel(),
    icons(),
    panels(),
    app(),
    controls(),
    voice(),
    keys(),
  ),
);
