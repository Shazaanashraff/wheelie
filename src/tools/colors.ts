import { h, icon } from "../core/dom.ts";
import { ICONS } from "../core/icons.ts";
import { store } from "../core/store.ts";
import type { Tool } from "./types.ts";
import { parseColor, textOn, toHex, toHslString, toRgbString, type RGB } from "./colorutil.ts";

export const colors: Tool = {
  id: "colors",
  name: "Colours",
  desc: "Pick any colour on screen and copy it",
  size: [380, 500],
  mount(root, ctx) {
    let current: RGB = parseColor(store.get<string>("colors.current", "#7c8cff")) ?? { r: 124, g: 140, b: 255 };
    let saved = store.get<string[]>("colors.saved", []);
    let flash = "";
    let flashTimer: number | undefined;

    const swatch = h("div", { class: "color-swatch" });
    const hexLabel = h("div", { class: "color-hex mono" });
    const formats = h("div", { class: "color-formats" });
    const hexInput = h("input", { class: "input mono", placeholder: "#7c8cff or rgb(124, 140, 255)", spellcheck: false, autocomplete: "off" });
    const palette = h("div", { class: "color-palette" });
    const err = h("div", { class: "form-error" });
    const EyeDropper = (window as any).EyeDropper as undefined | (new () => { open(): Promise<{ sRGBHex: string }> });

    const set = (c: RGB, persist = true) => {
      current = c;
      if (persist) store.set("colors.current", toHex(c));
      draw();
    };
    function copy(text: string) {
      navigator.clipboard?.writeText(text).catch(() => {});
      flash = `Copied ${text}`;
      clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => ((flash = ""), draw()), 1500);
      draw();
    }
    function draw() {
      const hex = toHex(current);
      swatch.style.background = hex;
      swatch.style.color = textOn(current);
      swatch.textContent = flash || "";
      hexLabel.textContent = hex.toUpperCase();
      formats.replaceChildren(
        ...[hex.toUpperCase(), toRgbString(current), toHslString(current)].map((f) =>
          h("button", { class: "color-fmt mono", title: "Click to copy", onClick: () => copy(f) }, f, h("span", { class: "color-copy" }, icon(ICONS.clipboard, 13))),
        ),
      );
      palette.replaceChildren(
        ...(saved.length
          ? saved.map((s) => h("button", { class: "chip-color" + (s === hex ? " on" : ""), title: s, style: `background:${s}`, onClick: () => set(parseColor(s)!) }))
          : [h("span", { class: "hint" }, "Saved colours appear here")]),
      );
    }

    async function pick() {
      if (!EyeDropper) {
        err.textContent = "The eyedropper isn't available here. Type a colour below instead.";
        return;
      }
      err.textContent = "";
      ctx.keepOpen(true); // the picker takes focus away from this window
      try {
        const r = await new EyeDropper().open();
        const c = parseColor(r.sRGBHex);
        if (c) {
          set(c);
          copy(toHex(c).toUpperCase());
        }
      } catch {
        /* cancelled with Esc */
      } finally {
        ctx.keepOpen(false);
      }
    }
    function save() {
      const hex = toHex(current);
      saved = [hex, ...saved.filter((s) => s !== hex)].slice(0, 18);
      store.set("colors.saved", saved);
      draw();
    }

    hexInput.addEventListener("input", () => {
      const c = parseColor(hexInput.value);
      err.textContent = hexInput.value && !c ? "Not a colour yet" : "";
      if (c) set(c);
    });

    root.append(
      h("div", { class: "pad stack" }, swatch, hexLabel),
      h(
        "div",
        { class: "pad row center" },
        h("button", { class: "btn primary", onClick: () => void pick() }, "Pick from screen"),
        h("button", { class: "btn", onClick: save }, "Save"),
      ),
      h("div", { class: "pad stack" }, formats, hexInput, err),
      h("div", { class: "pad" }, palette),
      h("div", { class: "foot" }, h("span", {}, "Click a value to copy it"), saved.length ? h("button", { class: "link danger", textContent: "Clear saved", onClick: () => ((saved = []), store.set("colors.saved", saved), draw()) }) : null),
    );
    draw();
    return () => {
      clearTimeout(flashTimer);
      ctx.keepOpen(false);
    };
  },
};
