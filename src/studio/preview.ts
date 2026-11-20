/**
 * A live ring inside the app window, built with the very same engine as the overlay, so
 * hovering feels identical and what you customise is what you get.
 */
import { h } from "../core/dom.ts";
import { hitTest, renderRing, type RingView, type Slice } from "../overlay/ring.ts";

const STAGE = 480; // the ring is drawn on a fixed 480px stage, then scaled to fit

export interface PreviewOptions {
  getSlices: () => Slice[];
  /** Rendered size in px. */
  size?: number;
  onSelect?: (index: number) => void;
}

export interface Preview {
  el: HTMLElement;
  /** Re-render after the slices changed (no launch animation). */
  refresh(): void;
  /** Play the launch animation again. */
  replay(): void;
  select(index: number): void;
  /** The live ring (null once destroyed), for demos that choose or close it. */
  view(): RingView | null;
  destroy(): void;
}

export function ringPreview(opts: PreviewOptions): Preview {
  const size = opts.size ?? 360;
  const scale = size / STAGE;
  const stage = h("div", { class: "preview-stage" });
  stage.style.cssText = `width:${STAGE}px;height:${STAGE}px;transform:scale(${scale});transform-origin:0 0`;
  const el = h("div", { class: "preview", style: `width:${size}px;height:${size}px` }, stage);
  const c = STAGE / 2;
  let view: RingView | null = null;
  let selected = -1;
  let n = 0;

  const draw = (animate: boolean) => {
    view?.destroy();
    const slices = opts.getSlices();
    n = slices.length;
    view = renderRing(stage, slices, c, c, { animateIn: animate });
    view.setSelected(selected);
  };

  const rel = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const k = r.width / STAGE; // the scale it is really drawn at, even inside a transformed container
    return { dx: (e.clientX - r.left) / k - c, dy: (e.clientY - r.top) / k - c };
  };
  el.addEventListener("pointermove", (e) => {
    const { dx, dy } = rel(e);
    view?.setPointer(dx, dy);
    view?.setHover(hitTest(dx, dy, n));
  });
  el.addEventListener("pointerleave", () => {
    view?.setPointer(0, 0);
    view?.setHover(-1);
  });
  el.addEventListener("click", (e) => {
    if (!opts.onSelect) return;
    const { dx, dy } = rel(e as PointerEvent);
    const i = hitTest(dx, dy, n);
    if (i >= 0) opts.onSelect(i);
  });

  draw(true);
  return {
    el,
    refresh: () => draw(false),
    replay: () => view?.replayOpen(),
    select(i) {
      selected = i;
      view?.setSelected(i);
    },
    view: () => view,
    destroy: () => view?.destroy(),
  };
}
