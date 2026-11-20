import { invoke } from "../../core/bridge.ts";
import { h } from "../../core/dom.ts";
import { ic } from "../../core/icons.ts";
import { ringSlots } from "../../core/model.ts";
import type { Slice } from "../../overlay/ring.ts";
import { paletteOf } from "../../core/themes.ts";
import { LIBRARY, sliceOf } from "../../tools/registry.ts";
import { setSwitch, toggle } from "../../core/ui.ts";
import { isModelReady, modelInfo } from "../../voice/models.ts";
import type { Page, StudioCtx } from "../ctx.ts";
import { ringPreview } from "../preview.ts";

const KEYS = { "alt+space": "Alt + Space", "ctrl+alt+space": "Ctrl + Alt + Space" } as const;
const MOUSE = { middle: "the middle mouse button", x1: "the back side button", x2: "the forward side button" } as const;

export function home(ctx: StudioCtx): Page {
  const s = ctx.settings;
  const preview = ringPreview({
    size: 380,
    getSlices: () => ringSlots(ctx.settings.slots).map(sliceOf).filter((x): x is Slice => x !== null),
  });

  const ways = [KEYS[s.keyboard as keyof typeof KEYS], MOUSE[s.mouse as keyof typeof MOUSE]].filter(Boolean);
  const how = ways.length ? `Hold ${ways.join(" or ")} anywhere on your PC. Point at a tool and let go.` : "Both triggers are turned off. Choose one in General to open the wheel.";

  const login = toggle(false, (on) => void invoke("autostart_set", { on }), "Start Wheelie when I sign in");
  void invoke<boolean>("autostart_get").then((on) => setSwitch(login, Boolean(on)));

  const stat = (iconId: string, big: string, small: string, go: Parameters<StudioCtx["go"]>[0]) =>
    h("button", { class: "stat anim-host", onClick: () => ctx.go(go) }, h("span", { class: "stat-ic" }, ic(iconId, 22)), h("span", { class: "stat-big" }, big), h("span", { class: "stat-small" }, small));

  const model = modelInfo(s.voiceModel);
  const el = h(
    "div",
    { class: "page" },
    h("header", { class: "page-head" }, h("h1", {}, "Wheelie"), h("p", { class: "lead" }, "Your quick-touch wheel, always one hold away.")),
    h(
      "div",
      { class: "hero card" },
      h("div", { class: "hero-ring" }, preview.el, h("button", { class: "btn replay", onClick: () => preview.replay() }, "Replay launch")),
      h(
        "div",
        { class: "hero-text" },
        h("span", { class: "status" }, h("i", { class: "pulse" }), "Running in the background"),
        h("h2", {}, "Your wheel is ready"),
        h("p", {}, how),
        h("div", { class: "list-row slim" }, h("div", { class: "list-text" }, h("span", { class: "list-label" }, "Start with Windows"), h("span", { class: "hint" }, "So the wheel is there as soon as you sign in")), login),
      ),
    ),
    h(
      "div",
      { class: "stats" },
      stat("ring", `${ringSlots(s.slots).length} of 8`, "slots in use", "ring"),
      stat("apps", String(LIBRARY.length), "tools in the library", "library"),
      stat("colors", paletteOf(s.theme).name, "theme", "appearance"),
      stat("voice", isModelReady(s.voiceModel) ? "Ready" : "Not downloaded", `voice: ${model.label.toLowerCase()}`, "voice"),
    ),
  );
  return { el, destroy: preview.destroy };
}
