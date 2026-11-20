/**
 * Wheelie's own icon set: hand-drawn 24x24 line icons with built-in motion.
 *
 * Parts that move carry a class (`.k`, `.hand`, `.shackle` ...). The animation
 * rules live in `iconMotion.css`, and play while a slice is hovered, an
 * `.anim-host` is hovered, or an `.anim-play` ancestor says so.
 *
 * Colour, weight and duotone fill come from CSS variables, so every icon
 * follows the user's appearance settings. `.f` marks shapes that get the
 * duotone fill.
 */

const dot = (cx: number, cy: number, r: number, cls: string, i: number) =>
  `<circle class="${cls}" style="--i:${i}" cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;
const draw = (d: string, i: number, cls = "ln") => `<path class="${cls}" pathLength="1" style="--i:${i}" d="${d}"/>`;

/** Icons that represent a tool. */
export const TOOL_ICONS: Record<string, string> = {
  calc:
    `<rect class="f" x="5" y="3" width="14" height="18" rx="2.5"/><rect x="8" y="6" width="8" height="3" rx=".8"/>` +
    [[8.5, 12.5], [12, 12.5], [15.5, 12.5], [8.5, 16.5], [12, 16.5], [15.5, 16.5]].map(([x, y], i) => dot(x, y, 0.95, "k", i)).join(""),
  clock:
    `<circle class="f" cx="12" cy="13.5" r="7.5"/><path d="M12 2.5v3M9.5 2.5h5"/><path class="hand" d="M12 13.5V9"/>` + dot(12, 13.5, 0.9, "hub", 0),
  notes: `<path class="f" d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>${draw("M9 12.5h7", 0)}${draw("M9 16.5h5", 1)}`,
  todo: `${draw("M4 6.5l1.8 1.8L9 5", 0, "ck")}${draw("M4 14.5l1.8 1.8L9 13", 1, "ck")}${draw("M12 7h8", 0)}${draw("M12 15h8", 1)}`,
  clipboard:
    `<rect class="f" x="6" y="5" width="12" height="16" rx="2"/><path class="clip" d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>${draw("M9 11h6", 0)}${draw("M9 15h6", 1)}`,
  units: `<path class="a1" d="M4 8h14M14.5 4.5L18 8l-3.5 3.5"/><path class="a2" d="M20 16H6M9.5 12.5L6 16l3.5 3.5"/>`,
  links: `<path class="l1" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path class="l2" d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>`,
  apps: [[4, 4], [13, 4], [4, 13], [13, 13]].map(([x, y], i) => `<rect class="sq f" style="--i:${i}" x="${x}" y="${y}" width="7" height="7" rx="1.8"/>`).join(""),
  colors:
    `<path class="f" d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.7 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/>` +
    [[7.5, 11.5], [10, 7.5], [14.5, 7.5], [17, 11]].map(([x, y], i) => dot(x, y, 1.05, "pt", i)).join(""),
  snippets:
    `<path class="bl" d="M9 4C7 4 6.5 5 6.5 6.5v3C6.5 10.8 5.7 12 4.5 12c1.2 0 2 1.2 2 2.5v3C6.5 19 7 20 9 20"/>` +
    `<path class="br" d="M15 4c2 0 2.5 1 2.5 2.5v3c0 1.3.8 2.5 2 2.5-1.2 0-2 1.2-2 2.5v3c0 1.5-.5 2.5-2.5 2.5"/><path class="cur" d="M12 9v6"/>`,
  passwords: `<rect class="f" x="5" y="11" width="14" height="10" rx="2"/><path class="shackle" d="M8 11V8a4 4 0 0 1 8 0v3"/>` + dot(12, 16, 1.2, "keyhole", 0),
  worldclock: `<circle class="f" cx="12" cy="12" r="9"/><path d="M3 12h18"/><ellipse class="mer" cx="12" cy="12" rx="4" ry="9"/>`,
  ring: `<circle class="f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path class="rg" d="M12 3v5.8M12 15.2V21M3 12h5.8M15.2 12H21"/>`,
  settings: `<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle class="kn1" cx="16" cy="7" r="2"/><circle class="kn2" cx="8" cy="17" r="2"/>`,
  voice:
    `<rect class="f mic" x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>` +
    `<path class="w1" d="M3 9.5v3M21 9.5v3"/><path class="w2" d="M1.5 10.5v1M22.5 10.5v1"/>`,
};

/** Generic icons for launcher slots (apps, folders, links). They share one gentle wobble. */
export const LAUNCH_ICONS: Record<string, string> = {
  globe: TOOL_ICONS.worldclock,
  folder: `<path class="f" d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
  terminal: `<rect class="f" x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 10l3 2.5L7 15M12.5 15h4.5"/>`,
  mail: `<rect class="f" x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 7.5l8 6 8-6"/>`,
  star: `<path class="f" d="M12 3.5l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.9l6-.9z"/>`,
  music: `<path d="M9 18V6l11-2v12"/><circle class="f" cx="6.5" cy="18" r="2.5"/><circle class="f" cx="17.5" cy="16" r="2.5"/>`,
  camera: `<path class="f" d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>`,
  code: `<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>`,
  rocket: `<path class="f" d="M12 3c3.5 2 5 5.5 5 9l-2.5 3h-5L7 12c0-3.5 1.5-7 5-9z"/><circle cx="12" cy="10" r="1.6"/><path d="M9.5 15l-2 4 3-1.5M14.5 15l2 4-3-1.5"/>`,
  bolt: `<path class="f" d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>`,
  game: `<rect class="f" x="3" y="7.5" width="18" height="10" rx="5"/><path d="M8 10.5v4M6 12.5h4"/>` + dot(15.5, 11.5, 0.9, "x", 0) + dot(17.5, 13.5, 0.9, "x", 0),
  heart: `<path class="f" d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 2.4C20 15.4 12 20 12 20z"/>`,
  home: `<path class="f" d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>`,
  chat: `<path class="f" d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/>`,
};

/** Plain UI glyphs (close, add, delete...). Not animated. */
export const UI_ICONS: Record<string, string> = {
  close: `<path d="M6 6l12 12M18 6L6 18"/>`,
  swap: `<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>`,
  trash: `<path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7"/>`,
  chevron: `<path d="M9 6l6 6-6 6"/>`,
  stop: `<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor"/>`,
};

/** Back-compat lookup used by older call sites. */
export const ICONS: Record<string, string> = { ...TOOL_ICONS, ...LAUNCH_ICONS, ...UI_ICONS };

export const LAUNCH_ICON_IDS = Object.keys(LAUNCH_ICONS);

/** Per-tool colours, used when "Colourful icons" is on. */
export const TOOL_COLORS: Record<string, string> = {
  calc: "#ff9f43", clock: "#ff6b6b", notes: "#feca57", todo: "#1dd1a1", clipboard: "#54a0ff", units: "#a29bfe", links: "#48dbfb", apps: "#ff9ff3",
  ring: "#7c8cff", colors: "#fd79a8", snippets: "#00cec9", passwords: "#fdcb6e", worldclock: "#74b9ff", settings: "#b2bec3", voice: "#ff6b81",
  globe: "#74b9ff", folder: "#feca57", terminal: "#1dd1a1", mail: "#ff7675", star: "#fdcb6e", music: "#a29bfe", camera: "#fd79a8", code: "#00cec9",
  rocket: "#ff9f43", bolt: "#ffe66d", game: "#6c5ce7", heart: "#ff6b81", home: "#55efc4", chat: "#4ecdc4",
};

const NS = "http://www.w3.org/2000/svg";

/** Build an icon element. `id` is a key of TOOL_ICONS / LAUNCH_ICONS / UI_ICONS. */
export function ic(id: string, size = 22): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  const generic = id in LAUNCH_ICONS && !(id in TOOL_ICONS);
  svg.setAttribute("class", `ic ic-${id}${generic ? " ic-g" : ""}`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.style.setProperty("--tool-color", TOOL_COLORS[id] ?? "currentColor");
  svg.innerHTML = generic ? `<g class="gw">${ICONS[id] ?? ICONS.rocket}</g>` : ICONS[id] ?? ICONS.rocket;
  return svg;
}
