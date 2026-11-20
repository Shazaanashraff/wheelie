import { invoke } from "../bridge.ts";
import { h, icon, uid } from "../dom.ts";
import { ICONS } from "../icons.ts";
import { store } from "../store.ts";
import type { Tool } from "./types.ts";

interface App {
  id: string;
  name: string;
  target: string;
}

const DEFAULTS: App[] = [
  { id: "notepad", name: "Notepad", target: "notepad.exe" },
  { id: "explorer", name: "File Explorer", target: "explorer.exe" },
  { id: "terminal", name: "Terminal", target: "cmd.exe" },
  { id: "taskmgr", name: "Task Manager", target: "taskmgr.exe" },
  { id: "settings", name: "Windows Settings", target: "ms-settings:" },
];

export const apps: Tool = {
  id: "apps",
  name: "Apps",
  desc: "Launch your favourite apps",
  size: [400, 480],
  mount(root, ctx) {
    let items = store.get<App[]>("apps.items", DEFAULTS);
    let editing = false;
    const save = () => store.set("apps.items", items);

    const grid = h("div", { class: "app-grid" });
    const name = h("input", { class: "input", placeholder: "Name" });
    const target = h("input", { class: "input", placeholder: String.raw`Path, e.g. C:\Program Files\App\app.exe` });
    const form = h("div", { class: "pad stack", hidden: true }, name, target, h("button", { class: "btn primary", textContent: "Add app", onClick: add }));
    const toggle = h("button", { class: "link", textContent: "Edit", onClick: () => ((editing = !editing), render()) });

    function render() {
      toggle.textContent = editing ? "Done" : "Edit";
      form.hidden = !editing;
      grid.replaceChildren(
        ...items.map((a) =>
          h(
            "div",
            { class: "app-tile" },
            h(
              "button",
              {
                class: "app-btn",
                title: a.target,
                onClick: () => {
                  if (editing) return;
                  void invoke("open_target", { target: a.target });
                  ctx.hide();
                },
              },
              h("span", { class: "app-initial" }, a.name.slice(0, 1).toUpperCase()),
              h("span", { class: "app-name" }, a.name),
            ),
            editing
              ? h(
                  "button",
                  {
                    class: "icon-btn tile-x",
                    title: "Remove",
                    onClick: () => {
                      items = items.filter((x) => x.id !== a.id);
                      save();
                      render();
                    },
                  },
                  icon(ICONS.close, 12),
                )
              : null,
          ),
        ),
      );
      if (!items.length) grid.append(h("div", { class: "empty" }, "No apps yet. Press Edit to add some."));
    }

    function add() {
      const t = target.value.trim().replace(/^"|"$/g, "");
      if (!t) return;
      const base = t.split(/[\\/]/).pop() ?? t;
      items.push({ id: uid(), name: name.value.trim() || base.replace(/\.[a-z0-9]+$/i, ""), target: t });
      name.value = "";
      target.value = "";
      save();
      render();
    }
    target.addEventListener("keydown", (e) => e.key === "Enter" && add());

    root.append(grid, form, h("div", { class: "foot" }, h("span", {}, "Click to launch"), toggle));
    render();
  },
};
