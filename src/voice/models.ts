import type { VoiceModel } from "../core/model.ts";

export interface ModelInfo {
  id: VoiceModel;
  label: string;
  /** Hugging Face repo with ONNX weights. */
  repo: string;
  /** Approximate one-time download. */
  size: string;
  note: string;
}

export const VOICE_MODELS: ModelInfo[] = [
  { id: "tiny.en", label: "Fast (English)", repo: "onnx-community/whisper-tiny.en", size: "~45 MB", note: "Quick, good for short notes" },
  { id: "base.en", label: "Accurate (English)", repo: "onnx-community/whisper-base.en", size: "~85 MB", note: "Fewer mistakes, a little slower" },
  { id: "tiny", label: "Multilingual", repo: "onnx-community/whisper-tiny", size: "~80 MB", note: "Many languages, auto-detected" },
];

export const modelInfo = (id: VoiceModel): ModelInfo => VOICE_MODELS.find((m) => m.id === id) ?? VOICE_MODELS[0];

/** Remember which models finished downloading (the files themselves live in the browser cache). */
const readyKey = (id: VoiceModel) => `wheelie:voice.ready.${id}`;
export const isModelReady = (id: VoiceModel): boolean => {
  try {
    return localStorage.getItem(readyKey(id)) === "1";
  } catch {
    return false;
  }
};
export const markModelReady = (id: VoiceModel): void => {
  try {
    localStorage.setItem(readyKey(id), "1");
  } catch {
    /* ignore */
  }
};
