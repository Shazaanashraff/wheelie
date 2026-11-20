/**
 * Calculator expression parser (no eval).
 *
 *   expr   = term (("+" | "-") term)*
 *   term   = unary (("*" | "/" | "%" | <implicit>) unary)*
 *   unary  = ("-" | "+") unary | power
 *   power  = postfix ("^" unary)?            right-associative
 *   postfix= primary ("!" | "%")*            "%" here means percent: 50% = 0.5
 *   primary= number | name "(" args ")" | name | "(" expr ")"
 */

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };

function tokenize(src: string): Tok[] {
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/\*\*/g, "^").replace(/π/g, "pi");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (!m) throw new Error("Bad number");
      // "2e" followed by a letter would be implicit multiplication by e; only accept real exponents.
      out.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
    } else if (/[a-z]/i.test(c)) {
      const m = /^[a-z][a-z0-9]*/i.exec(s.slice(i))!;
      out.push({ t: "id", v: m[0].toLowerCase() });
      i += m[0].length;
    } else if ("+-*/^%!(),".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else {
      throw new Error(`Unexpected "${c}"`);
    }
  }
  return out;
}

export function evaluate(src: string): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string, k = p) => toks[k]?.t === "op" && (toks[k] as any).v === v;
  const startsOperand = (k: number) => {
    const t = toks[k];
    return !!t && (t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "("));
  };

  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = (toks[p++] as any).v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp("*") || isOp("/") || (isOp("%") && startsOperand(p + 1))) {
        const op = (toks[p++] as any).v;
        const r = unary();
        if ((op === "/" || op === "%") && r === 0) throw new Error("Divide by zero");
        v = op === "*" ? v * r : op === "/" ? v / r : v % r;
      } else if (startsOperand(p)) {
        v *= unary(); // implicit multiplication: 2pi, 3(4+1)
      } else return v;
    }
  }
  function unary(): number {
    if (isOp("-")) {
      p++;
      return -unary();
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return power();
  }
  function power(): number {
    const base = postfix();
    if (isOp("^")) {
      p++;
      return Math.pow(base, unary());
    }
    return base;
  }
  function postfix(): number {
    let v = primary();
    for (;;) {
      if (isOp("!")) {
        p++;
        v = factorial(v);
      } else if (isOp("%") && !startsOperand(p + 1)) {
        p++;
        v /= 100;
      } else return v;
    }
  }
  function primary(): number {
    const t = peek();
    if (!t) throw new Error("Unexpected end");
    if (t.t === "num") {
      p++;
      return t.v;
    }
    if (t.t === "id") {
      p++;
      if (isOp("(")) {
        const fn = Object.hasOwn(FUNCS, t.v) ? FUNCS[t.v] : undefined;
        if (!fn) throw new Error(`Unknown function ${t.v}`);
        p++;
        const args: number[] = [];
        if (!isOp(")")) {
          args.push(expr());
          while (isOp(",")) {
            p++;
            args.push(expr());
          }
        }
        if (!isOp(")")) throw new Error("Missing )");
        p++;
        return fn(...args);
      }
      if (Object.hasOwn(CONSTS, t.v)) return CONSTS[t.v];
      throw new Error(`Unknown name ${t.v}`);
    }
    if (t.v === "(") {
      p++;
      const v = expr();
      if (!isOp(")")) throw new Error("Missing )");
      p++;
      return v;
    }
    throw new Error(`Unexpected "${t.v}"`);
  }

  const result = expr();
  if (p < toks.length) throw new Error("Unexpected input");
  if (!Number.isFinite(result)) throw new Error("Not a number");
  return result;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("Bad factorial");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Trim floating-point noise: 0.1+0.2 -> "0.3". */
export function format(n: number): string {
  if (Object.is(n, -0)) return "0";
  return String(Number(n.toPrecision(12)));
}
