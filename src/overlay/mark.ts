/** The Wheelie character as a small static mark (the app's brand in the sidebar), drawn from the same sprite. */
import { BODY, COLS, EYES, FEET, ROWS } from "./sprite.ts";

const NS = "http://www.w3.org/2000/svg";

/** `px` CSS pixels per sprite pixel; use a whole number to keep the edges sharp. */
export function wheelieMark(px = 2): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "wheelie-mark");
  svg.setAttribute("viewBox", `0 0 ${COLS} ${ROWS}`);
  svg.setAttribute("width", String(COLS * px));
  svg.setAttribute("height", String(ROWS * px));
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  const add = (c: number, r: number, cls: string) => {
    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", String(c));
    rect.setAttribute("y", String(r));
    rect.setAttribute("width", "1");
    rect.setAttribute("height", "1");
    rect.setAttribute("class", cls);
    svg.append(rect);
  };
  BODY.forEach((line, r) => [...line].forEach((ch, c) => ch !== "." && add(c, r, `px px-${ch}`)));
  [...FEET[0]].forEach((ch, c) => ch !== "." && add(c, BODY.length, "px px-4"));
  for (const c of [EYES.left, EYES.right]) for (const r of [EYES.top, EYES.top + 1]) add(c, r, "px px-eye");
  return svg;
}
