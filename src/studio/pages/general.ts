import { invoke } from "../../bridge.ts";
import { h } from "../../dom.ts";
import { DEFAULT_SETTINGS, defaultSlots } from "../../model.ts";
import { confirmButton, group, row, select, setSwitch, toggle } from "../../ui.ts";
import type { Page, StudioCtx } from "../ctx.ts";

export function general(ctx: StudioCtx): Page {
  const body = h("div", { class: "controls wide" });
  const version = h("span", { class: "hint" }, "…");
  void invoke<string>("app_version").then((v) => (version.textContent = `Version ${v}`));

  const login = toggle(false, (on) => void invoke("autostart_set", { on }), "Start Wheelie when I sign in");
  void invoke<boolean>("autostart_get").then((on) => setSwitch(login, Boolean(on)));

  function render() {
    const s = ctx.settings;
    body.replaceChildren(
      group("Startup", row("Start with Windows", login, "Wheelie starts quietly in the tray when you sign in, so the wheel is always ready.")),
      group(
        "Open the wheel",
        row("Keyboard (hold)", select(s.keyboard, [["alt+space", "Alt + Space"], ["ctrl+alt+space", "Ctrl + Alt + Space"], ["off", "Off"]], (v) => ctx.update({ keyboard: v })), "Wheelie suppresses the Windows window menu while you hold it."),
        row("Mouse (hold)", select(s.mouse, [["middle", "Middle button"], ["x1", "Side button 1 (back)"], ["x2", "Side button 2 (forward)"], ["off", "Off"]], (v) => ctx.update({ mouse: v })), "The chosen button no longer works as normal in other apps."),
      ),
      group(
        "Your data",
        row("Notes", h("button", { class: "btn", onClick: async () => void invoke("open_target", { target: await invoke<string>("notes_dir") }) }, "Open notes folder"), "Notes are plain .txt files in Documents\\Wheelie Notes."),
      ),
      group("Reset", row("Reset all settings", confirmButton("Reset…", "Click again to reset", () => (ctx.update({ ...DEFAULT_SETTINGS, slots: defaultSlots() }), render())), "Themes, ring slots, triggers and voice go back to the defaults. Your notes are untouched.")),
      group("About", row("Wheelie", version, "A radial wheel for Windows."), row("Quit", h("button", { class: "btn danger-btn", onClick: () => void invoke("quit_app") }, "Quit Wheelie"), "Stops the wheel until you start Wheelie again.")),
    );
  }
  render();
  return { el: h("div", { class: "page" }, h("header", { class: "page-head" }, h("h1", {}, "General")), body) };
}
