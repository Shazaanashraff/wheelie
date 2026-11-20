/**
 * The Wheelie character as a pixel sprite: one source for the animated character in the ring's
 * centre and for the app icon (scripts/make-icons.mjs), so they always match.
 *
 * Body rows use `1` (the main colour), `3` (highlight), `4` (shade) and `.` (empty). The eyes,
 * mouth and feet are separate so they can move on their own.
 */
export const COLS = 12;

export const BODY: readonly string[] = [
  "....1111....",
  "..11111111..",
  ".1311111111.",
  ".1311111111.",
  "111111111111",
  "111111111111",
  "111111111111",
  "111111111114",
  "111111111144",
  ".1111111144.",
];

/** Two frames of the feet, tapped one after the other while it idles. */
export const FEET: readonly [string, string] = [".11......11.", "..11....11.."];

/** Eyes are one pixel wide and two tall: columns, and the row of the top pixel. */
export const EYES = { left: 3, right: 8, top: 5 } as const;

/** The smile it makes when happy, as [column, row]. */
export const SMILE: readonly (readonly [number, number])[] = [
  [4, 7],
  [7, 7],
  [5, 8],
  [6, 8],
];

/** Total rows, body plus feet. */
export const ROWS = BODY.length + 1;

/** Fixed colours, for places that cannot use the theme (the app icon). In the app these come from the accent. */
export const ICON_COLORS = { "1": "#7c8cff", "3": "#b9c1ff", "4": "#5b69d6", ink: "#16181d" } as const;
