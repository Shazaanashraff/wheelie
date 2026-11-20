import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, format } from "./calcparse.ts";

const calc = (s: string) => format(evaluate(s));

test("precedence and parentheses", () => {
  assert.equal(calc("2+3*4"), "14");
  assert.equal(calc("(2+3)*4"), "20");
  assert.equal(calc("10-4-3"), "3");
  assert.equal(calc("100/10/2"), "5");
});

test("power is right associative and binds tighter than unary minus", () => {
  assert.equal(calc("2^3^2"), "512");
  assert.equal(calc("-2^2"), "-4");
  assert.equal(calc("2**10"), "1024");
});

test("percent: postfix vs modulo", () => {
  assert.equal(calc("50%"), "0.5");
  assert.equal(calc("200*10%"), "20");
  assert.equal(calc("7%3"), "1");
});

test("functions, constants, implicit multiplication", () => {
  assert.equal(calc("sqrt(16)"), "4");
  assert.equal(calc("max(1,5,3)"), "5");
  assert.equal(calc("2pi"), "6.28318530718");
  assert.equal(calc("3(4+1)"), "15");
  assert.equal(calc("5!"), "120");
});

test("float noise is trimmed", () => {
  assert.equal(calc("0.1+0.2"), "0.3");
});

test("unicode operators", () => {
  assert.equal(calc("6×7"), "42");
  assert.equal(calc("8÷2"), "4");
});

test("errors", () => {
  assert.throws(() => evaluate("1/0"), /Divide by zero/);
  assert.throws(() => evaluate("2+"), /Unexpected end/);
  assert.throws(() => evaluate("(1+2"), /Missing \)/);
  assert.throws(() => evaluate("foo(1)"), /Unknown function/);
  assert.throws(() => evaluate("1 $ 2"), /Unexpected/);
  // Code-looking input is rejected, never executed.
  assert.throws(() => evaluate("require('fs')"));
  assert.throws(() => evaluate("constructor"), /Unknown name/);
});

test("inherited object properties are not functions or constants", () => {
  assert.throws(() => evaluate("constructor(1)"), /Unknown function/);
  assert.throws(() => evaluate("toString"), /Unknown name/);
});
