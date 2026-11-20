/**
 * Calculator keypad logic as a pure reducer, so button clicks and keyboard
 * typing behave identically and the rules can be unit tested.
 *
 * The expression is stored in parser syntax (`*`, `/`, `-`, `π`, `sqrt(`);
 * the UI prettifies it for display.
 */
import { evaluate, format } from "./calcparse.ts";

export interface CalcState {
  expr: string;
  /** `expr` is a finished result (typing a digit starts fresh, an operator continues from it). */
  done: boolean;
  /** The expression that produced the current result, shown above it. */
  lastExpr: string;
  error: string;
}

export const INITIAL: CalcState = { expr: "", done: false, lastExpr: "", error: "" };

const OPS = "+-*/^";
const isDigit = (c: string) => c >= "0" && c <= "9";
/** Characters after which a binary operator / postfix makes sense. */
const endsValue = (e: string) => /[0-9.)π%!]$/.test(e);

export function openParens(e: string): number {
  let n = 0;
  for (const c of e) {
    if (c === "(") n++;
    else if (c === ")") n = Math.max(0, n - 1);
  }
  return n;
}

/** Make a half-typed expression evaluable: drop trailing operators, close open brackets. */
export function completed(e: string): string {
  let s = e.replace(/[+\-*/^]+$/, "");
  s = s.replace(/[a-z]+\($/i, ""); // dangling "sqrt("
  return s + ")".repeat(openParens(s));
}

/** Live result for the display, or null if there is nothing useful to show yet. */
export function preview(e: string): string | null {
  const s = completed(e);
  if (!s || /^-?[0-9.]+$/.test(s)) return null; // a bare number: nothing to compute
  try {
    return format(evaluate(s));
  } catch {
    return null;
  }
}

export function press(s: CalcState, key: string): CalcState {
  let { expr, done } = s;
  const next = (e: string, extra: Partial<CalcState> = {}): CalcState => ({ ...s, expr: e, done: false, error: "", ...extra });

  // Typing a value after a finished result starts a new calculation.
  const startsFresh = done && (isDigit(key) || key === "." || key === "π" || key === "(" || key.startsWith("fn:"));
  if (startsFresh) expr = "";

  if (isDigit(key)) return next(expr + key);

  if (key === ".") {
    const cur = /[0-9.]*$/.exec(expr)![0];
    if (cur.includes(".")) return next(expr);
    return next(expr + (cur === "" ? "0." : "."));
  }

  if (key === "π") return next(expr + "π");
  if (key === "(") return next(expr + "(");
  if (key.startsWith("fn:")) return next(expr + key.slice(3) + "(");

  if (key === ")") {
    if (openParens(expr) > 0 && endsValue(expr)) return next(expr + ")");
    return next(expr);
  }

  if (key === "%" || key === "!") return endsValue(expr) ? next(expr + key) : next(expr);

  if (key === "sq") return endsValue(expr) ? next(expr + "^2") : next(expr);

  if (OPS.includes(key) && key.length === 1) {
    if (expr === "") return key === "-" ? next("-") : next(expr);
    const last = expr[expr.length - 1];
    if (last === "(") return key === "-" ? next(expr + "-") : next(expr);
    if (OPS.includes(last)) {
      if (expr === "-") return next(expr);
      if (key === "-" && "*/^".includes(last)) return next(expr + "-"); // 2*-3
      if (key === "-" && last === "-") return next(expr);
      // Replace the operator (also collapses "2*-" + "+").
      return next(expr.replace(/[+\-*/^]+$/, "") + key);
    }
    return next(expr + key);
  }

  if (key === "neg") {
    if (expr === "") return next("-");
    const unwrap = /\(-([0-9.]+)\)$/.exec(expr);
    if (unwrap) return next(expr.slice(0, unwrap.index) + unwrap[1]);
    const m = /[0-9.]+$/.exec(expr);
    if (m) return next(expr.slice(0, m.index) + `(-${m[0]})`);
    return next(expr);
  }

  if (key === "back") {
    if (done) return { ...INITIAL };
    const fn = /[a-z]+\($/i.exec(expr);
    if (fn) return next(expr.slice(0, fn.index));
    return next(expr.slice(0, -1));
  }

  if (key === "clear") return { ...INITIAL };

  return s;
}

/** Evaluate the current expression. On success the result becomes the new expression. */
export function equals(s: CalcState): { state: CalcState; result?: string } {
  if (s.expr === "") return { state: s };
  try {
    const result = format(evaluate(completed(s.expr)));
    return { state: { expr: result, done: true, lastExpr: s.done ? s.lastExpr : s.expr, error: "" }, result };
  } catch (e) {
    return { state: { ...s, error: (e as Error).message } };
  }
}

/** Map a keyboard event's `key` to a keypad key, or null if it isn't a calculator key. */
export function keyFromEvent(key: string): string | null {
  if (isDigit(key) && key.length === 1) return key;
  switch (key) {
    case ".":
    case ",":
      return ".";
    case "+":
    case "-":
    case "*":
    case "/":
    case "^":
    case "(":
    case ")":
    case "%":
    case "!":
      return key;
    case "x":
    case "X":
      return "*";
    case "p":
    case "P":
      return "π";
    case "Enter":
    case "=":
      return "equals";
    case "Backspace":
      return "back";
    case "Delete":
    case "c":
    case "C":
      return "clear";
    default:
      return null;
  }
}

/** Expression as shown on screen: real operator glyphs. */
export function pretty(e: string): string {
  return e.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−").replace(/sqrt\(/g, "√(");
}
