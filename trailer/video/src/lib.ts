import {Easing, interpolate, spring} from 'remotion';
import T from './timeline.json';

export const TL = T;
export const FPS = 60;
export const W = 1920;
export const H = 1080;
export const TASKBAR_H = 64;

// Edit this once you have Wheelie's real idle memory figure.
export const WHEELIE_RAM_MB = 40;

export const C = {
  ink: '#0E1420',
  night: '#0A0E16',
  teal: '#19C3A6',
  tealDeep: '#0E8F7B',
  tealGlow: 'rgba(25,195,166,0.55)',
  tire: '#1C2431',
  tireEdge: '#2B3546',
  face: '#F7FAFC',
  hot: '#FF5A36',
  ember: '#FFB13B',
  winBg: '#FBFCFD',
  winBar: '#F1F4F8',
  winLine: '#E3E8EF',
  text: '#1B2230',
  textMuted: '#6B7686',
  glass: 'rgba(17,23,35,0.88)',
  glassLine: 'rgba(255,255,255,0.09)',
  glassText: '#E8EEF6',
};

export const FONT = {
  ui: '"Inter", "Segoe UI", system-ui, sans-serif',
  display: '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", Consolas, monospace',
};

const io = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE = {
  inOut: io,
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  linear: (t: number) => t,
};

/** clamp-interpolate with easing */
export const ease = (f: number, from: [number, number], to: [number, number], e = EASE.inOut) =>
  interpolate(f, from, to, {easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** piecewise keyframes: [[frame, value], ...] */
export function kf(f: number, keys: [number, number][], e = EASE.inOut): number {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (f <= f1) return f1 === f0 ? v1 : v0 + (v1 - v0) * e((f - f0) / (f1 - f0));
  }
  return keys[keys.length - 1][1];
}

export const sp = (f: number, start: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: f - start, fps: FPS, config: {damping: 14, stiffness: 160, mass: 1, ...cfg}});

/** deterministic smooth noise in [-1,1] */
export const noise = (t: number, seed = 0) =>
  (Math.sin(t * 1.7 + seed * 12.9) * 0.5 + Math.sin(t * 3.1 + seed * 4.3) * 0.3 + Math.sin(t * 5.3 + seed * 7.7) * 0.2);

export const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Taskbar icon slot centers for n icons (centered group, squeezing when crowded) */
export function taskbarSlots(n: number) {
  const slot = Math.min(64, 900 / Math.max(n, 1));
  const start = W / 2 - (n * slot) / 2;
  return {slot, xs: Array.from({length: n}, (_, i) => start + slot * i + slot / 2)};
}

/** 3D tilt of the wheel as it settles after the fusion (shared across scenes) */
export const wheelTilt = (f: number) =>
  `perspective(1800px) rotateX(${kf(f, [[1578, 30], [1840, 0]])}deg) rotateY(${kf(f, [[1578, -24], [1840, 0]])}deg)`;
