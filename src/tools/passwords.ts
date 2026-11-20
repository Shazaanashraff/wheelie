import { h, icon } from "../dom.ts";
import { ICONS } from "../icons.ts";
import { store } from "../store.ts";
import type { Tool } from "./types.ts";
import { DEFAULT_OPTS, clampLength, entropyBits, generate, strengthLabel, type PassOpts } from "./passgen.ts";

export const passwords: Tool = {
  id: "passwords",
  name: "Passwords",
  desc: "Generate strong random passwords",
  size: [380, 500],
  mount(root) {
    let opts: PassOpts = { ...DEFAULT_OPTS, ...store.get<Partial<PassOpts>>("passwords.opts", {}) };
    let pw = "";
    let copiedTimer: number | undefined;

    const out = h("div", { class: "pw-out mono", title: "Click to copy" });
    const meter = h("div", { class: "pw-meter" }, h("div", { class: "pw-meter-fill" }));
    const strength = h("div", { class: "pw-strength" });
    const lenLabel = h("span", { class: "pw-len" });
    const copyBtn = h("button", { class: "btn primary", onClick: () => copy() }, "Copy");

    const regen = () => {
      pw = generate(opts);
      store.set("passwords.opts", opts);
      draw();
    };
    function copy() {
      if (!pw) return;
      navigator.clipboard?.writeText(pw).catch(() => {});
      copyBtn.textContent = "Copied ✓";
      clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(() => (copyBtn.textContent = "Copy"), 1400);
    }
    function draw() {
      out.textContent = pw || "Pick at least one character type";
      out.classList.toggle("empty", !pw);
      const bits = entropyBits(opts);
      const label = pw ? strengthLabel(bits) : "";
      strength.textContent = pw ? `${label} · ${bits} bits` : "";
      const fill = meter.firstElementChild as HTMLElement;
      fill.style.width = pw ? Math.min(100, (bits / 130) * 100) + "%" : "0%";
      fill.dataset.level = label.toLowerCase();
      lenLabel.textContent = String(clampLength(opts.length));
      copyBtn.toggleAttribute("disabled", !pw);
    }

    const slider = h("input", { type: "range", min: "8", max: "64", value: String(clampLength(opts.length)), class: "range" });
    slider.addEventListener("input", () => {
      opts = { ...opts, length: Number(slider.value) };
      regen();
    });
    const toggle = (key: keyof PassOpts, label: string) => {
      const box = h("input", { type: "checkbox", checked: Boolean(opts[key]) });
      box.addEventListener("change", () => {
        opts = { ...opts, [key]: box.checked };
        regen();
      });
      return h("label", { class: "check" }, box, h("span", {}, label));
    };

    out.addEventListener("click", copy);
    root.append(
      h("div", { class: "pad stack" }, out, meter, strength),
      h("div", { class: "pad stack" }, h("div", { class: "row" }, h("span", { class: "field-label" }, "Length"), h("span", { class: "grow" }), lenLabel), slider),
      h(
        "div",
        { class: "pad pw-opts" },
        toggle("lower", "abc"),
        toggle("upper", "ABC"),
        toggle("digits", "123"),
        toggle("symbols", "#$&"),
        toggle("avoidAmbiguous", "No look-alikes (0 O 1 l)"),
      ),
      h(
        "div",
        { class: "pad row center", style: "margin-top:auto" },
        h("button", { class: "btn", onClick: regen }, icon(ICONS.swap, 15), " New"),
        copyBtn,
      ),
      h("div", { class: "foot" }, h("span", {}, "Made on this PC with your system's secure random generator")),
    );
    regen();
    return () => clearTimeout(copiedTimer);
  },
};
