import { h, icon, uid } from "../../core/dom.ts";
import { ic, LAUNCH_ICON_IDS, UI_ICONS } from "../../core/icons.ts";
import { SLOT_COUNT, assignLaunch, assignTool, clearSlot, moveSlot, ringSlots, type Slot, type SlotList } from "../../core/model.ts";
import type { Slice } from "../../overlay/ring.ts";
import { LIBRARY, sliceOf, toolById } from "../../tools/registry.ts";
import type { Page, StudioCtx } from "../ctx.ts";
import { ringPreview } from "../preview.ts";

const labelOf = (slot: Slot | null) => (!slot ? { name: "Empty", iconId: "" } : slot.kind === "tool" ? { name: toolById(slot.id)?.name ?? slot.id, iconId: slot.id } : { name: slot.name, iconId: slot.icon });

export function ringPage(ctx: StudioCtx): Page {
  let selected = 0;
  const slices = () => ringSlots(ctx.settings.slots).map(sliceOf).filter((x): x is Slice => x !== null);
  /** Ring position of a slot (empty slots aren't drawn), and the reverse. */
  const ringIndex = (slot: number) => (ctx.settings.slots[slot] ? ctx.settings.slots.slice(0, slot).filter(Boolean).length : -1);
  const slotAt = (ringIdx: number) => ctx.settings.slots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0)[ringIdx] ?? 0;

  const preview = ringPreview({
    size: 400,
    getSlices: slices,
    onSelect: (i) => {
      selected = slotAt(i);
      render();
    },
  });
  const list = h("div", { class: "slot-list" });
  const inspector = h("div", { class: "inspector card" });

  function commit(slots: SlotList) {
    ctx.update({ slots });
    preview.refresh();
    render();
  }

  function renderList() {
    const s = ctx.settings;
    const total = ringSlots(s.slots).length;
    list.replaceChildren(
      ...s.slots.map((slot, i) => {
        const { name, iconId } = labelOf(slot);
        return h(
          "div",
          { class: "slot-row anim-host" + (slot ? "" : " empty-slot") + (i === selected ? " selected" : ""), onClick: () => ((selected = i), render()) },
          h("span", { class: "slot-n" }, String(i + 1)),
          h("span", { class: "slot-ic" }, iconId ? ic(iconId, 22) : ""),
          h("span", { class: "slot-name" }, name, slot?.kind === "launch" ? h("span", { class: "slot-tag" }, "launcher") : null),
          h("button", { class: "icon-btn", title: "Move up", disabled: i === 0, onClick: (e: Event) => (e.stopPropagation(), (selected = i - 1), commit(moveSlot(s.slots, i, -1))) }, "↑"),
          h("button", { class: "icon-btn", title: "Move down", disabled: i === SLOT_COUNT - 1, onClick: (e: Event) => (e.stopPropagation(), (selected = i + 1), commit(moveSlot(s.slots, i, 1))) }, "↓"),
          h("button", { class: "icon-btn", title: !slot ? "" : total <= 2 ? "Keep at least 2 slots" : "Empty this slot", disabled: !slot || total <= 2, onClick: (e: Event) => (e.stopPropagation(), commit(clearSlot(s.slots, i))) }, icon(UI_ICONS.close, 13)),
        );
      }),
    );
  }

  function renderInspector() {
    const s = ctx.settings;
    const slot = s.slots[selected];
    const inRing = (id: string) => s.slots.findIndex((x) => x?.kind === "tool" && x.id === id);

    let chosen = "rocket";
    const name = h("input", { class: "input", placeholder: "Name, e.g. Chrome" });
    const target = h("input", { class: "input", placeholder: String.raw`App path, folder or link, e.g. C:\Program Files\App\app.exe or https://...` });
    const err = h("div", { class: "form-error" });
    const iconRow = h("div", { class: "icon-pick" });
    const drawIcons = () => iconRow.replaceChildren(...LAUNCH_ICON_IDS.map((id) => h("button", { class: "anim-host pick-ic" + (id === chosen ? " on" : ""), title: id, onClick: () => ((chosen = id), drawIcons()) }, ic(id, 22))));
    drawIcons();
    const addLauncher = () => {
      const t = target.value.trim().replace(/^"|"$/g, "");
      if (!t) {
        err.textContent = "Enter a path or link to launch.";
        return;
      }
      const base = t.split(/[\\/]/).pop() ?? t;
      commit(assignLaunch(s.slots, selected, { id: "l-" + uid(), name: name.value.trim() || base.replace(/\.[a-z0-9]+$/i, "") || "Launcher", target: t, icon: chosen }));
    };

    const { name: current } = labelOf(slot);
    inspector.replaceChildren(
      h("div", { class: "inspector-head" }, h("span", { class: "slot-n big" }, String(selected + 1)), h("div", {}, h("div", { class: "inspector-title" }, `Slot ${selected + 1}`), h("div", { class: "hint" }, slot ? `Holds ${current}` : "Empty. Choose something below"))),
      h("h4", {}, "Put a tool here"),
      h(
        "div",
        { class: "lib-grid compact" },
        ...LIBRARY.map((t) => {
          const at = inRing(t.id);
          const here = at === selected;
          return h(
            "button",
            { class: "lib-card anim-host" + (here ? " on" : ""), onClick: () => commit(assignTool(s.slots, selected, t.id)) },
            h("span", { class: "lib-ic" }, ic(t.id, 26)),
            h("span", { class: "lib-name" }, t.name),
            at >= 0 ? h("span", { class: "lib-badge" }, here ? "Here" : `Slot ${at + 1}`) : null,
          );
        }),
      ),
      h("h4", {}, "…or launch an app, folder or link"),
      h("div", { class: "stack" }, name, target, iconRow, err, h("button", { class: "btn primary", onClick: addLauncher }, "Use as launcher")),
      h("p", { class: "hint" }, "A launcher runs straight away when you release over it. No panel opens."),
    );
  }

  function render() {
    preview.select(ringIndex(selected));
    renderList();
    renderInspector();
  }
  render();

  const el = h(
    "div",
    { class: "page ring-page" },
    h("header", { class: "page-head" }, h("h1", {}, "Ring"), h("p", { class: "lead" }, "Click a slice (or a row) to choose what goes in that slot. Tools, or direct launchers for apps and links.")),
    h("div", { class: "ring-cols" }, h("div", { class: "ring-left" }, h("div", { class: "preview-card" }, preview.el), list), inspector),
  );
  return { el, destroy: preview.destroy };
}
