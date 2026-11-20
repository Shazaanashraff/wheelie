/** Placing a tool panel inside the overlay window. Pure, unit tested. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * A panel of `size`, centred on `center`, shifted just enough to stay fully inside both the
 * screen (`screen`, in window coordinates) and the window itself, with `margin` to spare.
 */
export function placePanel(center: { x: number; y: number }, size: { w: number; h: number }, screen: Box, win: { w: number; h: number }, margin = 14): Rect {
  const lo = (a: number, b: number) => Math.max(a, b) + margin;
  const hi = (a: number, b: number) => Math.min(a, b) - margin;
  const minX = lo(screen.x0, 0);
  const maxX = hi(screen.x1, win.w) - size.w;
  const minY = lo(screen.y0, 0);
  const maxY = hi(screen.y1, win.h) - size.h;
  const x = center.x - size.w / 2;
  const y = center.y - size.h / 2;
  // If the panel is larger than the space (tiny screen), prefer showing its top-left.
  return { x: Math.round(maxX < minX ? minX : Math.min(maxX, Math.max(minX, x))), y: Math.round(maxY < minY ? minY : Math.min(maxY, Math.max(minY, y))), w: size.w, h: size.h };
}
