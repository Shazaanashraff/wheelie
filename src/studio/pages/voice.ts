import { h } from "../../core/dom.ts";
import { ic } from "../../core/icons.ts";
import type { VoiceModel } from "../../core/model.ts";
import { group, row } from "../../core/ui.ts";
import { voice } from "../../voice/engine.ts";
import { VOICE_MODELS, isModelReady } from "../../voice/models.ts";
import { micErrorMessage, startRecording, type Recording } from "../../voice/recorder.ts";
import type { Page, StudioCtx } from "../ctx.ts";

export function voicePage(ctx: StudioCtx): Page {
  const body = h("div", { class: "controls wide" });
  let rec: Recording | null = null;

  function micTest() {
    const bars = Array.from({ length: 24 }, () => h("span", { class: "vbar" }));
    const meter = h("div", { class: "vbars wide" }, ...bars);
    const status = h("span", { class: "hint" }, "Speak to see the level move");
    const idle = () => [ic("voice", 16), " Test microphone"];
    const btn = h("button", { class: "btn mic-test-btn" }, ...idle());
    const levels: number[] = Array(24).fill(0);
    const stop = async () => {
      await rec?.stop();
      rec = null;
      btn.replaceChildren(...idle());
      status.textContent = "Stopped";
    };
    btn.addEventListener("click", async () => {
      if (rec) return void stop();
      try {
        rec = await startRecording((l) => {
          levels.push(l);
          levels.shift();
          bars.forEach((b, i) => (b.style.transform = `scaleY(${0.12 + levels[i] * 0.88})`));
        });
        btn.textContent = "Stop";
        status.textContent = "Listening… nothing is saved";
        setTimeout(() => rec && void stop(), 8000);
      } catch (e) {
        status.textContent = micErrorMessage(e);
      }
    });
    return h("div", { class: "mic-test" }, h("div", { class: "row" }, btn, status), meter);
  }

  function render() {
    const s = ctx.settings;
    const progress = h("div", { class: "progress", hidden: true }, h("div", { class: "progress-fill" }));
    const info = h("div", { class: "hint" });
    const dl = h("button", { class: "btn" }, "Download now");
    const draw = () => {
      const ready = isModelReady(s.voiceModel);
      info.textContent = ready ? "Ready. Works offline." : "Not downloaded yet. It downloads once (needs internet), then works offline.";
      dl.hidden = ready;
    };
    dl.addEventListener("click", async () => {
      dl.setAttribute("disabled", "");
      progress.hidden = false;
      const fill = progress.firstElementChild as HTMLElement;
      try {
        await voice.load(s.voiceModel, (p) => ((fill.style.width = p + "%"), (dl.textContent = `Downloading ${p}%`)));
        fill.style.width = "100%";
      } catch {
        info.textContent = "Couldn't download. Check your internet connection and try again.";
      }
      render();
    });
    draw();

    body.replaceChildren(
      h("p", { class: "lead small" }, "Dictate notes by voice. Speech is turned into text on this PC by a small model. Your audio is never uploaded or saved, only the text you get."),
      group(
        "Speech model",
        h(
          "div",
          { class: "model-list pad" },
          ...VOICE_MODELS.map((m) =>
            h(
              "button",
              { class: "model-card" + (m.id === s.voiceModel ? " on" : ""), onClick: () => (ctx.update({ voiceModel: m.id as VoiceModel }), render()) },
              h("span", { class: "model-radio" }),
              h("span", { class: "model-main" }, h("span", { class: "model-name" }, m.label), h("span", { class: "hint" }, `${m.note} · ${m.size}`)),
              isModelReady(m.id) ? h("span", { class: "lib-badge ok" }, "Ready") : null,
            ),
          ),
        ),
        h("div", { class: "pad stack" }, info, progress, dl),
      ),
      group("Microphone", h("div", { class: "pad" }, micTest())),
      group("Using it", row("In Notes", h("span", { class: "hint" }, "Press the mic, speak, then Done"), "Windows may ask to allow the microphone the first time.")),
    );
  }
  render();
  return { el: h("div", { class: "page" }, h("header", { class: "page-head" }, h("h1", {}, "Voice"), h("p", { class: "lead" }, "Speak a note, get text.")), body), destroy: () => void rec?.cancel() };
}
