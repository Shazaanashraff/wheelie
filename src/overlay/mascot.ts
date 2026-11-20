/**
 * The Wheelie character: a small pixel creature that lives in the centre of the ring.
 *
 * It is drawn in SVG around (0, 0) from the sprite in sprite.ts, tinted with the theme's accent.
 * Everything it does happens in whole pixels, like a sprite on an old screen: its eyes turn a
 * pixel toward the pointer, it blinks, taps its feet, hops now and then, and on launch it builds
 * itself up row by row, opens its eyes and looks around.
 *
 * The ring shows it while nothing is hovered, and swaps it for the hovered tool's info.
 * What it does is scaled by the motion setting: Full does everything, Subtle only blinks and
 * fades, Off is a still picture.
 */
import { SPRINGS, Spring, loop, motionLevel } from "../core/motion.ts";
import { CURIOUS, blinkDelay, gaze, hopDelay, hopPixels, isDoubleBlink, pixelGaze, pointerTookOver } from "./mascotmath.ts";
import { BODY, COLS, EYES, FEET, ROWS, SMILE } from "./sprite.ts";

const NS = "http://www.w3.org/2000/svg";
const s = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls?: string) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (cls) e.setAttribute("class", cls);
  return e;
};

/** CSS pixels per sprite pixel. A whole number keeps the edges sharp: the sprite is 72 by 66, in a hub 112 across. */
const PX = 6;
const OX = -(COLS * PX) / 2;
const OY = -(ROWS * PX) / 2;

export type Mood = "calm" | "happy";

export interface Mascot {
  /** Add this to the ring's group; it is centred on (0, 0). */
  readonly el: SVGGElement;
  /** The pointer, relative to the ring's centre. */
  look(dx: number, dy: number): void;
  setMood(m: Mood): void;
  /** Show or hide it (the ring hides it while a slice's info is up). Idle behaviours only run while shown. */
  setShown(on: boolean): void;
  /** The launch: build up, open its eyes, look around, hop. */
  enter(): void;
  destroy(): void;
}

const pixel = (c: number, r: number, cls: string) => s("rect", { x: OX + c * PX, y: OY + r * PX, width: PX, height: PX }, cls);

export function createMascot(): Mascot {
  // ---- drawing ------------------------------------------------------------
  const root = s("g", { "shape-rendering": "crispEdges" }, "mascot");
  const body = s("g", {}, "p-body");

  // One group per row, so the launch can build it up from the feet.
  const rows: SVGGElement[] = [];
  BODY.forEach((line, r) => {
    const row = s("g", {}, "p-row");
    [...line].forEach((ch, c) => ch !== "." && row.append(pixel(c, r, `px px-${ch}`)));
    rows.push(row);
  });
  const feet = s("g", {}, "p-row");
  FEET.forEach((line, i) => {
    const frame = s("g", {}, i === 0 ? "p-feet-a" : "p-feet-b");
    [...line].forEach((ch, c) => ch !== "." && frame.append(pixel(c, BODY.length, "px px-4")));
    feet.append(frame);
  });
  rows.push(feet);
  body.append(...rows);

  // The face is separate from the body so it can turn on its own.
  const eyes = s("g", {}, "p-eyes");
  const eye = [s("rect", {}, "px px-eye"), s("rect", {}, "px px-eye"), s("rect", {}, "px px-eye"), s("rect", {}, "px px-eye")];
  const mouth = SMILE.map(() => s("rect", { width: PX, height: PX }, "px px-eye"));
  for (const e of eye) {
    e.setAttribute("width", String(PX));
    e.setAttribute("height", String(PX));
  }
  eyes.append(...eye, ...mouth);
  root.append(body, eyes);

  // ---- state --------------------------------------------------------------
  const hop = new Spring(0, SPRINGS.bouncy);
  const shown = new Spring(1, SPRINGS.snappy);
  const all = [hop, shown];

  let on = true;
  let mood: Mood = "calm";
  let blinking = false;
  let gx = 0;
  let gy = 0;
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

  /** Place the eyes and smile for the current look, blink and mood. */
  const drawFace = () => {
    const happy = mood === "happy";
    const cols = [EYES.left + gx, EYES.right + gx];
    const top = EYES.top + gy;
    // Calm: two tall eyes. Blinking: only the lower pixel, so a thin line. Happy: only the upper pixel, with a smile.
    const spec: [number, number, boolean][] = [
      [cols[0], top, !blinking || happy],
      [cols[0], top + 1, !happy],
      [cols[1], top, !blinking || happy],
      [cols[1], top + 1, !happy],
    ];
    spec.forEach(([c, r, vis], i) => {
      eye[i].setAttribute("x", String(OX + c * PX));
      eye[i].setAttribute("y", String(OY + r * PX));
      eye[i].setAttribute("visibility", vis ? "visible" : "hidden");
    });
    SMILE.forEach(([c, r], i) => {
      mouth[i].setAttribute("x", String(OX + (c + gx) * PX));
      mouth[i].setAttribute("y", String(OY + r * PX));
      mouth[i].setAttribute("visibility", happy ? "visible" : "hidden");
    });
  };

  const apply = () => {
    body.setAttribute("transform", `translate(0 ${-hopPixels(hop.value) * PX})`);
    eyes.setAttribute("transform", `translate(0 ${-hopPixels(hop.value) * PX})`);
    root.style.opacity = String(Math.max(0, Math.min(1, shown.value)) ** 2); // fades before the hub info arrives
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
  const setLook = (x: number, y: number) => {
    if (x === gx && y === gy) return;
    gx = x;
    gy = y;
    drawFace();
  };

  // ---- idle life ----------------------------------------------------------
  const blinkOnce = () => {
    if (motionLevel() === "off") return;
    blinking = true;
    drawFace();
    later(130, () => {
      blinking = false;
      drawFace();
    });
  };
  const scheduleBlink = () => {
    later(blinkDelay(Math.random()), () => {
      if (on) {
        blinkOnce();
        if (isDoubleBlink(Math.random())) later(300, blinkOnce);
      }
      scheduleBlink();
    });
  };
  const doHop = () => {
    hop.set(1);
    run();
    later(140, () => {
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
    drawFace();
  };

  const api: Mascot = {
    el: root,

    look(dx, dy) {
      if (scripted) {
        if (!pointerTookOver(dx, dy)) return;
        scripted = false;
      }
      const q = pixelGaze(gaze(dx, dy));
      setLook(q.x, q.y);
    },

    setMood: setMoodNow,

    setShown(v) {
      on = v;
      shown.set(v ? 1 : 0);
      run();
    },

    enter() {
      if (motionLevel() !== "full") return;
      // Build up from the feet, one row at a time, popping in rather than fading.
      const step = 48;
      rows.forEach((row, i) => {
        const fromBottom = rows.length - 1 - i;
        row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: 80 + fromBottom * step, easing: "steps(1, start)", fill: "backwards" });
      });
      const built = 80 + rows.length * step;
      // The eyes switch on after it is built.
      eyes.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: built + 60, easing: "steps(1, start)", fill: "backwards" });
      // Then it looks around, unless the pointer gets there first.
      scripted = true;
      for (const c of CURIOUS)
        later(built + 60 + c.at, () => {
          if (!scripted) return;
          const q = pixelGaze({ x: c.x, y: c.y });
          setLook(q.x, q.y);
        });
      later(built + 60 + CURIOUS.at(-1)!.at + 30, () => {
        if (!scripted) return;
        scripted = false;
        setMoodNow("happy");
        doHop();
        later(900, () => setMoodNow("calm"));
      });
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
  drawFace();
  apply();
  return api;
}
