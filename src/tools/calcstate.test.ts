import { test } from "node:test";
import assert from "node:assert/strict";
import { INITIAL, completed, equals, keyFromEvent, preview, press, pretty, type CalcState } from "./calcstate.ts";

/** Press a sequence of keys. Single characters are keys; "=" evaluates. */
function run(keys: (string | string[])[], from: CalcState = INITIAL): CalcState {
  let s = from;
  for (const k of keys.flat()) s = k === "=" ? equals(s).state : press(s, k);
  return s;
}
const seq = (str: string) => str.split("");

test("basic arithmetic through the keypad", () => {
  assert.equal(run([...seq("7+3*2"), "="]).expr, "13");
  assert.equal(run([...seq("12.5*2"), "="]).expr, "25");
});

test("after =, an operator continues from the result, a digit starts fresh", () => {
  const r = run([...seq("2+3"), "="]);
  assert.equal(r.expr, "5");
  assert.equal(r.lastExpr, "2+3");
  assert.equal(run(["*", "4", "="], r).expr, "20");
  assert.equal(run(["9"], r).expr, "9");
});

test("decimal point rules", () => {
  assert.equal(run(seq("1.2.3")).expr, "1.23");
  assert.equal(run(["."]).expr, "0.");
  assert.equal(run([...seq("2+"), "."]).expr, "2+0.");
});

test("operators: replaced, not stacked; leading minus allowed; 2*-3 works", () => {
  assert.equal(run(seq("5+*")).expr, "5*");
  assert.equal(run(["*"]).expr, "");
  assert.equal(run(["-", "4"]).expr, "-4");
  assert.equal(run([...seq("2*-3"), "="]).expr, "-6");
  assert.equal(run(seq("5--")).expr, "5-");
  assert.equal(run(["-", "+"]).expr, "-");
});

test("parentheses and auto-close", () => {
  assert.equal(run(seq("(2+3")).expr, "(2+3");
  assert.equal(completed("(2+3"), "(2+3)");
  assert.equal(run([...seq("(2+3"), "="]).expr, "5");
  assert.equal(run([")"]).expr, "", "cannot close what was never opened");
  assert.equal(run([...seq("(2"), ")", ")"]).expr, "(2)");
  assert.equal(run([...seq("2*(3+4)"), "="]).expr, "14");
});

test("percent, factorial, square, sqrt, pi", () => {
  assert.equal(run([...seq("50"), "%", "="]).expr, "0.5");
  assert.equal(run([...seq("200*10"), "%", "="]).expr, "20");
  assert.equal(run([...seq("5"), "!", "="]).expr, "120");
  assert.equal(run([...seq("9"), "sq", "="]).expr, "81");
  assert.equal(run(["fn:sqrt", ...seq("16"), "="]).expr, "4");
  assert.equal(run(["2", "π", "="]).expr, "6.28318530718");
  assert.equal(run(["%"]).expr, "", "percent needs something before it");
});

test("plus/minus toggles the last number", () => {
  assert.equal(run([...seq("5"), "neg"]).expr, "(-5)");
  assert.equal(run([...seq("5"), "neg", "neg"]).expr, "5");
  assert.equal(run([...seq("2+8"), "neg"]).expr, "2+(-8)");
  assert.equal(run([...seq("2+8"), "neg", "="]).expr, "-6");
  assert.equal(run(["neg"]).expr, "-");
});

test("backspace and clear", () => {
  assert.equal(run([...seq("123"), "back"]).expr, "12");
  assert.equal(run(["fn:sqrt", "back"]).expr, "", "removes the whole sqrt( token");
  assert.equal(run([...seq("2+3"), "=", "back"]).expr, "", "backspace after a result clears");
  assert.equal(run([...seq("2+3"), "clear"]).expr, "");
});

test("errors keep the expression so it can be fixed", () => {
  const s = run([...seq("1/0"), "="]);
  assert.equal(s.error, "Divide by zero");
  assert.equal(s.expr, "1/0");
  assert.equal(run(["4"], s).error, "", "typing clears the error");
});

test("equals on an empty or half-typed expression", () => {
  assert.equal(equals(INITIAL).state.expr, "");
  assert.equal(run([...seq("2+"), "="]).expr, "2", "trailing operator is dropped");
});

test("live preview", () => {
  assert.equal(preview("2+3"), "5");
  assert.equal(preview("(2+3"), "5");
  assert.equal(preview("2+"), null, "bare number: nothing to show");
  assert.equal(preview("12"), null);
  assert.equal(preview(""), null);
  assert.equal(preview("1/0"), null);
});

test("keyboard mapping", () => {
  assert.equal(keyFromEvent("7"), "7");
  assert.equal(keyFromEvent("Enter"), "equals");
  assert.equal(keyFromEvent("x"), "*");
  assert.equal(keyFromEvent(","), ".");
  assert.equal(keyFromEvent("Backspace"), "back");
  assert.equal(keyFromEvent("Tab"), null);
  assert.equal(keyFromEvent("Escape"), null, "Esc is left for closing the panel");
});

test("display uses real operator glyphs", () => {
  assert.equal(pretty("2*3/4-1"), "2×3÷4−1");
  assert.equal(pretty("sqrt(144*2)"), "√(144×2)");
});
