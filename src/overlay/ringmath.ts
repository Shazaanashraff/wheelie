/** Ring geometry. Pure functions, unit tested. Slice 0 is at the top, going clockwise. */

export const R_IN = 62;
export const R_OUT = 218;
const TAU = 2 * Math.PI;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Angle of a slice's centre, in radians clockwise from the top. */
export const sliceAngle = (i: number, n: number) => (n <= 1 ? 0 : (i * TAU) / n);

/** Point at radius r and angle t (clockwise from the top), relative to the ring centre. */
export const polar = (r: number, t: number): [number, number] => [r * Math.sin(t), -r * Math.cos(t)];

/** Where a slice's icon sits, relative to the ring centre. */
export function sliceCenter(i: number, n: number): { x: number; y: number } {
  const [x, y] = polar((R_IN + R_OUT) / 2 + 2, sliceAngle(i, n));
  return { x, y };
}

/** Which slice the pointer (relative to the ring centre) is over; -1 = hub / none. */
export function hitTest(dx: number, dy: number, n: number): number {
  if (n === 0 || Math.hypot(dx, dy) < R_IN) return -1;
  let a = Math.atan2(dx, -dy);
  if (a < 0) a += TAU;
  const step = TAU / n;
  return Math.floor(((a + step / 2) % TAU) / step);
}

/**
 * How strongly the pointer "pulls" on each slice, 0..1. Peaks at the slice the pointer is
 * pointing at and falls off smoothly to its neighbours (like the macOS Dock magnifying
 * the icon under the cursor and a little of the ones next to it). Nothing in the hub.
 */
export function influence(dx: number, dy: number, n: number): number[] {
  const r = Math.hypot(dx, dy);
  if (n === 0 || r < R_IN * 0.9) return Array(n).fill(0);
  let a = Math.atan2(dx, -dy);
  if (a < 0) a += TAU;
  const step = TAU / n;
  const ramp = clamp((r - R_IN) / 50, 0, 1); // ease in as the pointer leaves the hub
  return Array.from({ length: n }, (_, i) => {
    let d = Math.abs(a - i * step);
    d = Math.min(d, TAU - d) / step; // distance in slice-widths
    return ramp * Math.max(0, 1 - d / 1.8) ** 2; // neighbours ~20%, two slices away: nothing
  });
}
