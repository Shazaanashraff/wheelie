import { invoke } from "../bridge.ts";
import { h, icon, uid } from "../dom.ts";
import { ic, LAUNCH_ICON_IDS, UI_ICONS } from "../icons.ts";
import {
  DEFAULT_SETTINGS, SLOT_COUNT, assignLaunch, assignTool, clearSlot, defaultSlots, moveSlot, ringSlots, type IconColor, type IconStyle, type IconWeight, type Motion, type Settings, type Slot, type VoiceModel,
} from "../model.ts";
import { loadSettings, saveSettings } from "../settingsStore.ts";
import { ACCENTS, PALETTES } from "../themes.ts";
import { voice } from "../voice/engine.ts";
import { VOICE_MODELS, isModelReady } from "../voice/models.ts";
import { LIBRARY, toolById } from "./registry.ts";
import type { Tool } from "./types.ts";

type TabId = "look" | "ring" | "voice" | "general";

export const settingsTool: Tool = {
  id: "settings",
  name: "Settings",
  desc: "Themes, tools in the ring, voice and triggers",
  size: [460, 660],
  mount(root, ctx) {
    let s: Settings = loadSettings();
    let tab: TabId = "look";
    let picking: number | null = null; // slot index being changed
    const apply = () => {
      saveSettings(s);
      void invoke("set_trigger_config", { keyboard: s.keyboard, mouse: s.mouse });
      ctx.settingsChanged();
    };

    // ---------- small building blocks ----------
    function seg<T extends string>(value: T, options: [T, string][], onChange: (v: T) => void) {
      const wrap = h("div", { class: "seg" });
      const draw = (cur: T) =>
        wrap.replaceChildren(...options.map(([v, label]) => h("button", { class: "seg-btn" + (v === cur ? " on" : ""), onClick: () => (onChange(v), draw(v)) }, label)));
      draw(value);
      return wrap;
    }
    const field = (label: string, control: Node, hint?: string) =>
      h("div", { class: "field" }, h("span", { class: "field-label" }, label), control, hint ? h("span", { class: "hint" }, hint) : null);
    const section = (title: string) => h("h3", {}, title);

    const body = h("div", { class: "settings" });
    const tabs = h("div", { class: "tabs set-tabs" });

    // ---------- LOOK ----------
    function look(): Node[] {
      const preview = h("div", { class: "icon-preview" });
      const drawPreview = () =>
        preview.replaceChildren(...["calc", "clock", "notes", "todo", "clipboard", "units", "links", "apps", "colors", "snippets", "passwords", "worldclock"].map((id) => h("span", { class: "anim-host prev-ic", title: id }, ic(id, 26))));
      drawPreview();

      const themeGrid = h(
        "div",
        { class: "theme-grid" },
        ...PALETTES.map((p) =>
          h(
            "button",
            {
              class: "theme-card" + (p.id === s.theme ? " on" : ""),
              title: p.name,
              onClick: () => ((s = { ...s, theme: p.id }), apply(), render()),
              style: `--c-bg:${p.id === "tinted" ? "#1b1d2c" : p.bg};--c-bg3:${p.id === "tinted" ? "#2a2e4a" : p.bg3};--c-fg:${p.fg};`,
            },
            h("span", { class: "theme-sample" }, h("i", { style: "background:var(--c-fg);opacity:.9" }), h("i", { style: "background:var(--c-fg);opacity:.45" }), h("i", { style: `background:${s.accent}` })),
            h("span", { class: "theme-name" }, p.name),
          ),
        ),
      );

      const accentCustom = h("input", { type: "color", class: "color", value: s.accent });
      accentCustom.addEventListener("input", () => {
        s = { ...s, accent: accentCustom.value };
        apply();
        themeGrid.querySelectorAll<HTMLElement>(".theme-sample i:last-child").forEach((i) => (i.style.background = s.accent));
      });
      const swatches = h(
        "div",
        { class: "swatches" },
        ...ACCENTS.map((a) => h("button", { class: "swatch" + (a.toLowerCase() === s.accent.toLowerCase() ? " on" : ""), style: `background:${a}`, title: a, onClick: () => ((s = { ...s, accent: a }), apply(), render()) })),
        accentCustom,
      );

      const opacity = h("input", { type: "range", class: "range", min: "55", max: "100", value: String(Math.round(s.ringOpacity * 100)) });
      opacity.addEventListener("input", () => ((s = { ...s, ringOpacity: Number(opacity.value) / 100 }), apply()));

      return [
        section("Theme"),
        themeGrid,
        section("Accent colour"),
        swatches,
        section("Icons"),
        preview,
        field("Colour", seg<IconColor>(s.iconColor, [["auto", "Match theme"], ["accent", "Accent"], ["colorful", "Colourful"]], (v) => ((s = { ...s, iconColor: v }), apply(), drawPreview()))),
        field("Style", seg<IconStyle>(s.iconStyle, [["line", "Line"], ["duotone", "Duotone"]], (v) => ((s = { ...s, iconStyle: v }), apply()))),
        field("Weight", seg<IconWeight>(s.iconWeight, [["thin", "Thin"], ["regular", "Regular"], ["bold", "Bold"]], (v) => ((s = { ...s, iconWeight: v }), apply()))),
        section("Motion"),
        field("Animations", seg<Motion>(s.motion, [["full", "Full"], ["subtle", "Subtle"], ["off", "Off"]], (v) => ((s = { ...s, motion: v }), apply())), "Hover over the icons above to see them move."),
        field("Ring transparency", opacity, "Lower values let your desktop show through the ring."),
      ];
    }

    // ---------- RING (slots + library) ----------
    const slotLabel = (slot: Slot | null): { name: string; iconId: string } =>
      !slot ? { name: "Empty", iconId: "" } : slot.kind === "tool" ? { name: toolById(slot.id)?.name ?? slot.id, iconId: slot.id } : { name: slot.name, iconId: slot.icon };

    function ringTab(): Node[] {
      if (picking !== null) return picker(picking);
      const total = ringSlots(s.slots).length;
      return [
        h("p", { class: "hint lead" }, `The ring has ${SLOT_COUNT} slots. Each can hold a tool from the library or launch an app or link directly. ${total} in use.`),
        h(
          "div",
          { class: "slot-list stg" },
          ...s.slots.map((slot, i) => {
            const { name, iconId } = slotLabel(slot);
            return h(
              "div",
              { class: "slot-row anim-host" + (slot ? "" : " empty-slot") },
              h("span", { class: "slot-n" }, String(i + 1)),
              h("span", { class: "slot-ic" }, iconId ? ic(iconId, 22) : ""),
              h("span", { class: "slot-name" }, name, slot?.kind === "launch" ? h("span", { class: "slot-tag" }, "launcher") : null),
              h("button", { class: "btn slot-change", onClick: () => ((picking = i), render()) }, slot ? "Change" : "Choose"),
              h("button", { class: "icon-btn", title: "Move up", disabled: i === 0, onClick: () => ((s = { ...s, slots: moveSlot(s.slots, i, -1) }), apply(), render()) }, "↑"),
              h("button", { class: "icon-btn", title: "Move down", disabled: i === SLOT_COUNT - 1, onClick: () => ((s = { ...s, slots: moveSlot(s.slots, i, 1) }), apply(), render()) }, "↓"),
              h("button", { class: "icon-btn", title: !slot ? "" : total <= 2 ? "Keep at least 2 slots" : "Empty this slot", disabled: !slot || total <= 2, onClick: () => ((s = { ...s, slots: clearSlot(s.slots, i) }), apply(), render()) }, icon(UI_ICONS.close, 13)),
            );
          }),
        ),
      ];
    }

    function picker(index: number): Node[] {
      const inRing = (id: string) => s.slots.findIndex((x) => x?.kind === "tool" && x.id === id);
      const pick = (next: Settings["slots"]) => {
        s = { ...s, slots: next };
        picking = null;
        apply();
        render();
      };

      // launcher form
      let chosen = "rocket";
      const name = h("input", { class: "input", placeholder: "Name, e.g. Chrome" });
      const target = h("input", { class: "input", placeholder: String.raw`App path, folder or link, e.g. C:\Program Files\App\app.exe or https://...` });
      const err = h("div", { class: "form-error" });
      const iconRow = h("div", { class: "icon-pick" });
      const drawIcons = () =>
        iconRow.replaceChildren(...LAUNCH_ICON_IDS.map((id) => h("button", { class: "anim-host pick-ic" + (id === chosen ? " on" : ""), title: id, onClick: () => ((chosen = id), drawIcons()) }, ic(id, 22))));
      drawIcons();
      const add = () => {
        const t = target.value.trim().replace(/^"|"$/g, "");
        if (!t) {
          err.textContent = "Enter a path or link to launch.";
          return;
        }
        const base = t.split(/[\\/]/).pop() ?? t;
        pick(assignLaunch(s.slots, index, { id: "l-" + uid(), name: name.value.trim() || base.replace(/\.[a-z0-9]+$/i, "") || "Launcher", target: t, icon: chosen }));
      };

      return [
        h("div", { class: "row" }, h("button", { class: "btn back", onClick: () => ((picking = null), render()) }, "‹ Back"), h("span", { class: "grow hint" }, `Choose what goes in slot ${index + 1}`)),
        section("Tool library"),
        h(
          "div",
          { class: "lib-grid stg" },
          ...LIBRARY.map((t) => {
            const at = inRing(t.id);
            const here = at === index;
            return h(
              "button",
              { class: "lib-card anim-host" + (here ? " on" : ""), onClick: () => pick(assignTool(s.slots, index, t.id)) },
              h("span", { class: "lib-ic" }, ic(t.id, 30)),
              h("span", { class: "lib-name" }, t.name),
              h("span", { class: "lib-desc" }, t.desc),
              at >= 0 ? h("span", { class: "lib-badge" }, here ? "Here" : `Slot ${at + 1}`) : null,
            );
          }),
        ),
        section("Launch an app, folder or link"),
        h("div", { class: "stack" }, name, target, iconRow, err, h("button", { class: "btn primary", onClick: add }, "Use as launcher")),
        h("p", { class: "hint" }, "A launcher runs straight away when you release over it. No panel opens."),
      ];
    }

    // ---------- VOICE ----------
    function voiceTab(): Node[] {
      const info = h("div", { class: "hint" });
      const dl = h("button", { class: "btn" }, "Download now");
      const draw = () => {
        const ready = isModelReady(s.voiceModel);
        info.textContent = ready ? "Ready. Works offline." : "Not downloaded yet. It downloads once (needs internet), then works offline.";
        dl.hidden = ready;
      };
      dl.addEventListener("click", async () => {
        dl.setAttribute("disabled", "");
        try {
          await voice.load(s.voiceModel, (p) => (dl.textContent = `Downloading ${p}%…`));
          dl.textContent = "Download now";
        } catch {
          info.textContent = "Couldn't download. Check your internet connection and try again.";
        }
        dl.removeAttribute("disabled");
        render();
      });
      const list = h(
        "div",
        { class: "model-list" },
        ...VOICE_MODELS.map((m) =>
          h(
            "button",
            {
              class: "model-card" + (m.id === s.voiceModel ? " on" : ""),
              onClick: () => ((s = { ...s, voiceModel: m.id as VoiceModel }), apply(), render()),
            },
            h("span", { class: "model-radio" }),
            h("span", { class: "model-main" }, h("span", { class: "model-name" }, m.label), h("span", { class: "hint" }, `${m.note} · ${m.size}`)),
            isModelReady(m.id) ? h("span", { class: "lib-badge ok" }, "Ready") : null,
          ),
        ),
      );
      draw();
      return [
        h("p", { class: "hint lead" }, "Dictate notes by voice. Speech is turned into text on this PC by a small model. Your audio is never uploaded or saved, only the text you get."),
        section("Speech model"),
        list,
        info,
        dl,
        section("Tip"),
        h("p", { class: "hint" }, "Press the mic in a note, speak, then press Done. The first time, Windows may ask to allow microphone access."),
      ];
    }

    // ---------- GENERAL ----------
    function general(): Node[] {
      const sel = <T extends string>(value: T, options: [T, string][], onChange: (v: T) => void) => {
        const el = h("select", { class: "input" }, ...options.map(([v, l]) => h("option", { value: v, selected: v === value }, l)));
        el.addEventListener("change", () => onChange(el.value as T));
        return el;
      };
      return [
        section("Open the ring"),
        field(
          "Keyboard (hold)",
          sel(s.keyboard, [["alt+space", "Alt + Space"], ["ctrl+alt+space", "Ctrl + Alt + Space"], ["off", "Off"]], (v) => ((s = { ...s, keyboard: v }), apply())),
          "Wheelie suppresses the Windows window menu while you hold it.",
        ),
        field(
          "Mouse (hold)",
          sel(s.mouse, [["middle", "Middle button"], ["x1", "Side button 1 (back)"], ["x2", "Side button 2 (forward)"], ["off", "Off"]], (v) => ((s = { ...s, mouse: v }), apply())),
          "The chosen button no longer works as normal in other apps.",
        ),
        section("Reset"),
        h("button", { class: "btn danger-btn", onClick: () => ((s = { ...DEFAULT_SETTINGS, slots: defaultSlots() }), (picking = null), apply(), render()) }, "Reset all settings"),
        h("p", { class: "hint" }, "Quit Wheelie from its tray icon."),
      ];
    }

    // ---------- shell ----------
    const TABS: [TabId, string][] = [["look", "Look"], ["ring", "Ring"], ["voice", "Voice"], ["general", "General"]];
    function render() {
      tabs.replaceChildren(...TABS.map(([id, label]) => h("button", { class: "tab" + (id === tab ? " on" : ""), onClick: () => ((tab = id), (picking = null), render()) }, label)));
      const nodes = tab === "look" ? look() : tab === "ring" ? ringTab() : tab === "voice" ? voiceTab() : general();
      body.replaceChildren(...nodes);
      body.scrollTop = 0;
    }
    root.append(tabs, body);
    render();
  },
};
