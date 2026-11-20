import { h, icon } from "../core/dom.ts";
import { ICONS } from "../core/icons.ts";
import { store } from "../core/store.ts";
import type { Tool } from "./types.ts";
import { CITIES, dayRelation, describeDifference, localZone, offsetMinutes, type City } from "./timezones.ts";

const DEFAULT_ZONES = ["Europe/London", "America/New_York", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney"];

export const worldclock: Tool = {
  id: "worldclock",
  name: "World clock",
  desc: "The time in cities around the world",
  size: [400, 520],
  mount(root) {
    let zones = store.get<string[]>("worldclock.zones", DEFAULT_ZONES).filter((z) => CITIES.some((c) => c.tz === z));
    const local = localZone();
    const save = () => store.set("worldclock.zones", zones);

    const rows = h("div", { class: "wc-list" });
    const picker = h("select", { class: "input" });
    const hero = h("div", { class: "wc-hero" });

    const fmt = (tz: string, d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat([], { timeZone: tz, ...opts }).format(d);
    const city = (tz: string): City => CITIES.find((c) => c.tz === tz) ?? { name: tz.split("/").pop()!.replace(/_/g, " "), tz };

    function fillPicker() {
      const free = CITIES.filter((c) => !zones.includes(c.tz)).sort((a, b) => a.name.localeCompare(b.name));
      picker.replaceChildren(h("option", { value: "" }, "Add a city…"), ...free.map((c) => h("option", { value: c.tz }, c.name)));
    }
    picker.addEventListener("change", () => {
      if (picker.value) {
        zones = [...zones, picker.value];
        save();
        fillPicker();
        render();
      }
    });

    function render() {
      const now = new Date();
      hero.replaceChildren(
        h("div", { class: "wc-hero-time mono" }, fmt(local, now, { hour: "2-digit", minute: "2-digit", hour12: false })),
        h("div", { class: "wc-hero-sub" }, fmt(local, now, { weekday: "long", day: "numeric", month: "long" }) + " · your time"),
      );
      const here = offsetMinutes(local, now);
      rows.replaceChildren(
        ...zones.map((tz) => {
          const c = city(tz);
          const rel = dayRelation(tz, local, now);
          return h(
            "div",
            { class: "wc-row" },
            h("div", { class: "wc-city" }, h("div", { class: "wc-name" }, c.name), h("div", { class: "wc-meta" }, `${describeDifference(offsetMinutes(tz, now) - here)}${rel === "today" ? "" : " · " + rel}`)),
            h("div", { class: "wc-time mono" }, fmt(tz, now, { hour: "2-digit", minute: "2-digit", hour12: false })),
            h("button", { class: "icon-btn", title: "Remove", onClick: () => ((zones = zones.filter((z) => z !== tz)), save(), fillPicker(), render()) }, icon(ICONS.close, 14)),
          );
        }),
      );
      if (!zones.length) rows.append(h("div", { class: "empty" }, "Add a city to see its time."));
    }

    root.append(hero, rows, h("div", { class: "pad", style: "margin-top:auto" }, picker));
    fillPicker();
    render();
    const timer = window.setInterval(render, 1000);
    return () => clearInterval(timer);
  },
};
