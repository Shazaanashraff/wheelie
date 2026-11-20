import { h } from "../core/dom.ts";
import { store } from "../core/store.ts";
import type { Tool } from "./types.ts";

type Tab = "stopwatch" | "timer" | "pomodoro";
type Phase = "focus" | "break";

interface Stopwatch {
  running: boolean;
  startedAt: number;
  acc: number;
  laps: number[];
}
interface Countdown {
  endAt: number | null;
  total: number; // seconds
  label: string;
  pomo: Phase | null;
}

const POMO = { focus: 25 * 60, break: 5 * 60 };

const sw = () => store.get<Stopwatch>("clock.sw", { running: false, startedAt: 0, acc: 0, laps: [] });
const cd = () => store.get<Countdown>("clock.cd", { endAt: null, total: 0, label: "", pomo: null });
const tab = () => store.get<Tab>("clock.tab", "stopwatch");

const swElapsed = (s: Stopwatch) => s.acc + (s.running ? Date.now() - s.startedAt : 0);

export function fmtMs(ms: number): string {
  const cs = Math.floor(ms / 10) % 100;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(m)}:${p(s)}.${p(cs)}`;
}
export function fmtSec(sec: number): string {
  sec = Math.max(0, Math.ceil(sec));
  const p = (n: number) => String(n).padStart(2, "0");
  const hh = Math.floor(sec / 3600);
  return hh ? `${hh}:${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}` : `${p(Math.floor(sec / 60))}:${p(sec % 60)}`;
}

function beep() {
  try {
    const ac = new AudioContext();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.2);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + t);
      o.stop(ac.currentTime + t + 0.22);
    });
  } catch {
    /* no audio available */
  }
}

/** Runs for the lifetime of the app so timers fire even while the panel is closed. */
export function watchAlarms(onFire: (message: string) => void): void {
  setInterval(() => {
    const c = cd();
    if (c.endAt == null || Date.now() < c.endAt) return;
    let message = c.label ? `${c.label} finished` : "Timer finished";
    if (c.pomo) {
      const next: Phase = c.pomo === "focus" ? "break" : "focus";
      message = c.pomo === "focus" ? "Focus session done. Take a break." : "Break over. Back to focus.";
      store.set("clock.cd", { endAt: Date.now() + POMO[next] * 1000, total: POMO[next], label: "", pomo: next });
    } else {
      store.set("clock.cd", { ...c, endAt: null });
    }
    store.set("clock.notice", message);
    beep();
    onFire(message);
  }, 500);
}

export const clock: Tool = {
  id: "clock",
  name: "Clock",
  desc: "Stopwatch, timer and pomodoro",
  size: [360, 440],
  mount(root) {
    const body = h("div", { class: "clock-body" });
    const tabs = h("div", { class: "tabs" });
    const notice = store.get<string>("clock.notice", "");
    store.set("clock.notice", "");
    if (notice) root.append(tabs, h("div", { class: "notice" }, notice), body);
    else root.append(tabs, body);

    let timer: number | undefined;
    let tick: (() => void) | null = null;

    function setTab(t: Tab) {
      store.set("clock.tab", t);
      render();
    }

    function render() {
      clearInterval(timer);
      tick = null;
      const cur = tab();
      tabs.replaceChildren(
        ...(["stopwatch", "timer", "pomodoro"] as Tab[]).map((t) =>
          h("button", { class: "tab" + (t === cur ? " on" : ""), onClick: () => setTab(t) }, t[0].toUpperCase() + t.slice(1)),
        ),
      );
      body.replaceChildren();
      if (cur === "stopwatch") renderStopwatch();
      else renderCountdown(cur);
      // `tick` is assigned inside the render helpers; widen so TS doesn't narrow it to null.
      const t = tick as (() => void) | null;
      if (t) {
        t();
        timer = window.setInterval(t, 50);
      }
    }

    function renderStopwatch() {
      const big = h("div", { class: "big mono" });
      const laps = h("div", { class: "laps" });
      const btnA = h("button", { class: "btn primary" });
      const btnB = h("button", { class: "btn" });

      const draw = () => {
        const s = sw();
        big.textContent = fmtMs(swElapsed(s));
        btnA.textContent = s.running ? "Pause" : s.acc > 0 ? "Resume" : "Start";
        btnB.textContent = s.running ? "Lap" : "Reset";
        btnB.toggleAttribute("disabled", !s.running && s.acc === 0);
      };
      const drawLaps = () => {
        const s = sw();
        laps.replaceChildren(
          ...s.laps
            .map((l, i) => {
              const prev = i === 0 ? 0 : s.laps[i - 1];
              return h("div", { class: "lap mono" }, h("span", {}, `Lap ${i + 1}`), h("span", {}, "+" + fmtMs(l - prev)), h("span", {}, fmtMs(l)));
            })
            .reverse(),
        );
      };

      btnA.addEventListener("click", () => {
        const s = sw();
        if (s.running) store.set("clock.sw", { ...s, running: false, acc: swElapsed(s) });
        else store.set("clock.sw", { ...s, running: true, startedAt: Date.now() });
        draw();
      });
      btnB.addEventListener("click", () => {
        const s = sw();
        if (s.running) store.set("clock.sw", { ...s, laps: [...s.laps, swElapsed(s)] });
        else store.set("clock.sw", { running: false, startedAt: 0, acc: 0, laps: [] });
        draw();
        drawLaps();
      });

      body.append(big, h("div", { class: "row center" }, btnB, btnA), laps);
      drawLaps();
      tick = draw;
    }

    function renderCountdown(kind: Tab) {
      const c = cd();
      const isPomo = kind === "pomodoro";
      const active = c.endAt != null && (isPomo ? c.pomo !== null : c.pomo === null);
      const big = h("div", { class: "big mono" });
      const sub = h("div", { class: "sub" });

      if (active) {
        const remaining = () => ((c.endAt as number) - Date.now()) / 1000;
        tick = () => {
          const r = remaining();
          big.textContent = fmtSec(r);
          const pct = c.total ? Math.min(100, Math.max(0, (1 - r / c.total) * 100)) : 0;
          bar.style.width = pct + "%";
        };
        sub.textContent = isPomo ? (c.pomo === "focus" ? "Focus" : "Break") : c.label || "Timer";
        const bar = h("div", { class: "bar-fill" });
        body.append(
          sub,
          big,
          h("div", { class: "bar" }, bar),
          h(
            "div",
            { class: "row center" },
            h("button", {
              class: "btn",
              textContent: "Cancel",
              onClick: () => {
                store.set("clock.cd", { endAt: null, total: 0, label: "", pomo: null });
                render();
              },
            }),
          ),
        );
        return;
      }

      if (isPomo) {
        body.append(
          h("div", { class: "sub" }, "25 min focus, 5 min break, repeating"),
          h("div", { class: "big mono" }, "25:00"),
          h(
            "div",
            { class: "row center" },
            h("button", {
              class: "btn primary",
              textContent: "Start focus",
              onClick: () => {
                store.set("clock.cd", { endAt: Date.now() + POMO.focus * 1000, total: POMO.focus, label: "", pomo: "focus" });
                render();
              },
            }),
          ),
        );
        return;
      }

      const start = (minutes: number) => {
        if (!(minutes > 0)) return;
        store.set("clock.cd", { endAt: Date.now() + minutes * 60000, total: minutes * 60, label: "", pomo: null });
        render();
      };
      const custom = h("input", { class: "input", type: "number", min: "0.1", step: "any", placeholder: "Minutes", style: "width:110px" });
      custom.addEventListener("keydown", (e) => e.key === "Enter" && start(parseFloat(custom.value)));
      body.append(
        h("div", { class: "sub" }, "Start a countdown"),
        h("div", { class: "chips" }, ...[1, 5, 10, 15, 25, 45, 60].map((m) => h("button", { class: "chip", onClick: () => start(m) }, `${m} min`))),
        h("div", { class: "row center" }, custom, h("button", { class: "btn primary", textContent: "Start", onClick: () => start(parseFloat(custom.value)) })),
      );
    }

    render();
    return () => clearInterval(timer);
  },
};
