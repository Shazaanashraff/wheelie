import { invoke } from "../bridge.ts";
import { h } from "../dom.ts";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "../store.ts";
import type { Tool } from "./types.ts";

export const TOOL_NAMES: Record<string, string> = {
  calc: "Calculator",
  clock: "Clock",
  notes: "Notes",
  todo: "To-do",
  clipboard: "Clipboard",
  units: "Units",
  links: "Links",
  apps: "Apps",
};

const MIN_TOOLS = 2;

export const settingsTool: Tool = {
  id: "settings",
  name: "Settings",
  size: [420, 620],
  mount(root, ctx) {
    let s: Settings = loadSettings();
    const apply = () => {
      saveSettings(s);
      void invoke("set_trigger_config", { keyboard: s.keyboard, mouse: s.mouse });
      ctx.settingsChanged();
    };

    function select<T extends string>(value: T, options: [T, string][], onChange: (v: T) => void) {
      const el = h("select", { class: "input" }, ...options.map(([v, l]) => h("option", { value: v, selected: v === value }, l)));
      el.addEventListener("change", () => onChange(el.value as T));
      return el;
    }
    const field = (label: string, control: HTMLElement, hint?: string) =>
      h("label", { class: "field" }, h("span", { class: "field-label" }, label), control, hint ? h("span", { class: "hint" }, hint) : null);

    const toolList = h("div", { class: "tool-order" });
    function renderTools() {
      const enabledCount = s.order.filter((id) => !s.disabled.includes(id)).length;
      toolList.replaceChildren(
        ...s.order.map((id, i) => {
          const on = !s.disabled.includes(id);
          return h(
            "div",
            { class: "tool-row" },
            h("input", {
              type: "checkbox",
              checked: on,
              disabled: on && enabledCount <= MIN_TOOLS,
              title: on && enabledCount <= MIN_TOOLS ? `Keep at least ${MIN_TOOLS} tools` : "",
              onChange: () => {
                s.disabled = on ? [...s.disabled, id] : s.disabled.filter((x) => x !== id);
                apply();
                renderTools();
              },
            }),
            h("span", { class: "tool-name" }, TOOL_NAMES[id] ?? id),
            h("button", { class: "icon-btn", title: "Move up", disabled: i === 0, onClick: () => move(i, -1) }, "↑"),
            h("button", { class: "icon-btn", title: "Move down", disabled: i === s.order.length - 1, onClick: () => move(i, 1) }, "↓"),
          );
        }),
      );
    }
    function move(i: number, d: number) {
      const o = [...s.order];
      [o[i], o[i + d]] = [o[i + d], o[i]];
      s.order = o;
      apply();
      renderTools();
    }

    const accent = h("input", { type: "color", class: "color", value: s.accent });
    accent.addEventListener("input", () => {
      s.accent = accent.value;
      apply();
    });

    root.append(
      h(
        "div",
        { class: "settings" },
        h("h3", {}, "Open the ring"),
        field(
          "Keyboard (hold)",
          select(
            s.keyboard,
            [
              ["alt+space", "Alt + Space"],
              ["ctrl+alt+space", "Ctrl + Alt + Space"],
              ["off", "Off"],
            ],
            (v) => ((s.keyboard = v), apply()),
          ),
          "Wheelie suppresses the Windows window menu while you hold it.",
        ),
        field(
          "Mouse (hold)",
          select(
            s.mouse,
            [
              ["middle", "Middle button"],
              ["x1", "Side button 1 (back)"],
              ["x2", "Side button 2 (forward)"],
              ["off", "Off"],
            ],
            (v) => ((s.mouse = v), apply()),
          ),
          "The chosen button no longer works as normal in other apps.",
        ),
        h("h3", {}, "Look"),
        field(
          "Theme",
          select(
            s.theme,
            [
              ["dark", "Dark"],
              ["light", "Light"],
              ["tinted", "Tinted"],
            ],
            (v) => ((s.theme = v), apply()),
          ),
        ),
        field("Accent colour", accent),
        h("h3", {}, "Tools in the ring"),
        toolList,
        h(
          "div",
          { class: "foot" },
          h("span", {}, "Quit from the tray icon"),
          h("button", {
            class: "link danger",
            textContent: "Reset all settings",
            onClick: () => {
              s = { ...DEFAULT_SETTINGS };
              apply();
              root.replaceChildren();
              settingsTool.mount(root, ctx);
            },
          }),
        ),
      ),
    );
    renderTools();
  },
};
