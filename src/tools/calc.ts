import { h, icon } from "../core/dom.ts";
import { ICONS } from "../core/icons.ts";
import { store } from "../core/store.ts";
import type { Tool } from "./types.ts";
import { INITIAL, equals, keyFromEvent, preview, press, pretty, type CalcState } from "./calcstate.ts";

interface Entry {
  expr: string;
  result: string;
}

type Kind = "num" | "op" | "fn" | "eq" | "clear" | "util";
interface Key {
  label: string;
  key: string;
  kind: Kind;
  title?: string;
}

/** Clicking a key must not move focus off the calculator, or typing and Space/Enter would hit the button. */
const noFocus = (e: Event) => e.preventDefault();

const k = (label: string, key: string, kind: Kind, title?: string): Key => ({ label, key, kind, title });

const SCI: Key[][] = [
  [k("(", "(", "fn"), k(")", ")", "fn"), k("xʸ", "^", "fn", "Power"), k("n!", "!", "fn", "Factorial")],
  [k("π", "π", "fn", "Pi"), k("√", "fn:sqrt", "fn", "Square root"), k("x²", "sq", "fn", "Square"), k("ln", "fn:ln", "fn", "Natural log")],
];

const MAIN: Key[][] = [
  [k("C", "clear", "clear", "Clear (C)"), k("⌫", "back", "util", "Backspace"), k("%", "%", "op", "Percent"), k("÷", "/", "op")],
  [k("7", "7", "num"), k("8", "8", "num"), k("9", "9", "num"), k("×", "*", "op")],
  [k("4", "4", "num"), k("5", "5", "num"), k("6", "6", "num"), k("−", "-", "op")],
  [k("1", "1", "num"), k("2", "2", "num"), k("3", "3", "num"), k("+", "+", "op")],
  [k("±", "neg", "util", "Change sign"), k("0", "0", "num"), k(".", ".", "num"), k("=", "equals", "eq")],
];

export const calc: Tool = {
  id: "calc",
  name: "Calculator",
  desc: "Keypad calculator with history",
  size: [340, 560],
  mount(root) {
    let state: CalcState = INITIAL;
    let history = store.get<Entry[]>("calc.history", []);
    let sci = store.get<boolean>("calc.sci", false);
    let flash = "";
    let flashTimer: number | undefined;

    const exprEl = h("div", { class: "calc-expr-line" });
    const resultEl = h("div", { class: "calc-result" });
    const noteEl = h("div", { class: "calc-note" });
    const keypad = h("div", { class: "calc-keys" });
    const sciKeys = h("div", { class: "calc-keys sci" });
    const histPanel = h("div", { class: "calc-history-panel", hidden: true });
    const sciBtn = h("button", { class: "calc-tool", tabIndex: -1, onMousedown: noFocus, title: "Scientific keys", onClick: () => ((sci = !sci), store.set("calc.sci", sci), draw()) }, "fx");
    const histBtn = h("button", { class: "calc-tool", tabIndex: -1, onMousedown: noFocus, title: "History", onClick: () => toggleHistory() }, icon(ICONS.clock, 16));
    const copyBtn = h("button", { class: "calc-tool", tabIndex: -1, onMousedown: noFocus, title: "Copy result", onClick: () => copy() }, icon(ICONS.clipboard, 16));

    const keyButtons = new Map<string, HTMLButtonElement[]>();
    const makeKey = (def: Key) => {
      const b = h("button", { class: `ckey ${def.kind}`, title: def.title ?? "", tabIndex: -1, onMousedown: noFocus, onPointerdown: (e: PointerEvent) => e.button === 0 && onKey(def.key) }, def.label);
      keyButtons.set(def.key, [...(keyButtons.get(def.key) ?? []), b]);
      return b;
    };
    keypad.append(...MAIN.flat().map(makeKey));
    sciKeys.append(...SCI.flat().map(makeKey));

    const shownResult = () => (state.done ? state.expr : preview(state.expr) ?? "");

    function copy() {
      const r = shownResult();
      if (!r) return;
      navigator.clipboard?.writeText(r).catch(() => {});
      say("Copied");
    }
    function say(msg: string) {
      flash = msg;
      clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => ((flash = ""), draw()), 1400);
      draw();
    }

    function draw() {
      sciKeys.hidden = !sci;
      sciBtn.classList.toggle("on", sci);
      if (state.done) {
        exprEl.textContent = pretty(state.lastExpr) + " =";
        resultEl.textContent = state.expr;
      } else {
        exprEl.textContent = pretty(state.expr) || " ";
        resultEl.textContent = preview(state.expr) ?? (state.expr ? "" : "0");
      }
      const len = resultEl.textContent!.length;
      resultEl.className = "calc-result" + (len > 14 ? " xs" : len > 10 ? " sm" : "") + (state.done ? " done" : "") + (state.error ? " err" : "");
      noteEl.textContent = state.error || flash;
      noteEl.className = "calc-note" + (state.error ? " err" : "");
    }

    function onKey(key: string) {
      if (key === "equals") {
        const out = equals(state);
        state = out.state;
        if (out.result !== undefined && state.lastExpr && out.result !== state.lastExpr) {
          history = [{ expr: state.lastExpr, result: out.result }, ...history.filter((e) => e.expr !== state.lastExpr)].slice(0, 40);
          store.set("calc.history", history);
          navigator.clipboard?.writeText(out.result).catch(() => {});
          say("Copied");
          return;
        }
      } else {
        state = press(state, key);
        flash = "";
      }
      draw();
    }

    function toggleHistory() {
      histPanel.hidden = !histPanel.hidden;
      keypad.hidden = sciKeys.hidden = !histPanel.hidden;
      if (histPanel.hidden) draw();
      else renderHistory();
    }
    function renderHistory() {
      histPanel.replaceChildren(
        h("div", { class: "calc-hist-head" }, h("span", {}, "History"), history.length ? h("button", { class: "link", textContent: "Clear", onClick: () => ((history = []), store.set("calc.history", history), renderHistory()) }) : null),
        ...(history.length
          ? history.map((e) =>
              h(
                "button",
                {
                  class: "calc-row",
                  title: "Use this result",
                  onClick: () => {
                    state = { expr: e.result, done: true, lastExpr: e.expr, error: "" };
                    toggleHistory();
                  },
                },
                h("span", { class: "calc-expr" }, pretty(e.expr)),
                h("span", { class: "calc-res" }, "= " + e.result),
              ),
            )
          : [h("div", { class: "empty" }, "Your calculations will appear here.")]),
      );
    }

    root.classList.add("calc");
    root.tabIndex = -1;
    root.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !getSelection()?.toString()) {
          e.preventDefault();
          copy();
        }
        return;
      }
      const key = keyFromEvent(e.key);
      if (!key) return;
      e.preventDefault();
      if (!histPanel.hidden) toggleHistory();
      for (const b of keyButtons.get(key) ?? []) {
        b.classList.add("pressed");
        setTimeout(() => b.classList.remove("pressed"), 70);
      }
      onKey(key);
    });

    root.append(
      h("div", { class: "calc-display" }, h("div", { class: "calc-tools" }, sciBtn, histBtn, h("span", { class: "grow" }), copyBtn), exprEl, resultEl, noteEl),
      h("div", { class: "calc-body" }, histPanel, sciKeys, keypad),
    );
    draw();
    queueMicrotask(() => root.focus());
    return () => clearTimeout(flashTimer);
  },
};
