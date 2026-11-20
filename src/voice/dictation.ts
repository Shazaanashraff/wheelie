import { h } from "../dom.ts";
import { ic, UI_ICONS } from "../icons.ts";
import type { VoiceModel } from "../model.ts";
import { cleanTranscript, formatClock } from "./dictationText.ts";
import { voice } from "./engine.ts";
import { isModelReady } from "./models.ts";
import { micErrorMessage, startRecording, type Recording } from "./recorder.ts";

type State = "idle" | "requesting" | "recording" | "transcribing" | "error";

export interface DictationOpts {
  model(): VoiceModel;
  /** Called with true while the mic prompt / recording needs the panel to stay open. */
  keepOpen(on: boolean): void;
  onText(text: string): void;
}

const BARS = 11;

/**
 * Press to talk, press again to finish: records, transcribes on this PC, and hands the
 * text to `onText`. Audio is only ever held in memory.
 */
export class Dictation {
  readonly button: HTMLButtonElement;
  readonly bar: HTMLElement;
  private state: State = "idle";
  private rec: Recording | null = null;
  private timer = 0;
  private status = h("span", { class: "voice-status" });
  private clock = h("span", { class: "voice-clock mono" }, "0:00");
  private bars: HTMLElement[] = Array.from({ length: BARS }, () => h("span", { class: "vbar" }));
  private levels: number[] = Array(BARS).fill(0);
  private pct: number | null = null;

  constructor(private o: DictationOpts) {
    this.button = h("button", { class: "icon-btn mic-btn anim-host", title: "Dictate (speak to write)", onClick: () => void this.toggle() }, ic("voice", 18));
    this.bar = h(
      "div",
      { class: "voice-bar", hidden: true },
      h("span", { class: "rec-dot" }),
      h("span", { class: "vbars" }, ...this.bars),
      this.clock,
      this.status,
      h("span", { class: "grow" }),
      h("button", { class: "btn stop-btn", title: "Finish", onClick: () => void this.stop() }, "Done"),
      h("button", { class: "icon-btn", title: "Discard", onClick: () => this.cancel() }, ic("close", 14)),
    );
    (this.bar.querySelector(".stop-btn") as HTMLElement).prepend(ic("stop", 12));
    void UI_ICONS;
  }

  get busy() {
    return this.state === "requesting" || this.state === "recording" || this.state === "transcribing";
  }

  toggle(): Promise<void> {
    if (this.state === "recording") return this.stop();
    if (this.busy) return Promise.resolve();
    return this.start();
  }

  async start(): Promise<void> {
    if (this.busy) return;
    this.set("requesting");
    this.o.keepOpen(true);
    try {
      this.rec = await startRecording((l) => this.level(l));
    } catch (e) {
      return this.fail(micErrorMessage(e));
    }
    this.set("recording");
    this.timer = window.setInterval(() => (this.clock.textContent = formatClock(performance.now() - this.rec!.startedAt)), 250);
    // Warm the model up while the user is talking, so there's little to wait for afterwards.
    void voice.load(this.o.model(), (p) => this.progress(p)).catch(() => {});
  }

  async stop(): Promise<void> {
    if (this.state !== "recording" || !this.rec) return;
    clearInterval(this.timer);
    const rec = this.rec;
    this.rec = null;
    this.set("transcribing");
    const audio = await rec.stop();
    if (audio.length < 16000 * 0.6) return this.fail("That was too short. Press the mic and speak a little longer.");
    try {
      const text = cleanTranscript(await voice.transcribe(audio, this.o.model(), (p) => this.progress(p)));
      if (!text) return this.fail("Didn't catch anything. Try again a bit closer to the microphone.");
      this.o.onText(text);
      this.set("idle");
      this.o.keepOpen(false);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      this.fail(/fetch|network|load failed|Failed to/i.test(msg) && !isModelReady(this.o.model()) ? "Couldn't download the voice model. Connect to the internet once, then try again." : `Transcription failed: ${msg}`);
    }
  }

  cancel(): void {
    clearInterval(this.timer);
    this.rec?.cancel();
    this.rec = null;
    this.pct = null;
    this.set("idle");
    this.o.keepOpen(false);
  }

  dispose(): void {
    this.cancel();
  }

  private fail(message: string) {
    clearInterval(this.timer);
    this.rec?.cancel();
    this.rec = null;
    this.set("error", message);
    this.o.keepOpen(false);
  }

  private level(l: number) {
    this.levels.push(l);
    this.levels.shift();
    this.bars.forEach((b, i) => (b.style.transform = `scaleY(${0.12 + this.levels[i] * 0.88})`));
  }

  private progress(p: number) {
    this.pct = p >= 99 ? null : p;
    this.render();
  }

  private set(s: State, message = "") {
    this.state = s;
    this.pct = null;
    this.bar.hidden = s === "idle";
    this.bar.dataset.state = s;
    this.button.classList.toggle("recording", s === "recording" || s === "requesting");
    if (s === "idle") this.clock.textContent = "0:00";
    this.status.textContent = message;
    this.render();
  }

  private render() {
    const s = this.state;
    if (s === "requesting") this.status.textContent = "Waiting for the microphone…";
    else if (s === "recording") this.status.textContent = this.pct != null ? `Listening · preparing voice model ${this.pct}%` : "Listening…";
    else if (s === "transcribing") this.status.textContent = this.pct != null ? `Downloading voice model ${this.pct}%…` : "Transcribing…";
  }
}
