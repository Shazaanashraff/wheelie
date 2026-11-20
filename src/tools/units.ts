import { h, icon } from "../dom.ts";
import { ICONS } from "../icons.ts";
import { store } from "../store.ts";
import type { Tool } from "./types.ts";
import { CATEGORIES, convert, formatNum } from "./unitdata.ts";

interface State {
  cat: string;
  from: string;
  to: string;
  value: string;
}

export const units: Tool = {
  id: "units",
  name: "Units",
  desc: "Convert length, weight, temperature and more",
  size: [380, 500],
  mount(root) {
    let st = store.get<State>("units.state", { cat: "length", from: "m", to: "ft", value: "1" });
    if (!CATEGORIES.some((c) => c.id === st.cat)) st = { cat: "length", from: "m", to: "ft", value: "1" };
    const save = () => store.set("units.state", st);

    const catRow = h("div", { class: "chips" });
    const value = h("input", { class: "input big-input", type: "text", inputMode: "decimal", value: st.value });
    const from = h("select", { class: "input" });
    const to = h("select", { class: "input" });
    const result = h("div", { class: "units-result mono" });
    const table = h("div", { class: "units-table" });

    const cat = () => CATEGORIES.find((c) => c.id === st.cat)!;
    const unit = (id: string) => cat().units.find((u) => u.id === id) ?? cat().units[0];

    function fillSelects() {
      for (const [sel, cur] of [
        [from, st.from],
        [to, st.to],
      ] as const) {
        sel.replaceChildren(...cat().units.map((u) => h("option", { value: u.id, selected: u.id === cur }, u.label)));
      }
    }

    function compute() {
      const n = parseFloat(value.value.replace(",", "."));
      const f = unit(st.from);
      const t = unit(st.to);
      if (Number.isNaN(n)) {
        result.replaceChildren("–");
        table.replaceChildren();
        return;
      }
      result.replaceChildren(formatNum(convert(n, f, t)), h("span", { class: "unit-name" }, t.label));
      table.replaceChildren(
        ...cat()
          .units.filter((u) => u.id !== st.from)
          .map((u) => h("div", { class: "units-row" }, h("span", {}, u.label), h("span", { class: "mono" }, formatNum(convert(n, f, u))))),
      );
    }

    function renderCats() {
      catRow.replaceChildren(
        ...CATEGORIES.map((c) =>
          h(
            "button",
            {
              class: "chip" + (c.id === st.cat ? " on" : ""),
              onClick: () => {
                st.cat = c.id;
                st.from = c.units[0].id;
                st.to = c.units[Math.min(1, c.units.length - 1)].id;
                save();
                renderCats();
                fillSelects();
                compute();
              },
            },
            c.label,
          ),
        ),
      );
    }

    value.addEventListener("input", () => {
      st.value = value.value;
      save();
      compute();
    });
    from.addEventListener("change", () => {
      st.from = from.value;
      save();
      compute();
    });
    to.addEventListener("change", () => {
      st.to = to.value;
      save();
      compute();
    });

    root.append(
      h("div", { class: "pad" }, catRow),
      h(
        "div",
        { class: "pad" },
        value,
        h(
          "div",
          { class: "row" },
          from,
          h(
            "button",
            {
              class: "icon-btn",
              title: "Swap",
              onClick: () => {
                [st.from, st.to] = [st.to, st.from];
                save();
                fillSelects();
                compute();
              },
            },
            icon(ICONS.swap, 18),
          ),
          to,
        ),
        result,
      ),
      table,
    );
    renderCats();
    fillSelects();
    compute();
    queueMicrotask(() => {
      value.focus();
      value.select();
    });
  },
};
