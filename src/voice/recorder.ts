/** Microphone capture as mono 16 kHz float samples (what Whisper expects). Nothing is written to disk. */

export interface Recording {
  /** Stop and return everything recorded. */
  stop(): Promise<Float32Array>;
  /** Stop and throw the audio away. */
  cancel(): void;
  readonly startedAt: number;
}

const MAX_SECONDS = 10 * 60;

const WORKLET = `
class Rec extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice());
    return true;
  }
}
registerProcessor("wheelie-rec", Rec);
`;

export const micErrorMessage = (e: unknown): string => {
  const name = (e as DOMException)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone is blocked. Allow it in Windows Settings > Privacy & security > Microphone.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone found.";
  if (name === "NotReadableError") return "The microphone is in use by another app.";
  return `Couldn't use the microphone: ${(e as Error)?.message ?? e}`;
};

export function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export async function startRecording(onLevel: (level: number) => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const ctx = new AudioContext({ sampleRate: 16000 });
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "wheelie-rec");
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const chunks: Float32Array[] = [];
  let samples = 0;
  let done = false;
  node.port.onmessage = (e) => {
    if (done) return;
    chunks.push(e.data as Float32Array);
    samples += (e.data as Float32Array).length;
    if (samples > MAX_SECONDS * ctx.sampleRate) void stop();
  };
  source.connect(analyser);
  source.connect(node);
  node.connect(ctx.destination); // keeps the worklet running; it outputs silence

  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let peak = 0;
    for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
    onLevel(Math.min(1, peak / 90));
    raf = requestAnimationFrame(tick);
  };
  tick();

  const teardown = async () => {
    done = true;
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    try {
      source.disconnect();
      node.disconnect();
      await ctx.close();
    } catch {
      /* already closed */
    }
  };
  let result: Promise<Float32Array> | null = null;
  const stop = () => (result ??= teardown().then(() => concat(chunks)));
  return { stop, cancel: () => void teardown(), startedAt: performance.now() };
}
