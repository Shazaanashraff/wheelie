import { invoke, listen } from "../bridge.ts";
import { h } from "../dom.ts";
import type { Tool } from "./types.ts";

export const clipboard: Tool = {
  id: "clipboard",
  name: "Clipboard",
  desc: "Clipboard history, click to paste",
  size: [420, 520],
  mount(root, ctx) {
    let items: string[] = [];
    let query = "";
    const search = h("input", { class: "input", placeholder: "Search clipboard history", autocomplete: "off" });
    const list = h("div", { class: "clip-list" });

    function render() {
      const q = query.toLowerCase();
      const shown = items.filter((t) => t.toLowerCase().includes(q));
      list.replaceChildren(
        ...shown.map((t, i) =>
          h(
            "button",
            {
              class: "clip-item",
              title: "Paste",
              onClick: () => {
                void invoke("paste_text", { text: t });
                ctx.hide();
              },
            },
            h("span", { class: "clip-n" }, String(i + 1)),
            h("span", { class: "clip-text" }, t.length > 220 ? t.slice(0, 220) + "…" : t),
          ),
        ),
      );
      if (!shown.length) {
        list.append(
          h("div", { class: "empty" }, items.length ? "No matches." : "Copy something and it will show up here. History is kept in memory only."),
        );
      }
    }

    async function refresh() {
      items = await invoke<string[]>("clipboard_history");
      render();
    }

    search.addEventListener("input", () => {
      query = search.value;
      render();
    });
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") (list.querySelector(".clip-item") as HTMLElement | null)?.click();
    });

    root.append(
      h("div", { class: "pad" }, search),
      list,
      h(
        "div",
        { class: "foot" },
        h("span", {}, "Click an item to paste it · password-manager copies are skipped"),
        h("button", {
          class: "link danger",
          textContent: "Clear",
          onClick: async () => {
            await invoke("clipboard_clear");
            refresh();
          },
        }),
      ),
    );
    void refresh();
    let off: (() => void) | undefined;
    void listen("clipboard:update", refresh).then((u) => (off = u));
    queueMicrotask(() => search.focus());
    return () => off?.();
  },
};
