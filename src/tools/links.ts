import { invoke } from "../core/bridge.ts";
import { h, icon, uid } from "../core/dom.ts";
import { ICONS } from "../core/icons.ts";
import { store } from "../core/store.ts";
import type { Tool } from "./types.ts";

interface Link {
  id: string;
  title: string;
  url: string;
}

/** Only web/mail links are accepted here (apps live in the Apps tool). */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "https://" + s;
  try {
    const u = new URL(withScheme);
    return ["http:", "https:", "mailto:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

export const links: Tool = {
  id: "links",
  name: "Links",
  desc: "Links you open all the time",
  size: [400, 480],
  mount(root, ctx) {
    let items = store.get<Link[]>("links.items", []);
    const save = () => store.set("links.items", items);

    const title = h("input", { class: "input", placeholder: "Title (optional)" });
    const url = h("input", { class: "input", placeholder: "Paste a link and press Enter", autocomplete: "off" });
    const err = h("div", { class: "form-error" });
    const list = h("div", { class: "link-list" });

    function render() {
      list.replaceChildren(
        ...items.map((l) =>
          h(
            "div",
            { class: "link-item" },
            h(
              "button",
              {
                class: "link-open",
                title: l.url,
                onClick: () => {
                  void invoke("open_target", { target: l.url });
                  ctx.hide();
                },
              },
              h("span", { class: "link-title" }, l.title),
              h("span", { class: "link-url" }, l.url.replace(/^https?:\/\//, "")),
            ),
            h(
              "button",
              {
                class: "icon-btn",
                title: "Remove",
                onClick: () => {
                  items = items.filter((x) => x.id !== l.id);
                  save();
                  render();
                },
              },
              icon(ICONS.close, 14),
            ),
          ),
        ),
      );
      if (!items.length) list.append(h("div", { class: "empty" }, "Save the links you open all the time."));
    }

    function add() {
      const norm = normalizeUrl(url.value);
      if (!norm) {
        err.textContent = "That doesn't look like a web link.";
        return;
      }
      err.textContent = "";
      const t = title.value.trim() || new URL(norm).hostname.replace(/^www\./, "");
      items.unshift({ id: uid(), title: t, url: norm });
      title.value = "";
      url.value = "";
      save();
      render();
    }
    url.addEventListener("keydown", (e) => e.key === "Enter" && add());
    title.addEventListener("keydown", (e) => e.key === "Enter" && url.focus());

    root.append(h("div", { class: "pad stack" }, title, url, err), list);
    render();
    queueMicrotask(() => url.focus());
  },
};
