/**
 * Spring motion, the way iOS does it: things move with physics (stiffness,
 * damping) rather than fixed-duration easing, so they can overshoot slightly,
 * settle naturally, and be redirected mid-flight without a jolt.
 *
 * - `Spring` + `MotionLoop`: live, interruptible values driven per frame
 *   (hover lean, magnification, tilt).
 * - `springEasing`: the same physics baked into a CSS `linear()` easing for
 *   one-shot animations (launch, panel morph, list entrances).
 */

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

/** Damping ratio: < 1 overshoots, 1 is critical, > 1 is sluggish. */
export const dampingRatio = (c: SpringConfig) => c.damping / (2 * Math.sqrt(c.stiffness * (c.mass ?? 1)));

export const SPRINGS = {
  /** Hover feedback: quick, a hint of overshoot. */
  snappy: { stiffness: 520, damping: 34 },
  /** Launch and selection: lively. */
  bouncy: { stiffness: 340, damping: 20 },
  /** Panels and layout: calm. */
  soft: { stiffness: 210, damping: 26 },
  /** Never overshoots, and quick: fades and receding slices. */
  smooth: { stiffness: 620, damping: 52 },
} as const satisfies Record<string, SpringConfig>;

const MAX_DT = 0.05;
const SUBSTEP = 1 / 240;

export class Spring {
  value: number;
  target: number;
  velocity = 0;
  cfg: SpringConfig;

  constructor(value = 0, cfg: SpringConfig = SPRINGS.snappy) {
    this.value = value;
    this.target = value;
    this.cfg = cfg;
  }

  /** Aim somewhere new. Velocity is kept, so redirecting mid-flight is smooth. */
  set(target: number): void {
    this.target = target;
  }

  /** Jump straight to a value with no motion. */
  snap(value: number): void {
    this.value = this.target = value;
    this.velocity = 0;
  }

  get settled(): boolean {
    return Math.abs(this.velocity) < 0.02 && Math.abs(this.value - this.target) < 0.0015;
  }

  step(dtSeconds: number): void {
    let t = Math.min(Math.max(dtSeconds, 0), MAX_DT); // a hitch must never blow the simulation up
    const m = this.cfg.mass ?? 1;
    while (t > 1e-9) {
      const d = Math.min(SUBSTEP, t);
      const accel = (-this.cfg.stiffness * (this.value - this.target) - this.cfg.damping * this.velocity) / m;
      this.velocity += accel * d; // semi-implicit Euler: stable for stiff springs
      this.value += this.velocity * d;
      t -= d;
    }
    if (this.settled) {
      this.value = this.target;
      this.velocity = 0;
    }
  }
}

export interface Baked {
  /** Easing function as a CSS `linear(...)` string (goes 0 -> 1, may overshoot past 1). */
  easing: string;
  /** Time for the spring to come to rest, in ms. */
  duration: number;
  values: number[];
}

const cache = new Map<string, Baked>();

/** The unit step response of a spring (0 -> 1), sampled into a CSS `linear()` easing. */
export function springEasing(cfg: SpringConfig): Baked {
  const key = `${cfg.stiffness}/${cfg.damping}/${cfg.mass ?? 1}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const s = new Spring(0, cfg);
  s.target = 1;
  const dt = 1 / 240;
  const trace: number[] = [0];
  let restFor = 0;
  let t = 0;
  while (t < 3 && restFor < 0.12) {
    s.step(dt);
    t += dt;
    trace.push(s.value);
    restFor = Math.abs(s.value - 1) < 0.002 && Math.abs(s.velocity) < 0.05 ? restFor + dt : 0;
  }
  const duration = Math.round((t - restFor) * 1000);
  const n = Math.min(64, Math.max(14, Math.round(duration / 14)));
  const values: number[] = [];
  for (let i = 0; i <= n; i++) {
    const idx = Math.min(trace.length - 1, Math.round((i / n) * (trace.length - 1)));
    values.push(Math.round(trace[idx] * 10000) / 10000);
  }
  values[0] = 0;
  values[values.length - 1] = 1;
  const baked = { easing: `linear(${values.join(", ")})`, duration: Math.max(120, duration), values };
  cache.set(key, baked);
  return baked;
}

// ---- motion level ----------------------------------------------------------

export type MotionLevel = "full" | "subtle" | "off";
let level: MotionLevel = "full";

export const setMotionLevel = (l: MotionLevel): void => {
  level = l;
};
export const motionLevel = (): MotionLevel => {
  try {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
  } catch {
    /* no matchMedia */
  }
  return level;
};

// ---- frame loop ---------------------------------------------------------------

type Ticker = (dtSeconds: number) => boolean;

/** Runs tickers every animation frame while any of them still has work, then goes idle. */
export class MotionLoop {
  private raf = 0;
  private last = 0;
  private tickers = new Set<Ticker>();

  add(fn: Ticker): void {
    this.tickers.add(fn);
    if (!this.raf && typeof requestAnimationFrame === "function") {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  remove(fn: Ticker): void {
    this.tickers.delete(fn);
  }

  /** Advance by hand (tests, or scrubbing a frame for a preview). */
  step(dtSeconds: number): void {
    for (const f of [...this.tickers]) if (!f(dtSeconds)) this.tickers.delete(f);
  }

  get active(): boolean {
    return this.tickers.size > 0;
  }

  private frame = (t: number) => {
    this.raf = 0;
    const dt = (t - this.last) / 1000;
    this.last = t;
    if (!(globalThis as any).__motionFrozen) this.step(dt);
    if (this.tickers.size) this.raf = requestAnimationFrame(this.frame);
  };
}

export const loop = new MotionLoop();
