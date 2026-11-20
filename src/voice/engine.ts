import type { VoiceModel } from "../core/model.ts";
import { markModelReady, modelInfo } from "./models.ts";

type Pending = { resolve: (t: string) => void; reject: (e: Error) => void };

/** Main-thread handle on the speech worker. One worker, created on first use. */
class VoiceEngine {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private loadWaiters: Pending[] = [];
  private onProgress: ((percent: number) => void) | null = null;
  private model: VoiceModel | null = null;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") this.onProgress?.(m.percent);
      else if (m.type === "ready") {
        if (this.model) markModelReady(this.model);
        this.loadWaiters.splice(0).forEach((p) => p.resolve(""));
      } else if (m.type === "result") {
        if (this.model) markModelReady(this.model);
        this.pending.get(m.id)?.resolve(m.text);
        this.pending.delete(m.id);
      } else if (m.type === "error") {
        const err = new Error(m.message);
        if (m.id !== undefined && this.pending.has(m.id)) {
          this.pending.get(m.id)!.reject(err);
          this.pending.delete(m.id);
        } else this.loadWaiters.splice(0).forEach((p) => p.reject(err));
      }
    };
    w.onerror = (e) => {
      const err = new Error(e.message || "The speech engine failed to start");
      this.pending.forEach((p) => p.reject(err));
      this.pending.clear();
      this.loadWaiters.splice(0).forEach((p) => p.reject(err));
      this.worker = null;
    };
    this.worker = w;
    return w;
  }

  /** Download (first time) and load the model, without transcribing anything. */
  load(model: VoiceModel, onProgress?: (percent: number) => void): Promise<void> {
    this.onProgress = onProgress ?? null;
    this.model = model;
    const info = modelInfo(model);
    return new Promise<void>((resolve, reject) => {
      this.loadWaiters.push({ resolve: () => resolve(), reject });
      this.ensureWorker().postMessage({ type: "load", repo: info.repo, multilingual: !model.endsWith(".en") });
    });
  }

  /** `audio` is mono 16 kHz float samples. */
  transcribe(audio: Float32Array, model: VoiceModel, onProgress?: (percent: number) => void): Promise<string> {
    this.onProgress = onProgress ?? null;
    this.model = model;
    const info = modelInfo(model);
    const id = ++this.seq;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ensureWorker().postMessage({ type: "transcribe", id, repo: info.repo, audio, multilingual: !model.endsWith(".en") }, [audio.buffer]);
    });
  }
}

export const voice = new VoiceEngine();
