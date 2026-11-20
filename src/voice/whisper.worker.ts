/// <reference lib="webworker" />
/**
 * Speech-to-text worker. Runs a quantized Whisper model fully on this PC
 * (ONNX Runtime, WebAssembly). The model downloads once, then works offline.
 */
import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;
// Ship the WebAssembly runtime inside the app instead of fetching it from a CDN.
const wasm = (env.backends as any).onnx.wasm;
wasm.wasmPaths = new URL("/ort/", self.location.origin).href;
wasm.numThreads = 1; // multi-threading needs cross-origin isolation, which a desktop webview doesn't have

let asr: any = null;
let loaded = "";

type Msg = { type: "load"; repo: string; multilingual: boolean } | { type: "transcribe"; id: number; repo: string; audio: Float32Array; multilingual: boolean };

async function ensure(repo: string) {
  if (asr && loaded === repo) return;
  asr = null;
  const files = new Map<string, { loaded: number; total: number }>();
  asr = await pipeline("automatic-speech-recognition", repo, {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p: any) => {
      if (p.status === "progress" && p.total) {
        files.set(p.file, { loaded: p.loaded, total: p.total });
        let l = 0;
        let t = 0;
        for (const f of files.values()) (l += f.loaded), (t += f.total);
        (self as any).postMessage({ type: "progress", percent: Math.min(99, Math.round((l / t) * 100)) });
      }
    },
  });
  loaded = repo;
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try {
    await ensure(m.repo);
    if (m.type === "load") {
      (self as any).postMessage({ type: "ready" });
      return;
    }
    // English-only models reject a `language`; multilingual ones auto-detect when it is omitted.
    const out = await asr(m.audio, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: false });
    const text = Array.isArray(out) ? out.map((o: any) => o.text).join(" ") : out.text;
    (self as any).postMessage({ type: "result", id: m.id, text: String(text ?? "").trim() });
  } catch (err) {
    (self as any).postMessage({ type: "error", id: (m as any).id, message: (err as Error)?.message ?? String(err) });
  }
};
