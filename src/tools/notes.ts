import { h, uid } from "../dom.ts";
import { store } from "../store.ts";
import type { Tool } from "./types.ts";

interface Note {
  id: string;
  text: string;
}

export const notes: Tool = {
  id: "notes",
  name: "Notes",
  size: [420, 480],
  mount(root) {
    let list = store.get<Note[]>("notes.list", []);
    if (!list.length) list = [{ id: uid(), text: "" }];
    let active = store.get<string>("notes.active", list[0].id);
    if (!list.some((n) => n.id === active)) active = list[0].id;

    const strip = h("div", { class: "tabs scroll" });
    const area = h("textarea", { class: "note-area", placeholder: "Start typing. Saved automatically.", spellcheck: true });
    let saveTimer: number | undefined;

    const persist = () => {
      store.set("notes.list", list);
      store.set("notes.active", active);
    };
    const title = (n: Note, i: number) => n.text.trim().split("\n")[0].slice(0, 18) || `Note ${i + 1}`;

    function renderTabs() {
      strip.replaceChildren(
        ...list.map((n, i) => h("button", { class: "tab" + (n.id === active ? " on" : ""), onClick: () => select(n.id) }, title(n, i))),
        h("button", { class: "tab add", title: "New note", onClick: add }, "+"),
      );
    }
    function select(id: string) {
      flush();
      active = id;
      area.value = list.find((n) => n.id === id)!.text;
      persist();
      renderTabs();
      area.focus();
    }
    function add() {
      flush();
      const n = { id: uid(), text: "" };
      list.push(n);
      active = n.id;
      area.value = "";
      persist();
      renderTabs();
      area.focus();
    }
    function flush() {
      clearTimeout(saveTimer);
      const n = list.find((x) => x.id === active);
      if (n) n.text = area.value;
      persist();
    }

    area.value = list.find((n) => n.id === active)!.text;
    area.addEventListener("input", () => {
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        flush();
        renderTabs();
      }, 300);
    });

    root.append(
      strip,
      area,
      h(
        "div",
        { class: "foot" },
        h("button", {
          class: "link",
          textContent: "Copy",
          onClick: () => navigator.clipboard?.writeText(area.value).catch(() => {}),
        }),
        h("button", {
          class: "link danger",
          textContent: "Delete note",
          onClick: () => {
            list = list.filter((n) => n.id !== active);
            if (!list.length) list = [{ id: uid(), text: "" }];
            active = list[0].id;
            area.value = list[0].text;
            persist();
            renderTabs();
          },
        }),
      ),
    );
    renderTabs();
    queueMicrotask(() => area.focus());
    return flush; // never lose the last keystrokes when the panel closes
  },
};
