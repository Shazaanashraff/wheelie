/** Theme presets and the code that applies appearance settings to the document. */
import type { Settings } from "./model.ts";
import { SPRINGS, springEasing } from "./motion.ts";

export interface Palette {
  id: string;
  name: string;
  scheme: "dark" | "light";
  bg: string;
  bg2: string;
  bg3: string;
  line: string;
  fg: string;
  muted: string;
  /** Slice fill, as a function of the user's opacity setting. */
  seg: (alpha: number) => string;
  segLine: string;
  /** The theme's own accent, used until the user picks one. */
  accent: string;
}

const rgba = (rgb: string) => (a: number) => `rgba(${rgb}, ${a})`;

export const PALETTES: Palette[] = [
  { id: "dark", name: "Dark", scheme: "dark", bg: "#14161b", bg2: "#1c1f26", bg3: "#252932", line: "#2d323c", fg: "#eceef3", muted: "#8b92a1", seg: rgba("22,24,30"), segLine: "rgba(255,255,255,.12)", accent: "#7c8cff" },
  { id: "light", name: "Light", scheme: "light", bg: "#fbfbfd", bg2: "#f1f2f6", bg3: "#e6e8ef", line: "#dcdfe8", fg: "#1b1d24", muted: "#6b7280", seg: rgba("251,251,253"), segLine: "rgba(0,0,0,.16)", accent: "#5b6cff" },
  { id: "midnight", name: "Midnight", scheme: "dark", bg: "#0b1020", bg2: "#121a33", bg3: "#1b2547", line: "#263360", fg: "#e6ecff", muted: "#8a97c4", seg: rgba("11,16,32"), segLine: "rgba(140,170,255,.2)", accent: "#5fa8ff" },
  { id: "graphite", name: "Graphite", scheme: "dark", bg: "#161616", bg2: "#1f1f1f", bg3: "#2a2a2a", line: "#333333", fg: "#f2f2f2", muted: "#9a9a9a", seg: rgba("20,20,20"), segLine: "rgba(255,255,255,.13)", accent: "#e5e5e5" },
  { id: "sunset", name: "Sunset", scheme: "dark", bg: "#1d1417", bg2: "#271a1e", bg3: "#33222a", line: "#43303a", fg: "#ffeee6", muted: "#c49a8f", seg: rgba("29,20,23"), segLine: "rgba(255,170,140,.2)", accent: "#ff7a59" },
  { id: "forest", name: "Forest", scheme: "dark", bg: "#0f1a15", bg2: "#15231c", bg3: "#1d3128", line: "#2a4538", fg: "#e7f5ec", muted: "#8bb09b", seg: rgba("15,26,21"), segLine: "rgba(140,255,190,.18)", accent: "#3ddc84" },
  { id: "rose", name: "Rose", scheme: "light", bg: "#fff7f9", bg2: "#fdeaf0", bg3: "#f9d9e3", line: "#f0c4d3", fg: "#3a1d28", muted: "#9a6677", seg: rgba("255,247,249"), segLine: "rgba(120,30,60,.2)", accent: "#e5487a" },
  {
    id: "tinted", name: "Tinted", scheme: "dark",
    bg: "color-mix(in srgb, var(--accent) 10%, #101218)",
    bg2: "color-mix(in srgb, var(--accent) 14%, #171a21)",
    bg3: "color-mix(in srgb, var(--accent) 20%, #1d212a)",
    line: "color-mix(in srgb, var(--accent) 24%, #262a35)",
    fg: "#eceef3", muted: "color-mix(in srgb, var(--accent) 25%, #8b92a1)",
    seg: (a) => `color-mix(in srgb, var(--accent) 16%, rgba(16,18,24,${a}))`,
    segLine: "rgba(255,255,255,.13)", accent: "#7c8cff",
  },
];

export const THEME_IDS = PALETTES.map((p) => p.id);
export const paletteOf = (id: string): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

export const ACCENTS = ["#7c8cff", "#5fa8ff", "#2dd4bf", "#3ddc84", "#facc15", "#ff9f43", "#ff7a59", "#f43f5e", "#e5487a", "#c084fc"];

const WEIGHT = { thin: "1.25", regular: "1.7", bold: "2.2" } as const;

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/**
 * Text colour for something filled with `accent`: white while it reads clearly (contrast of at least 3:1,
 * the WCAG bar for large and bold UI text), otherwise near-black. Light accents such as Graphite's
 * would otherwise show white on pale grey.
 */
export function onAccent(accent: string): string {
  return 1.05 / (luminance(accent) + 0.05) >= 3 ? "#ffffff" : "#14161b";
}

/** The accent in force: the user's pick, else the theme's own. */
export const effectiveAccent = (s: Settings): string => s.accent || paletteOf(s.theme).accent;

/** Everything the stylesheet needs, as CSS custom properties. Pure, so it can be tested. */
export function buildVars(s: Settings): Record<string, string> {
  const p = paletteOf(s.theme);
  const accent = effectiveAccent(s);
  return {
    "--accent": accent,
    "--on-accent": onAccent(accent),
    "--bg": p.bg,
    "--bg2": p.bg2,
    "--bg3": p.bg3,
    "--line": p.line,
    "--fg": p.fg,
    "--muted": p.muted,
    "--seg": p.seg(s.ringOpacity),
    "--seg-line": p.segLine,
    "--icon-stroke": WEIGHT[s.iconWeight],
    "--shadow": p.scheme === "light" ? "0 10px 40px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.06)" : "0 10px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.06)",
  };
}

/** Spring easings and their settle times as CSS variables: `transition: transform var(--spring-ms) var(--spring)`. */
export function springVars(): Record<string, string> {
  const soft = springEasing(SPRINGS.soft);
  const snappy = springEasing(SPRINGS.snappy);
  const bouncy = springEasing(SPRINGS.bouncy);
  return {
    "--spring": soft.easing,
    "--spring-ms": `${soft.duration}ms`,
    "--spring-snappy": snappy.easing,
    "--spring-snappy-ms": `${snappy.duration}ms`,
    "--spring-bouncy": bouncy.easing,
    "--spring-bouncy-ms": `${bouncy.duration}ms`,
  };
}

export function applyAppearance(s: Settings, root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries({ ...buildVars(s), ...springVars() })) root.style.setProperty(k, v);
  const d = root.dataset;
  d.scheme = paletteOf(s.theme).scheme;
  d.iconColor = s.iconColor;
  d.iconStyle = s.iconStyle;
  d.motion = s.motion;
}
