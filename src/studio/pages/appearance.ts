import { h } from "../../dom.ts";
import { ic } from "../../icons.ts";
import { ringSlots, type IconColor, type IconStyle, type IconWeight, type Motion } from "../../model.ts";
import type { Slice } from "../../ring.ts";
import { ACCENTS, PALETTES } from "../../themes.ts";
import { sliceOf } from "../../tools/registry.ts";
import { group, row, seg } from "../../ui.ts";
import type { Page, StudioCtx } from "../ctx.ts";
import { ringPreview } from "../preview.ts";

export function appearance(ctx: StudioCtx): Page {
  const preview = ringPreview({ size: 340, getSlices: () => ringSlots(ctx.settings.slots).map(sliceOf).filter((x): x is Slice => x !== null) });
  const body = h("div", { class: "controls" });

  function render() {
    const s = ctx.settings;
    const set = (patch: Parameters<StudioCtx["update"]>[0], again = false) => (ctx.update(patch), again && render());

    const themes = h(
      "div",
      { class: "theme-grid" },
      ...PALETTES.map((p) =>
        h(
          "button",
          {
            class: "theme-card" + (p.id === s.theme ? " on" : ""),
            title: p.name,
            onClick: () => set({ theme: p.id }, true),
            style: `--c-bg:${p.id === "tinted" ? "#1b1d2c" : p.bg};--c-bg3:${p.id === "tinted" ? "#2a2e4a" : p.bg3};--c-fg:${p.fg};`,
          },
          h("span", { class: "theme-sample" }, h("i", { style: "background:var(--c-fg);opacity:.9" }), h("i", { style: "background:var(--c-fg);opacity:.45" }), h("i", { style: `background:${s.accent}` })),
          h("span", { class: "theme-name" }, p.name),
        ),
      ),
    );

    const custom = h("input", { type: "color", class: "color", value: s.accent, "aria-label": "Custom accent colour" });
    custom.addEventListener("input", () => set({ accent: custom.value }));
    custom.addEventListener("change", () => render());
    const swatches = h(
      "div",
      { class: "swatches" },
      ...ACCENTS.map((a) => h("button", { class: "swatch" + (a.toLowerCase() === s.accent.toLowerCase() ? " on" : ""), style: `background:${a}`, title: a, "aria-label": a, onClick: () => set({ accent: a }, true) })),
      custom,
    );

    const icons = h("div", { class: "icon-preview" }, ...["calc", "clock", "notes", "todo", "clipboard", "units", "links", "apps", "colors", "snippets", "passwords", "worldclock"].map((id) => h("span", { class: "anim-host prev-ic", title: id }, ic(id, 26))));

    const opacity = h("input", { type: "range", class: "range", min: "55", max: "100", value: String(Math.round(s.ringOpacity * 100)), "aria-label": "Ring transparency" });
    opacity.addEventListener("input", () => set({ ringOpacity: Number(opacity.value) / 100 }));

    body.replaceChildren(
      group("Theme", h("div", { class: "pad" }, themes)),
      group("Accent colour", h("div", { class: "pad" }, swatches)),
      group(
        "Icons",
        h("div", { class: "pad" }, icons),
        row("Colour", seg<IconColor>(s.iconColor, [["auto", "Match theme"], ["accent", "Accent"], ["colorful", "Colourful"]], (v) => set({ iconColor: v }))),
        row("Style", seg<IconStyle>(s.iconStyle, [["line", "Line"], ["duotone", "Duotone"]], (v) => set({ iconStyle: v }))),
        row("Weight", seg<IconWeight>(s.iconWeight, [["thin", "Thin"], ["regular", "Regular"], ["bold", "Bold"]], (v) => set({ iconWeight: v }))),
      ),
      group(
        "Motion",
        row("Animations", seg<Motion>(s.motion, [["full", "Full"], ["subtle", "Subtle"], ["off", "Off"]], (v) => (set({ motion: v }), preview.replay())), "Full is spring-driven. Subtle keeps it calm. Hover the icons to preview."),
        row("Ring transparency", opacity, "Lower values let your desktop show through."),
      ),
    );
  }
  render();

  const el = h(
    "div",
    { class: "page split" },
    h("header", { class: "page-head" }, h("h1", {}, "Appearance"), h("p", { class: "lead" }, "Themes, colours and motion. The wheel on the right is live.")),
    body,
    h("aside", { class: "sticky-preview" }, preview.el, h("button", { class: "btn replay", onClick: () => preview.replay() }, "Replay launch")),
  );
  return { el, destroy: preview.destroy };
}
