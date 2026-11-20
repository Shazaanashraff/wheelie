import { h, icon, uid } from "../core/dom.ts";
import { ICONS } from "../core/icons.ts";
import { store } from "../core/store.ts";
import type { Tool } from "./types.ts";

interface Item {
  id: string;
  text: string;
  done: boolean;
}

export const todo: Tool = {
  id: "todo",
  name: "To-do",
  desc: "A quick checklist",
  size: [380, 480],
  mount(root) {
    let items = store.get<Item[]>("todo.items", []);
    const save = () => store.set("todo.items", items);

    const input = h("input", { class: "input", placeholder: "Add a task and press Enter", autocomplete: "off" });
    const list = h("div", { class: "todo-list" });
    const count = h("span", {});

    function render() {
      list.replaceChildren(
        ...items.map((it) =>
          h(
            "div",
            { class: "todo-item" + (it.done ? " done" : "") },
            h("input", {
              type: "checkbox",
              checked: it.done,
              onChange: () => {
                it.done = !it.done;
                save();
                render();
              },
            }),
            h("span", { class: "todo-text" }, it.text),
            h(
              "button",
              {
                class: "icon-btn",
                title: "Delete",
                onClick: () => {
                  items = items.filter((x) => x.id !== it.id);
                  save();
                  render();
                },
              },
              icon(ICONS.close, 14),
            ),
          ),
        ),
      );
      if (!items.length) list.append(h("div", { class: "empty" }, "Nothing to do. Nice."));
      const left = items.filter((i) => !i.done).length;
      count.textContent = items.length ? `${left} left` : "";
    }

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const text = input.value.trim();
      if (!text) return;
      items.unshift({ id: uid(), text, done: false });
      input.value = "";
      save();
      render();
    });

    root.append(
      h("div", { class: "pad" }, input),
      list,
      h(
        "div",
        { class: "foot" },
        count,
        h("button", {
          class: "link",
          textContent: "Clear completed",
          onClick: () => {
            items = items.filter((i) => !i.done);
            save();
            render();
          },
        }),
      ),
    );
    render();
    queueMicrotask(() => input.focus());
  },
};
