import { h } from "../dom.ts";
import { store } from "../store.ts";
import type { Tool } from "./types.ts";
import { evaluate, format } from "./calcparse.ts";

interface Entry {
  expr: string;
  result: string;
}

export const calc: Tool = {
  id: "calc",
  name: "Calculator",
  size: [360, 480],
  mount(root) {
    let history = store.get<Entry[]>("calc.history", []);
    const input = h("input", {
      class: "calc-input",
      placeholder: "Type the math…",
      spellcheck: false,
      autocomplete: "off",
    });
    const live = h("div", { class: "calc-live" });
    const list = h("div", { class: "calc-history" });

    function renderHistory() {
      list.replaceChildren(
        ...history.map((e) =>
          h(
            "button",
            {
              class: "calc-row",
              onClick: () => {
                input.value = e.result;
                input.focus();
                update();
              },
              title: "Use this result",
            },
            h("span", { class: "calc-expr" }, e.expr),
            h("span", { class: "calc-res" }, "= " + e.result),
          ),
        ),
      );
    }

    function update() {
      const src = input.value.trim();
      if (!src) {
        live.textContent = "";
        live.classList.remove("error");
        return;
      }
      try {
        live.textContent = "= " + format(evaluate(src));
        live.classList.remove("error");
      } catch (err) {
        // Half-typed expressions are normal; stay quiet until Enter.
        live.textContent = "";
        live.classList.remove("error");
        void err;
      }
    }

    input.addEventListener("input", update);
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const src = input.value.trim();
      if (!src) return;
      try {
        const result = format(evaluate(src));
        navigator.clipboard?.writeText(result).catch(() => {});
        history = [{ expr: src, result }, ...history.filter((x) => x.expr !== src)].slice(0, 30);
        store.set("calc.history", history);
        input.value = "";
        live.textContent = `Copied ${result}`;
        live.classList.remove("error");
        renderHistory();
      } catch (err) {
        live.textContent = (err as Error).message;
        live.classList.add("error");
      }
    });

    root.append(
      h("div", { class: "calc-top" }, input, live),
      list,
      h(
        "div",
        { class: "foot" },
        h("span", {}, "Enter copies the result · try 15% of, sqrt(2), 2pi, 5!"),
        history.length
          ? h("button", {
              class: "link",
              textContent: "Clear",
              onClick: () => {
                history = [];
                store.set("calc.history", history);
                renderHistory();
              },
            })
          : null,
      ),
    );
    renderHistory();
    queueMicrotask(() => input.focus());
  },
};
