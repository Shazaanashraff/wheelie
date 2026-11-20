import { h } from "../../dom.ts";
import { ic } from "../../icons.ts";
import { SLOT_COUNT, assignTool, clearSlot, ringSlots } from "../../model.ts";
import { LIBRARY, toolById } from "../../tools/registry.ts";
import { select } from "../../ui.ts";
import type { Page, StudioCtx } from "../ctx.ts";

export function library(ctx: StudioCtx): Page {
  const grid = h("div", { class: "lib-grid big" });

  function render() {
    const s = ctx.settings;
    grid.replaceChildren(
      ...LIBRARY.map((t) => {
        const at = s.slots.findIndex((x) => x?.kind === "tool" && x.id === t.id);
        const slotOptions: [string, string][] = [["", at >= 0 ? `In slot ${at + 1}` : "Add to slot…"]];
        for (let i = 0; i < SLOT_COUNT; i++) {
          const cur = s.slots[i];
          const label = !cur ? "empty" : cur.kind === "tool" ? (toolById(cur.id)?.name ?? cur.id) : cur.name;
          if (i !== at) slotOptions.push([String(i), `Slot ${i + 1} (${label})`]);
        }
        const picker = select("", slotOptions, (v) => {
          if (v === "") return;
          ctx.update({ slots: assignTool(s.slots, Number(v), t.id) });
          render();
        });
        return h(
          "div",
          { class: "lib-card static anim-host" + (at >= 0 ? " on" : "") },
          h("span", { class: "lib-ic" }, ic(t.id, 38)),
          h("span", { class: "lib-name" }, t.name),
          h("span", { class: "lib-desc" }, t.desc),
          at >= 0 ? h("span", { class: "lib-badge" }, `Slot ${at + 1}`) : null,
          h(
            "div",
            { class: "lib-actions" },
            picker,
            at >= 0 && ringSlots(s.slots).length > 2 ? h("button", { class: "icon-btn", title: "Remove from the ring", onClick: () => (ctx.update({ slots: clearSlot(s.slots, at) }), render()) }, "✕") : null,
          ),
        );
      }),
    );
  }
  render();

  const el = h("div", { class: "page" }, h("header", { class: "page-head" }, h("h1", {}, "Library"), h("p", { class: "lead" }, `${LIBRARY.length} tools. Put any of them in one of the ring's 8 slots. Hover to see them move.`)), grid);
  return { el };
}
