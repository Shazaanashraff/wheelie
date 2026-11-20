import { ic } from "../core/icons.ts";
import { SPRINGS, Spring, loop, motionLevel, springEasing } from "../core/motion.ts";
import type { Glance } from "../tools/glance.ts";
import { createMascot } from "./mascot.ts";
import { R_IN, R_OUT, hitTest, influence, polar, sliceAngle, sliceCenter } from "./ringmath.ts";

export { R_IN, R_OUT, hitTest };

const GAP = 0.025; // radians trimmed from each slice edge
const LEAN = 7; // px a hovered slice moves toward the pointer
const STAGGER = 24; // ms between slices as the ring blooms open

export interface Slice {
  id: string;
  name: string;
  /** Icon id from the icon set. */
  icon: string;
  /** What the hub shows while this slice is hovered: a headline, a line under it, and optional progress. */
  glance?: () => Glance;
}

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
  const [ox0, oy0] = polar(R_OUT, a0);
  const [ox1, oy1] = polar(R_OUT, a1);
  const [ix1, iy1] = polar(R_IN, a1);
  const [ix0, iy0] = polar(R_IN, a0);
  return (
    `M${f(ox0)} ${f(oy0)}A${R_OUT} ${R_OUT} 0 ${large} 1 ${f(ox1)} ${f(oy1)}` +
    `L${f(ix1)} ${f(iy1)}A${R_IN} ${R_IN} 0 ${large} 0 ${f(ix0)} ${f(iy0)}Z`
  );
}

export interface RingView {
  readonly sliceCount: number;
  /** Highlight a slice (-1 for none) and update the hub label. */
  setHover(i: number): void;
  /** Mark one slice as selected (an outline), e.g. in the slot editor. -1 clears it. */
  setSelected(i: number): void;
  /** Pointer position relative to the ring centre: drives lean, magnification, tilt and the highlight. */
  setPointer(dx: number, dy: number): void;
  /** The choosing animation: the picked slice pulses, the rest recede. Resolves when it has played. */
  commit(i: number): Promise<void>;
  /** Fade the ring away. Resolves when it has played. */
  close(): Promise<void>;
  /** Play the launch animation again. */
  replayOpen(): void;
  /** Where a slice's icon is, in the root element's coordinates. */
  slicePoint(i: number): { x: number; y: number };
  destroy(): void;
}

export interface RingOptions {
  /** Play the launch animation right away (default true). */
  animateIn?: boolean;
}

const PROGRESS_R = 51; // radius of the progress arc, inside the hub

/** Build the ring into `root`, centred at (cx, cy) in CSS px. */
export function renderRing(root: HTMLElement, slices: Slice[], cx: number, cy: number, opts: RingOptions = {}): RingView {
  const ns = "http://www.w3.org/2000/svg";
  const n = slices.length;
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  root.replaceChildren();

  const svg = el("svg", { class: "ring-svg" });
  svg.style.transformOrigin = `${cx}px ${cy}px`;

  const g = el("g", { transform: `translate(${cx} ${cy})`, class: "ring-g" });
  svg.append(g);

  type Part = { wrap: SVGGElement; slice: SVGGElement; icon: SVGGElement; lx: number; ly: number };
  const parts: Part[] = [];
  slices.forEach((s, i) => {
    const mid = sliceAngle(i, n);
    const wrap = el("g", { class: "slice-wrap" });
    const slice = el("g", { class: "slice", "data-id": s.id });
    const path = el("path", { d: slicePath(i, n), "fill-rule": "evenodd" });
    slice.append(path);

    const { x: ix, y: iy } = sliceCenter(i, n);
    const place = el("g", { transform: `translate(${f(ix - 15)} ${f(iy - 18)})` });
    const icon = el("g", { class: "slice-icon" });
    icon.append(ic(s.icon, 30));
    place.append(icon);
    slice.append(place);

    const num = el("text", { x: f(ix), y: f(iy + 28), class: "slice-num", "text-anchor": "middle" });
    num.textContent = String(i + 1);
    slice.append(num);

    wrap.append(slice);
    g.append(wrap);
    parts.push({ wrap, slice, icon, lx: Math.sin(mid) * LEAN, ly: -Math.cos(mid) * LEAN });
  });

  const orbit = el("circle", { r: String(R_IN - 3), class: "hub-orbit" });
  const hub = el("circle", { r: String(R_IN - 6), class: "hub" });
  const mascot = createMascot();

  // What the hub shows while a slice is hovered: the tool's name, a headline, a line under it,
  // and a progress arc when the tool has progress.
  const info = el("g", { class: "hub-info" });
  const track = el("circle", { r: String(PROGRESS_R), class: "hub-track" });
  const arc = el("circle", { r: String(PROGRESS_R), class: "hub-arc", pathLength: "1", "stroke-dasharray": "1 1", transform: "rotate(-90)" });
  const nameT = el("text", { class: "hub-name", "text-anchor": "middle", y: "-13" });
  const valueT = el("text", { class: "hub-value", "text-anchor": "middle", y: "9" });
  const subT = el("text", { class: "hub-sub", "text-anchor": "middle", y: "25" });
  info.append(track, arc, nameT, valueT, subT);
  g.append(orbit, hub, mascot.el, info);
  root.append(svg);

  // Slices bloom out of the ring's centre: give each wrapper that point as its origin.
  for (const p of parts) {
    const b = p.wrap.getBBox();
    p.wrap.style.transformBox = "fill-box";
    p.wrap.style.transformOrigin = `${f(-b.x)}px ${f(-b.y)}px`;
  }

  // ---- live motion: springs -------------------------------------------------
  const lift = slices.map(() => new Spring(0, SPRINGS.snappy)); // hover: lean + grow
  const gone = slices.map(() => new Spring(0, SPRINGS.smooth)); // choosing: recede
  const bump = slices.map(() => new Spring(0, SPRINGS.bouncy)); // choosing: pulse
  const tiltX = new Spring(0, SPRINGS.soft);
  const tiltY = new Spring(0, SPRINGS.soft);
  const infoS = new Spring(0, SPRINGS.snappy); // hub: info in, character out
  const arcOn = new Spring(0, SPRINGS.smooth); // progress arc visible
  const prog = new Spring(0, SPRINGS.smooth); // progress arc length
  const all = [...lift, ...gone, ...bump, tiltX, tiltY, infoS, arcOn, prog];

  let hover = -1;
  let ptr = { dx: 0, dy: 0 };
  let dead = false;
  let committed = false;

  const apply = () => {
    parts.forEach((p, i) => {
      const l = lift[i].value;
      const gn = gone[i].value;
      const s = 1 + 0.045 * l + 0.07 * bump[i].value - 0.14 * gn;
      p.slice.style.transform = `translate(${f(p.lx * l)}px, ${f(p.ly * l)}px) scale(${s.toFixed(4)})`;
      p.wrap.style.opacity = String(Math.max(0, 1 - gn));
      p.icon.style.transform = `scale(${(1 + 0.16 * l).toFixed(4)})`;
    });
    const iv = Math.max(0, Math.min(1, infoS.value));
    info.style.opacity = f(Math.max(0, (iv - 0.35) / 0.65)); // arrives just after the character has gone
    info.style.transform = `translateY(${f((1 - iv) * 5)}px)`;
    const ao = Math.max(0, Math.min(1, arcOn.value));
    arc.style.opacity = f(ao);
    track.style.opacity = f(ao);
    arc.setAttribute("stroke-dashoffset", f(1 - Math.max(0, Math.min(1, prog.value))));
    const tilt = Math.abs(tiltX.value) > 0.01 || Math.abs(tiltY.value) > 0.01;
    svg.style.transform = tilt ? `perspective(900px) rotateX(${tiltX.value.toFixed(3)}deg) rotateY(${tiltY.value.toFixed(3)}deg)` : "";
  };

  const tick = (dt: number) => {
    if (dead) return false;
    for (const s of all) s.step(dt);
    apply();
    return all.some((s) => !s.settled);
  };

  const retarget = () => {
    if (committed) return;
    const level = motionLevel();
    const full = level === "full";
    const w = full ? influence(ptr.dx, ptr.dy, n) : [];
    lift.forEach((s, i) => s.set(i === hover ? 1 : full ? 0.4 * (w[i] ?? 0) : 0));
    const nx = Math.max(-1, Math.min(1, ptr.dx / R_OUT));
    const ny = Math.max(-1, Math.min(1, ptr.dy / R_OUT));
    const inRing = Math.hypot(ptr.dx, ptr.dy) > R_IN * 0.9;
    tiltX.set(full && inRing ? -ny * 3.2 : 0);
    tiltY.set(full && inRing ? nx * 3.2 : 0);
    if (level === "off") {
      all.forEach((s) => s.snap(s.target));
      apply();
    } else loop.add(tick);
  };

  const view: RingView = {
    sliceCount: n,

    setHover(i) {
      if (i === hover) return;
      hover = i;
      parts.forEach((p, k) => p.slice.classList.toggle("hover", k === i));
      showInfo(i);
      retarget();
    },

    setSelected(i) {
      parts.forEach((p, k) => p.slice.classList.toggle("selected", k === i));
    },

    setPointer(dx, dy) {
      ptr = { dx, dy };
      mascot.look(dx, dy);
      mascot.setMood(hover < 0 && Math.hypot(dx, dy) < R_IN * 0.9 ? "happy" : "calm");
      retarget();
    },

    commit(i) {
      committed = true;
      const level = motionLevel();
      lift[i]?.set(1);
      bump[i]?.set(1);
      // The picked slice pulses, then dissolves into the panel growing out of it.
      setTimeout(() => {
        bump[i]?.set(0);
        gone[i]?.set(1);
        loop.add(tick);
      }, level === "full" ? 80 : 0);
      gone.forEach((s, j) => s.set(j === i ? 0 : 1));
      tiltX.set(0);
      tiltY.set(0);
      if (level === "off") {
        all.forEach((s) => s.snap(s.target));
        apply();
        return Promise.resolve();
      }
      loop.add(tick);
      return new Promise((res) => setTimeout(res, level === "full" ? 240 : 80));
    },

    close() {
      committed = true;
      if (motionLevel() === "off") return Promise.resolve();
      const a = svg.animate(
        [
          { opacity: 1, transform: svg.style.transform || "none" },
          { opacity: 0, transform: "scale(0.94)" },
        ],
        { duration: 150, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
      );
      return a.finished.then(() => undefined).catch(() => undefined);
    },

    replayOpen: () => playOpen(),

    slicePoint(i) {
      const { x, y } = sliceCenter(i, n);
      return { x: cx + x, y: cy + y };
    },

    destroy() {
      dead = true;
      clearInterval(liveTimer);
      mascot.destroy();
      loop.remove(tick);
      svg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      root.replaceChildren();
    },
  };

  // ---- the hub: the character while nothing is hovered, the tool's info while something is ----
  let liveTimer: number | undefined;
  let shownGlance = "";
  const paint = (gl: Glance) => {
    const key = `${gl.name}|${gl.value}|${gl.sub}`;
    if (key !== shownGlance) {
      shownGlance = key;
      nameT.textContent = gl.name;
      valueT.textContent = gl.value;
      subT.textContent = gl.sub;
    }
    arcOn.set(gl.progress === null ? 0 : 1);
    if (gl.progress !== null) prog.set(gl.progress);
  };
  function showInfo(i: number) {
    clearInterval(liveTimer);
    const gl = i >= 0 ? (slices[i].glance?.() ?? { name: slices[i].name, value: slices[i].name, sub: "", progress: null, live: false }) : null;
    if (gl) {
      paint(gl);
      // Jump the arc to where it is now, rather than sweeping up from the last tool's value.
      if (gl.progress !== null && arcOn.value < 0.05) prog.snap(gl.progress);
      if (gl.live)
        liveTimer = window.setInterval(() => {
          const next = slices[i].glance?.();
          if (next) {
            paint(next);
            loop.add(tick);
          }
        }, 250);
    } else arcOn.set(0);
    infoS.set(gl ? 1 : 0);
    mascot.setShown(!gl);
    mascot.setMood("calm");
    loop.add(tick);
  }

  // ---- the launch: bloom out of the centre, clockwise, with spring overshoot ---------
  function playOpen() {
    const level = motionLevel();
    if (level === "off") return;
    const full = level === "full";
    const bounce = springEasing(SPRINGS.bouncy);
    const soft = springEasing(SPRINGS.soft);
    const blur = full ? 8 : 0;
    svg.animate(
      [
        { opacity: 0, transform: "scale(0.86)", filter: `blur(${blur}px)` },
        { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
      ],
      { duration: soft.duration, easing: soft.easing, fill: "backwards" },
    );
    parts.forEach((p, i) => {
      const delay = full ? i * STAGGER : 0;
      p.wrap.animate(
        [
          { opacity: 0, transform: full ? "scale(0.45) rotate(-18deg)" : "scale(0.9)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: bounce.duration, easing: bounce.easing, delay, fill: "backwards" },
      );
      if (full) {
        p.icon.animate(
          [
            { opacity: 0, transform: "scale(0.35)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: soft.duration, easing: soft.easing, delay: delay + 70, fill: "backwards" },
        );
      }
    });
    (hub as SVGElement).style.transformBox = "fill-box";
    (hub as SVGElement).style.transformOrigin = "center";
    hub.animate(
      [
        { opacity: 0, transform: "scale(0.3)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: bounce.duration, easing: bounce.easing, fill: "backwards" },
    );
    mascot.enter();
  }

  apply();
  if (opts.animateIn !== false) playOpen();
  return view;
}
