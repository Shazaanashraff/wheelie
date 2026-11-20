/** Colour parsing and conversion for the colour picker. Pure and unit tested. */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const byte = (n: number) => clamp(Math.round(n), 0, 255);

/** Accepts #rgb, #rrggbb, rrggbb, "r, g, b" and rgb(r g b) / rgb(r, g, b). */
export function parseColor(input: string): RGB | null {
  const s = input.trim().toLowerCase();
  let m = /^#?([0-9a-f]{3})$/.exec(s);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  m = /^#?([0-9a-f]{6})$/.exec(s);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) };
  m = /^(?:rgb\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/.exec(s);
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    if ([r, g, b].every((v) => v <= 255)) return { r, g, b };
  }
  return null;
}

export const toHex = ({ r, g, b }: RGB) => "#" + [r, g, b].map((v) => byte(v).toString(16).padStart(2, "0")).join("");
export const toRgbString = ({ r, g, b }: RGB) => `rgb(${byte(r)}, ${byte(g)}, ${byte(b)})`;

export function toHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r, g, b].map((v) => v / 255);
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const toHslString = (c: RGB) => {
  const { h, s, l } = toHsl(c);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

/** Relative luminance (WCAG). */
function luminance({ r, g, b }: RGB): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Black or white, whichever reads better on this colour. */
export const textOn = (c: RGB): "#000000" | "#ffffff" => (luminance(c) > 0.179 ? "#000000" : "#ffffff");

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
