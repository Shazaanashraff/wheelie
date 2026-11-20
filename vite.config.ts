import { defineConfig } from "vite";

// Tauri expects a fixed dev port and a plain static build output.
export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: "es2022", outDir: "dist", emptyOutDir: true },
});
