import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * onnxruntime-web references its WebAssembly file by URL, so Vite emits a 26 MB copy
 * into dist/assets. The app loads the runtime from /ort/ (see scripts/copy-ort.mjs)
 * instead, so drop the unused duplicate rather than shipping it twice.
 */
const dropDuplicateOrtWasm = (): Plugin => ({
  name: "drop-duplicate-ort-wasm",
  generateBundle(_, bundle) {
    for (const name of Object.keys(bundle)) if (/^assets\/ort-wasm.*\.wasm$/.test(name)) delete bundle[name];
  },
});

// `WHEELIE_GALLERY=1 vite build` builds only the self-contained motion gallery (gallery.html).
const galleryOnly = process.env.WHEELIE_GALLERY === "1";

// Tauri expects a fixed dev port and a plain static build output.
export default defineConfig({
  clearScreen: false,
  plugins: [dropDuplicateOrtWasm()],
  publicDir: galleryOnly ? false : "public",
  server: { port: 1420, strictPort: true },
  // Two pages: the quick-touch overlay (index.html) and the Wheelie app window (studio.html).
  build: {
    target: "es2022",
    outDir: galleryOnly ? "dist-gallery" : "dist",
    emptyOutDir: true,
    rollupOptions: { input: galleryOnly ? { gallery: resolve(__dirname, "gallery.html") } : { main: resolve(__dirname, "index.html"), studio: resolve(__dirname, "studio.html") } },
  },
});
