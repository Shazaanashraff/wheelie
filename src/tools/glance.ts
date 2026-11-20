/**
 * "At a glance" info for the centre of the ring: when you hover a slice, the hub shows what
 * that tool is up to (the timer's time left, how many to-dos are done, your last result...),
 * with a progress arc where the tool has progress.
 *
 * Everything here is a pure function of the stored data and the clock, so it can be tested.
 * Notes and clipboard history live outside the store; glanceLive.ts fetches them when the ring
 * opens. This file stays free of the DOM and the Tauri bridge so it runs under plain Node.
 */
import { localZone } from "./timezones.ts";
import { CATEGORIES, convert } from "./unitdata.ts";
import type { Countdown, Stopwatch } from "./clock.ts";

export interface Glance {
  /** The tool's name. */
  name: string;
  /** The headline: a time, a count, a result. */
  value: string;
  /** A short line under it. */
  sub: string;
  /** 0 to 1 when the tool has progress to show (a running timer, finished to-dos), else null. */
  progress: number | null;
  /** True when the value changes with time, so the hub should keep refreshing it. */
  live: boolean;
}

export interface Reader {
  get<T>(key: string, fallback: T): T;
}

/** Things that do not live in the store, filled in by `refreshExtras()`. */
export interface Extras {
  notes?: { count: number; latest: string };
  clip?: string;
}

/** Shorten to `max` characters, ending in an ellipsis if cut. */
export const fit = (text: string, max: number): string => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, Math.max(1, max - 1)).trimEnd() + "…";
};

/** A number in at most about eight characters, for the hub. */
export function short(n: number): string {
  if (!Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e9 || abs < 1e-4)) return n.toExponential(2).replace("e+", "e");
  return String(Number(n.toPrecision(5)));
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const pad = (n: number) => String(n).padStart(2, "0");

/** mm:ss, or h:mm:ss from an hour up. Rounds down, like a stopwatch. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  return h ? `${h}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}` : `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

const g = (name: string, value: string, sub: string, progress: number | null = null, live = false): Glance => ({
  name,
  value: fit(value, 11),
  sub: fit(sub, 16),
  progress: progress === null ? null : Math.max(0, Math.min(1, progress)),
  live,
});

/** The glance for one library tool. Unknown tools get a plain one. */
export function toolGlance(id: string, name: string, read: Reader, now: Date, extras: Extras = {}): Glance {
  switch (id) {
    case "clock": {
      const cd = read.get<Countdown>("clock.cd", { endAt: null, total: 0, label: "", pomo: null });
      if (cd.endAt && cd.endAt > now.getTime()) {
        const left = cd.endAt - now.getTime();
        const total = (cd.total || left / 1000) * 1000;
        return g(name, clockText(Math.ceil(left / 1000) * 1000), cd.pomo === "focus" ? "Focus" : cd.pomo === "break" ? "Break" : "Timer", 1 - left / total, true);
      }
      const sw = read.get<Stopwatch>("clock.sw", { running: false, startedAt: 0, acc: 0, laps: [] });
      const elapsed = sw.acc + (sw.running ? now.getTime() - sw.startedAt : 0);
      if (sw.running) return g(name, clockText(elapsed), "Stopwatch", null, true);
      if (elapsed > 0) return g(name, clockText(elapsed), "Stopwatch paused");
      return g(name, "Ready", "Timer · stopwatch");
    }
    case "todo": {
      const items = read.get<{ done: boolean }[]>("todo.items", []);
      const done = items.filter((i) => i.done).length;
      if (!items.length) return g(name, "Empty", "Add a task");
      const left = items.length - done;
      return g(name, left ? `${left} left` : "All done", `${done} of ${items.length} done`, done / items.length);
    }
    case "calc": {
      const last = read.get<{ result: string }[]>("calc.history", [])[0];
      return last ? g(name, last.result, "Last result") : g(name, "Ready", "Type or click");
    }
    case "notes":
      return extras.notes
        ? extras.notes.count
          ? g(name, plural(extras.notes.count, "note"), extras.notes.latest || "Latest note")
          : g(name, "No notes", "Start one")
        : g(name, "Notes", "Plain .txt files");
    case "clipboard":
      return extras.clip ? g(name, extras.clip, "Latest copy") : g(name, "History", "What you copied");
    case "units": {
      const st = read.get<{ cat: string; from: string; to: string; value: string }>("units.state", { cat: "length", from: "m", to: "ft", value: "1" });
      const cat = CATEGORIES.find((c) => c.id === st.cat);
      const from = cat?.units.find((u) => u.id === st.from);
      const to = cat?.units.find((u) => u.id === st.to);
      const n = Number(st.value);
      if (cat && from && to && st.value.trim() !== "" && Number.isFinite(n)) return g(name, `${short(convert(n, from, to))} ${to.id}`, `from ${short(n)} ${from.id}`);
      return g(name, "Convert", "Length, weight…");
    }
    case "links": {
      const n = read.get<unknown[]>("links.items", []).length;
      return n ? g(name, plural(n, "link"), "One click away") : g(name, "No links", "Save one");
    }
    case "apps": {
      const n = read.get<unknown[]>("apps.items", [1, 2, 3, 4, 5, 6]).length;
      return g(name, plural(n, "app"), "Launch quickly");
    }
    case "colors": {
      const saved = read.get<string[]>("colors.saved", []).length;
      return g(name, read.get<string>("colors.current", "#7c8cff").toUpperCase(), saved ? `${saved} saved` : "Eyedropper");
    }
    case "snippets": {
      const n = read.get<unknown[]>("snippets.items", [1, 2, 3]).length;
      return g(name, plural(n, "snippet"), "Click to paste");
    }
    case "passwords": {
      const len = read.get<{ length?: number }>("passwords.opts", {}).length ?? 20;
      return g(name, `${len} chars`, "Strong and random");
    }
    case "worldclock": {
      const local = localZone();
      const zones = read.get<string[]>("worldclock.zones", []);
      const tz = zones.find((z) => z !== local) ?? zones[0];
      if (!tz) return g(name, "Time zones", "Add a city");
      const time = new Intl.DateTimeFormat([], { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
      return g(name, time, tz.split("/").pop()!.replace(/_/g, " "), null, true);
    }
    default:
      return g(name, name, "");
  }
}

/** The glance for a launcher slot: where it goes, and that it opens the moment you let go. */
export function launchGlance(name: string, target: string): Glance {
  const raw = target.trim();
  let where = raw.split(/[\\/]/).filter(Boolean).pop() ?? raw; // a program or folder: its last segment
  try {
    const url = new URL(raw);
    // Only web and mail addresses count as URLs: "C:\\x\\app.exe" also parses as one, with a "c:" scheme.
    if (/^(https?|ftp):$/.test(url.protocol) && url.hostname) where = url.hostname.replace(/^www\./, "");
    else if (url.protocol === "mailto:") where = url.pathname;
  } catch {
    /* not a URL */
  }
  return g(name, where, "Opens on release");
}
