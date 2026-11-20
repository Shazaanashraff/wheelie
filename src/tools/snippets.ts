import { invoke } from "../bridge.ts";
import { h, icon, uid } from "../dom.ts";
import { ICONS } from "../icons.ts";
import { store } from "../store.ts";
import type { Tool } from "./types.ts";
import { expand } from "./snippetfmt.ts";

interface Snippet {
  id: string;
  title: string;
  text: string;
}

const STARTERS: Snippet[] = [
  { id: "s1", title: "Today's date", text: "{date}" },
  { id: "s2", title: "Sign-off", text: "Thanks,\n" },
  { id: "s3", title: "Meeting notes header", text: "Meeting notes, {weekday} {date}\nAttendees:\nDecisions:\nActions:\n" },
];

export const snippets: Tool = {
  id: "snippets",
  name: "Snippets",
  desc: "Saved text. Click to paste it anywhere",
  size: [420, 520],
  mount(root, ctx) {
    let items = store.get<Snippet[]>("snippets.items", STARTERS);
    let editing: string | null = null; // snippet id, or "new"
    const save = () => store.set("snippets.items", items);

    const list = h("div", { class: "snip-list" });
    const title = h("input", { class: "input", placeholder: "Name, e.g. Email signature" });
    const text = h("textarea", { class: "input snip-text", placeholder: "The text to paste. {date} {time} {weekday} are filled in for you." });
    const form = h("div", { class: "pad stack", hidden: true }, title, text, h("div", { class: "row" }, h("button", { class: "btn primary", onClick: commit }, "Save snippet"), h("button", { class: "btn", onClick: () => closeForm() }, "Cancel")));
    const addBtn = h("button", { class: "btn primary", onClick: () => openForm("new") }, icon(ICONS.plus, 15), "New");

    function openForm(id: string) {
      editing = id;
      const s = items.find((x) => x.id === id);
      title.value = s?.title ?? "";
      text.value = s?.text ?? "";
      form.hidden = false;
      list.hidden = true;
      title.focus();
    }
    function closeForm() {
      editing = null;
      form.hidden = true;
      list.hidden = false;
    }
    function commit() {
      if (!text.value.trim()) return;
      const t = title.value.trim() || text.value.trim().split("\n")[0].slice(0, 30);
      if (editing && editing !== "new") items = items.map((s) => (s.id === editing ? { ...s, title: t, text: text.value } : s));
      else items = [{ id: uid(), title: t, text: text.value }, ...items];
      save();
      closeForm();
      render();
    }
    function render() {
      list.replaceChildren(
        ...items.map((s) =>
          h(
            "div",
            { class: "snip-item" },
            h(
              "button",
              {
                class: "snip-main",
                title: "Paste",
                onClick: () => {
                  void invoke("paste_text", { text: expand(s.text) });
                  ctx.hide();
                },
              },
              h("span", { class: "snip-title" }, s.title),
              h("span", { class: "snip-preview" }, s.text.replace(/\s+/g, " ").slice(0, 90)),
            ),
            h("button", { class: "icon-btn", title: "Edit", onClick: () => openForm(s.id) }, "✎"),
            h("button", { class: "icon-btn", title: "Delete", onClick: () => ((items = items.filter((x) => x.id !== s.id)), save(), render()) }, icon(ICONS.close, 14)),
          ),
        ),
      );
      if (!items.length) list.append(h("div", { class: "empty" }, "Save the text you type again and again."));
    }

    root.append(h("div", { class: "pad row" }, h("span", { class: "grow hint" }, "Click a snippet to paste it where you were typing"), addBtn), list, form);
    render();
  },
};
