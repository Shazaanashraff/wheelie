/** Small UI building blocks shared by the app window. */
import { h } from "./dom.ts";

/** Segmented control, like iOS's. */
export function seg<T extends string>(value: T, options: [T, string][], onChange: (v: T) => void): HTMLElement {
  const wrap = h("div", { class: "seg", role: "tablist" });
  const draw = (cur: T) =>
    wrap.replaceChildren(...options.map(([v, label]) => h("button", { class: "seg-btn" + (v === cur ? " on" : ""), role: "tab", "aria-selected": String(v === cur), onClick: () => (onChange(v), draw(v)) }, label)));
  draw(value);
  return wrap;
}

/** iOS-style switch. The knob moves on a spring. */
export function toggle(on: boolean, onChange: (v: boolean) => void, label: string): HTMLButtonElement {
  const b = h("button", { class: "switch" + (on ? " on" : ""), role: "switch", "aria-checked": String(on), "aria-label": label }, h("span", { class: "switch-knob" }));
  b.addEventListener("click", () => {
    // Read the state from the element, not a captured variable: setSwitch() may have changed it
    // since (e.g. once the real value arrived from the system).
    const next = b.getAttribute("aria-checked") !== "true";
    setSwitch(b, next);
    onChange(next);
  });
  return b;
}

/** A labelled control with optional help text, laid out as an inset list row. */
export function row(label: string, control: Node | null, hint?: string): HTMLElement {
  return h("div", { class: "list-row" }, h("div", { class: "list-text" }, h("span", { class: "list-label" }, label), hint ? h("span", { class: "hint" }, hint) : null), control);
}

/** A group of rows in a rounded card, with an optional small heading above it. */
export function group(title: string | null, ...rows: (Node | null)[]): HTMLElement {
  return h("section", { class: "group" }, title ? h("h3", { class: "group-title" }, title) : null, h("div", { class: "card" }, ...rows));
}

export function select<T extends string>(value: T, options: [T, string][], onChange: (v: T) => void): HTMLSelectElement {
  const el = h("select", { class: "input select" }, ...options.map(([v, l]) => h("option", { value: v, selected: v === value }, l)));
  el.addEventListener("change", () => onChange(el.value as T));
  return el;
}

/** Set a switch from code (e.g. once an async value arrives). */
export function setSwitch(b: HTMLButtonElement, on: boolean): void {
  b.classList.toggle("on", on);
  b.setAttribute("aria-checked", String(on));
}

/** A button that needs a second click within 3 seconds before it does something destructive. */
export function confirmButton(label: string, armedLabel: string, onConfirm: () => void, cls = "btn danger-btn"): HTMLButtonElement {
  let armed = false;
  let timer: number | undefined;
  const b = h("button", { class: cls }, label);
  b.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      b.textContent = armedLabel;
      b.classList.add("armed");
      timer = window.setTimeout(() => ((armed = false), (b.textContent = label), b.classList.remove("armed")), 3000);
      return;
    }
    clearTimeout(timer);
    onConfirm();
  });
  return b;
}
