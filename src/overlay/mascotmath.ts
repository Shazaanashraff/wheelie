/** The pure parts of the Wheelie character: where it looks, and when it blinks, hops and gets curious. */

/** Pointer distance (px) at which the character looks as far as it ever does. */
export const GAZE_RANGE = 170;

/**
 * Where the character looks, as a unit vector scaled by how far the pointer is:
 * (0, 0) is straight ahead, length 1 is as far as it turns. Close to the centre it
 * turns gently; it never turns further than 1 however far the pointer goes.
 */
export function gaze(dx: number, dy: number, range = GAZE_RANGE): { x: number; y: number } {
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: 0, y: 0 };
  const k = Math.min(1, d / range);
  // Ease-out: small movements near the character already register.
  const e = 1 - (1 - k) * (1 - k);
  return { x: (dx / d) * e, y: (dy / d) * e };
}

/** Milliseconds until the next blink. `r` is a random number in [0, 1). */
export const blinkDelay = (r: number): number => 2200 + r * 3600;

/** Most blinks are single; about one in five is a quick double. */
export const isDoubleBlink = (r: number): boolean => r < 0.2;

/** Milliseconds until the next idle hop. `r` is a random number in [0, 1). */
export const hopDelay = (r: number): number => 6500 + r * 5000;

/** The scripted "curious" look after launch: where to look, and when (ms after the ring opens). */
export const CURIOUS: readonly { at: number; x: number; y: number }[] = [
  { at: 520, x: -0.9, y: -0.15 },
  { at: 860, x: 0.9, y: -0.15 },
  { at: 1200, x: 0, y: 0 },
];

/** True once the pointer has moved far enough from the centre to take over from the scripted look. */
export const pointerTookOver = (dx: number, dy: number): boolean => Math.hypot(dx, dy) > 8;
