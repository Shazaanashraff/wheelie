/** How a tool panel arrives and leaves. Shared by the overlay and the motion gallery. */
import { motionLevel, springEasing } from "./motion.ts";

/** Lively, settles in about 300ms. */
export const PANEL_SPRING = { stiffness: 480, damping: 29 };

/**
 * The panel grows out of `from` (the slice that was chosen, in the panel's parent's
 * coordinates) on a spring, rounding off as it goes. Without a `from` it simply rises into place.
 * `rect` is where the panel ends up.
 */
export function panelIn(panel: HTMLElement, rect: { x: number; y: number }, from?: { x: number; y: number }): void {
  const level = motionLevel();
  if (level === "off") return;
  const spring = springEasing(PANEL_SPRING);
  const morph = Boolean(from) && level === "full";
  const keyframes: Keyframe[] = morph
    ? [
        { opacity: 0, transform: "scale(0.2)", borderRadius: "46px" },
        { opacity: 1, transform: "scale(1)", borderRadius: "14px" },
      ]
    : [
        { opacity: 0, transform: "translateY(12px) scale(0.965)" },
        { opacity: 1, transform: "none" },
      ];
  panel.style.transformOrigin = morph ? `${(from!.x - rect.x).toFixed(1)}px ${(from!.y - rect.y).toFixed(1)}px` : "50% 50%";
  panel.animate(keyframes, { duration: spring.duration, easing: spring.easing, fill: "backwards" });
  // The contents arrive a beat later, so the shape is seen to grow first.
  for (const child of Array.from(panel.children)) {
    child.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: morph ? 110 : 40, easing: "ease-out", fill: "backwards" });
  }
}

/** Fade the panel out with a small shrink. Resolves when done. */
export function panelOut(node: HTMLElement): Promise<void> {
  if (motionLevel() === "off") return Promise.resolve();
  const a = node.animate(
    [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.95)" },
    ],
    { duration: 150, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
  );
  return a.finished.then(() => undefined).catch(() => undefined);
}
