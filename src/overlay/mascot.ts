/**
 * The Wheelie character: a small wheel-creature that lives in the centre of the ring.
 *
 * It is drawn in SVG around (0, 0) and styled with the theme's accent colour. It is alive
 * rather than animated on a loop: its face turns toward the pointer, it blinks at random,
 * hops now and then, and on launch it wakes up and looks around before settling.
 *
 * The ring shows it while nothing is hovered, and swaps it for the hovered tool's info.
 * What it does is scaled by the motion setting: Full does everything, Subtle only blinks and
 * fades, Off is a still picture.
 */
import { SPRINGS, Spring, loop, motionLevel, springEasing } from "../core/motion.ts";
import { CURIOUS, blinkDelay, gaze, hopDelay, isDoubleBlink, pointerTookOver } from "./mascotmath.ts";

const NS = "http://www.w3.org/2000/svg";
const s = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls?: string) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (cls) e.setAttribute("class", cls);
  return e;
};
const f = (n: number) => n.toFixed(2);

/** Drawn at 27px radius; shown this much bigger so it fills the hub (112px across). */
const SIZE = 1.3;

export type Mood = "calm" | "happy";

export interface Mascot {
  /** Add this to the ring's group; it is centred on (0, 0). */
  readonly el: SVGGElement;
  /** The pointer, relative to the ring's centre. */
  look(dx: number, dy: number): void;
  setMood(m: Mood): void;
  /** Show or hide it (the ring hides it while a slice's info is up). Idle behaviours only run while shown. */
  setShown(on: boolean): void;
  /** The launch: wake up, look around, hop. */
  enter(): void;
  destroy(): void;
}

const MOUTH: Record<Mood, string> = {
  calm: "M-4.6 6.6Q0 9.8 4.6 6.6",
  happy: "M-5.6 5.4Q0 12.6 5.6 5.4",
};

export function createMascot(): Mascot {
  // ---- drawing ------------------------------------------------------------
  const root = s("g", {}, "mascot");
  const bob = s("g", {}, "m-bob");
  const body = s("g", {}, "m-body");

  const tire = s("circle", { r: 27 }, "m-tire");
  // Tread marks cut into the tyre band. They spin; the silhouette stays a clean circle.
  const tread = s("g", {}, "m-tread");
  for (let i = 0; i < 12; i++) tread.append(s("rect", { x: -1.5, y: -25.6, width: 3, height: 4.6, rx: 1.5, transform: `rotate(${i * 30})` }, "m-nub"));
  const face = s("circle", { r: 19 }, "m-face");
  const shine = s("path", { d: "M-12.6 -9.6A15.2 15.2 0 0 1 -3 -16" }, "m-shine");

  const look = s("g", {}, "m-look");
  const eyes = [-6.6, 6.6].map((x) => s("ellipse", { cx: x, cy: -2.2, rx: 3.1, ry: 4.4 }, "m-eye"));
  for (const e of eyes) {
    e.style.transformBox = "fill-box";
    e.style.transformOrigin = "center";
  }
  const glad = [-6.6, 6.6].map((x) => s("path", { d: `M${x - 3.2} -0.6Q${x} -6.6 ${x + 3.2} -0.6` }, "m-glad"));
  const mouth = s("path", { d: MOUTH.calm }, "m-mouth");
  look.append(...eyes, ...glad, mouth);

  body.append(tire, tread, face, shine, look);
  bob.append(body);
  root.append(bob);
  for (const n of [root, body, tread]) {
    (n as SVGElement).style.transformBox = "fill-box";
    (n as SVGElement).style.transformOrigin = "center";
  }

  // ---- live motion --------------------------------------------------------
  const gx = new Spring(0, SPRINGS.soft);
  const gy = new Spring(0, SPRINGS.soft);
  const hop = new Spring(0, SPRINGS.bouncy);
  const spin = new Spring(0, SPRINGS.smooth);
  const shown = new Spring(1, SPRINGS.snappy);
  const all = [gx, gy, hop, spin, shown];

  let on = true;
  let mood: Mood = "calm";
  let scripted = false;
  let dead = false;
  const timers = new Set<number>();
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!dead) fn();
    }, ms);
    timers.add(id);
    return id;
  };

  const apply = () => {
    const h = hop.value;
    body.setAttribute(
      "transform",
      `translate(${f(gx.value * 2.2)} ${f(gy.value * 1.6 - 5 * h)}) rotate(${f(gx.value * 5)}) scale(${f(1 - 0.03 * h)} ${f(1 + 0.05 * h)})`,
    );
    look.setAttribute("transform", `translate(${f(gx.value * 4.6)} ${f(gy.value * 3.6)})`);
    tread.setAttribute("transform", `rotate(${f(spin.value)})`);
    const v = Math.max(0, Math.min(1, shown.value));
    root.style.opacity = f(v * v); // fades faster than it shrinks, so it is gone before the hub info arrives
    root.style.transform = `scale(${f(SIZE * (0.55 + 0.45 * Math.max(0, shown.value)))})`;
  };
  const tick = (dt: number) => {
    if (dead) return false;
    for (const sp of all) sp.step(dt);
    apply();
    return all.some((sp) => !sp.settled);
  };
  const run = () => {
    if (motionLevel() === "off") {
      for (const sp of all) sp.snap(sp.target);
      apply();
    } else loop.add(tick);
  };

  const blink = () => {
    if (motionLevel() === "off") return;
    for (const e of eyes) e.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0.08)" }, { transform: "scaleY(1)" }], { duration: 160, easing: "ease-in-out" });
  };

  // ---- idle life ----------------------------------------------------------
  const scheduleBlink = () => {
    later(blinkDelay(Math.random()), () => {
      if (on) {
        blink();
        if (isDoubleBlink(Math.random())) later(230, blink);
      }
      scheduleBlink();
    });
  };
  const doHop = () => {
    hop.set(1);
    spin.set(spin.target + 120);
    run();
    later(120, () => {
      hop.set(0);
      run();
    });
  };
  const scheduleHop = () => {
    later(hopDelay(Math.random()), () => {
      if (on && motionLevel() === "full" && !scripted) doHop();
      scheduleHop();
    });
  };

  const setMoodNow = (m: Mood) => {
    if (m === mood) return;
    mood = m;
    mouth.setAttribute("d", MOUTH[m]);
    root.classList.toggle("happy", m === "happy");
  };

  const api: Mascot = {
    el: root,

    look(dx, dy) {
      if (scripted) {
        if (!pointerTookOver(dx, dy)) return;
        scripted = false;
      }
      const g = gaze(dx, dy);
      gx.set(g.x);
      gy.set(g.y);
      run();
    },

    setMood: setMoodNow,

    setShown(v) {
      on = v;
      shown.set(v ? 1 : 0);
      run();
    },

    enter() {
      const level = motionLevel();
      if (level === "off") return;
      if (level === "full") {
        const bounce = springEasing(SPRINGS.bouncy);
        const soft = springEasing(SPRINGS.soft);
        body.animate([{ transform: "scale(0.25) rotate(-40deg)" }, { transform: "scale(1) rotate(0)" }], { duration: bounce.duration, easing: bounce.easing, delay: 60, fill: "backwards" });
        tread.animate([{ transform: "rotate(-170deg)" }, { transform: "rotate(0deg)" }], { duration: soft.duration + 200, easing: soft.easing, delay: 60, fill: "backwards" });
        // Eyes open a beat after it appears, like waking up.
        for (const e of eyes) e.animate([{ transform: "scaleY(0.06)" }, { transform: "scaleY(0.06)", offset: 0.7 }, { transform: "scaleY(1)" }], { duration: 380, delay: 120, easing: "ease-out", fill: "backwards" });
        // Then it has a look around, unless the pointer gets there first.
        scripted = true;
        for (const c of CURIOUS)
          later(c.at, () => {
            if (!scripted) return;
            gx.set(c.x);
            gy.set(c.y);
            run();
          });
        later(CURIOUS.at(-1)!.at + 30, () => {
          if (!scripted) return;
          scripted = false;
          setMoodNow("happy");
          doHop();
          later(900, () => setMoodNow("calm"));
        });
      }
    },

    destroy() {
      dead = true;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      loop.remove(tick);
      root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    },
  };

  scheduleBlink();
  scheduleHop();
  apply();
  return api;
}
