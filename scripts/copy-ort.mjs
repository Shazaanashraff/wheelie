// Copies the ONNX Runtime WebAssembly files into public/ort so the speech engine
// works offline and never loads code from a CDN. Runs before dev/build.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "onnxruntime-web", "dist");
const to = join(root, "public", "ort");
if (!existsSync(from)) {
  console.warn("copy-ort: onnxruntime-web not installed yet, skipping");
  process.exit(0);
}
mkdirSync(to, { recursive: true });
// The speech engine uses the "asyncify" build of the runtime (see whisper.worker.ts).
for (const f of ["ort-wasm-simd-threaded.asyncify.wasm", "ort-wasm-simd-threaded.asyncify.mjs"]) cpSync(join(from, f), join(to, f));
console.log("copy-ort: runtime copied to public/ort");
