import { icon } from "./dom.ts";
import { ICONS } from "./icons.ts";

export const RING_SIZE = 560;
export const R_IN = 62;
export const R_OUT = 218;
const GAP = 0.025; // radians trimmed from each slice edge

export interface Slice {
  id: string;
  name: string;
}

/** Which slice the pointer (relative to the ring centre) is over; -1 = hub / none. Slice 0 is at the top, going clockwise. */
export function hitTest(dx: number, dy: number, n: number): number {
  if (n === 0 || Math.hypot(dx, dy) < R_IN) return -1;
  let a = Math.atan2(dx, -dy);
  if (a < 0) a += 2 * Math.PI;
  const step = (2 * Math.PI) / n;
  return Math.floor(((a + step / 2) % (2 * Math.PI)) / step);
}

const pol = (r: number, t: number): [number, number] => [r * Math.sin(t), -r * Math.cos(t)];
const f = (n: number) => n.toFixed(2);

function slicePath(i: number, n: number): string {
  if (n === 1) {
    return (
      `M0 ${-R_OUT}A${R_OUT} ${R_OUT} 0 1 1 0 ${R_OUT}A${R_OUT} ${R_OUT} 0 1 1 0 ${-R_OUT}Z` +
      `M0 ${-R_IN}A${R_IN} ${R_IN} 0 1 0 0 ${R_IN}A${R_IN} ${R_IN} 0 1 0 0 ${-R_IN}Z`
    );
  }
  const step = (2 * Math.PI) / n;
  const a0 = i * step - step / 2 + GAP;
  const a1 = i * step + step / 2 - GAP;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [ox0, oy0] = pol(R_OUT, a0);
  const [ox1, oy1] = pol(R_OUT, a1);
  const [ix1, iy1] = pol(R_IN, a1);
  const [ix0, iy0] = pol(R_IN, a0);
  return (
    `M${f(ox0)} ${f(oy0)}A${R_OUT} ${R_OUT} 0 ${large} 1 ${f(ox1)} ${f(oy1)}` +
    `L${f(ix1)} ${f(iy1)}A${R_IN} ${R_IN} 0 ${large} 0 ${f(ix0)} ${f(iy0)}Z`
  );
}

export interface RingView {
  setHover(i: number): void;
  sliceCount: number;
}

/** Build the ring into `root`, centred at (cx, cy) in CSS px. */
export function renderRing(root: HTMLElement, slices: Slice[], cx: number, cy: number): RingView {
  const ns = "http://www.w3.org/2000/svg";
  const n = slices.length;
  root.replaceChildren();

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "ring-svg");

  const g = document.createElementNS(ns, "g");
  g.setAttribute("transform", `translate(${cx} ${cy})`);
  g.setAttribute("class", "ring-g");
  svg.append(g);

  const groups: SVGGElement[] = [];
  slices.forEach((s, i) => {
    const sg = document.createElementNS(ns, "g");
    sg.setAttribute("class", "slice");
    sg.setAttribute("data-id", s.id);

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", slicePath(i, n));
    path.setAttribute("fill-rule", "evenodd");
    sg.append(path);

    const mid = n === 1 ? 0 : (i * 2 * Math.PI) / n;
    const [ix, iy] = pol((R_IN + R_OUT) / 2 + 2, mid);
    const fo = document.createElementNS(ns, "g");
    fo.setAttribute("transform", `translate(${f(ix - 15)} ${f(iy - 18)})`);
    fo.setAttribute("class", "slice-icon");
    fo.append(icon(ICONS[s.id] ?? ICONS.apps, 30));
    sg.append(fo);

    const num = document.createElementNS(ns, "text");
    num.setAttribute("x", f(ix));
    num.setAttribute("y", f(iy + 28));
    num.setAttribute("class", "slice-num");
    num.setAttribute("text-anchor", "middle");
    num.textContent = String(i + 1);
    sg.append(num);

    g.append(sg);
    groups.push(sg);
  });

  const hub = document.createElementNS(ns, "circle");
  hub.setAttribute("r", String(R_IN - 6));
  hub.setAttribute("class", "hub");
  g.append(hub);

  const label = document.createElementNS(ns, "text");
  label.setAttribute("class", "hub-label");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("y", "5");
  label.textContent = "Wheelie";
  g.append(label);

  root.append(svg);

  let current = -1;
  return {
    sliceCount: n,
    setHover(i: number) {
      if (i === current) return;
      current = i;
      groups.forEach((sg, k) => sg.classList.toggle("hover", k === i));
      label.textContent = i >= 0 ? slices[i].name : "Wheelie";
      label.classList.toggle("active", i >= 0);
    },
  };
}
