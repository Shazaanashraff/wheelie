/** Password generation with the browser's cryptographic RNG. Pure and unit tested. */

export interface PassOpts {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  /** Leave out look-alike characters: 0 O o 1 l I | */
  avoidAmbiguous: boolean;
}

export const DEFAULT_OPTS: PassOpts = { length: 20, lower: true, upper: true, digits: true, symbols: true, avoidAmbiguous: false };

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
} as const;
const AMBIGUOUS = /[0Oo1lI|]/g;

/** Random integer in [0, max) from a source of random 32-bit words. */
export type Rand = (max: number) => number;

/** Uniform integer via rejection sampling, so there is no modulo bias. */
export const cryptoInt: Rand = (max) => {
  if (max <= 0 || max > 2 ** 32) throw new RangeError("max out of range");
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
};

export function activeSets(o: PassOpts): string[] {
  const keys = (["lower", "upper", "digits", "symbols"] as const).filter((k) => o[k]);
  return keys.map((k) => (o.avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, "") : SETS[k])).filter((s) => s.length > 0);
}

export const clampLength = (n: number) => Math.min(64, Math.max(8, Math.round(n) || 20));

/** Always contains at least one character from every selected set. */
export function generate(o: PassOpts, rand: Rand = cryptoInt): string {
  const sets = activeSets(o);
  if (sets.length === 0) return "";
  const len = Math.max(clampLength(o.length), sets.length);
  const pool = sets.join("");
  const chars = sets.map((s) => s[rand(s.length)]); // one guaranteed from each set
  while (chars.length < len) chars.push(pool[rand(pool.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1); // Fisher-Yates, so the guaranteed characters aren't always first
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function entropyBits(o: PassOpts): number {
  const pool = activeSets(o).join("").length;
  return pool ? Math.round(clampLength(o.length) * Math.log2(pool)) : 0;
}

export function strengthLabel(bits: number): "Weak" | "Fair" | "Strong" | "Excellent" {
  return bits < 50 ? "Weak" : bits < 80 ? "Fair" : bits < 110 ? "Strong" : "Excellent";
}
