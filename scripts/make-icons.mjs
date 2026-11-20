#!/usr/bin/env node
// Draws the app icon set from the character's sprite (src/overlay/sprite.ts), so the icon and the
// character in the ring are always the same drawing. No dependencies: it writes PNG and ICO itself.
//
//   npm run icons
//
// Pixel art goes soft when resized, so every size is drawn at a whole number of icon pixels per
// sprite pixel. Small sizes (up to 48) are the bare character, which stays readable in the tray;
// larger sizes put it on a rounded dark tile.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { BODY, COLS, EYES, FEET, ICON_COLORS } from "../src/overlay/sprite.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src-tauri", "icons");

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** The sprite as [column, row, colour] triples: body, feet (first frame) and calm eyes. */
function pixels() {
  const out = [];
  BODY.forEach((line, r) => [...line].forEach((ch, c) => ch !== "." && out.push([c, r, hex(ICON_COLORS[ch])])));
  [...FEET[0]].forEach((ch, c) => ch !== "." && out.push([c, BODY.length, hex(ICON_COLORS["4"])]));
  for (const c of [EYES.left, EYES.right]) for (const r of [EYES.top, EYES.top + 1]) out.push([c, r, hex(ICON_COLORS.ink)]);
  return out;
}
const SPRITE = pixels();
const ROWS = BODY.length + 1;

/** Sprite pixels per side, for a given icon size. Whole numbers only. */
function scaleFor(size) {
  if (size <= 16) return 1;
  if (size <= 32) return 2;
  if (size <= 48) return 3;
  return Math.max(1, Math.floor((size * 0.62) / COLS));
}

function render(size) {
  const buf = new Uint8Array(size * size * 4); // RGBA, transparent
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = a;
  };
  if (size >= 64) {
    // A rounded dark tile with a soft diagonal gradient, anti-aliased at the corners.
    const rad = size * 0.22;
    const [a, b] = [hex("#262c4a"), hex("#14161b")];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = Math.max(Math.abs(x + 0.5 - size / 2) - (size / 2 - rad), 0);
        const dy = Math.max(Math.abs(y + 0.5 - size / 2) - (size / 2 - rad), 0);
        const cover = Math.max(0, Math.min(1, 0.5 - (Math.hypot(dx, dy) - rad)));
        if (cover === 0) continue;
        const t = (x + y) / (2 * size);
        set(x, y, a.map((v, i) => Math.round(v + (b[i] - v) * t)), Math.round(cover * 255));
      }
  }
  const k = scaleFor(size);
  const ox = Math.floor((size - COLS * k) / 2);
  const oy = Math.floor((size - ROWS * k) / 2);
  for (const [c, r, rgb] of SPRITE)
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) set(ox + c * k + x, oy + r * k + y, rgb);
  return buf;
}

// ---- PNG and ICO encoders -------------------------------------------------------------------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(size) {
  const rgba = render(size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function ico(sizes) {
  const images = sizes.map(png);
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + i * 16;
    head[e] = s >= 256 ? 0 : s;
    head[e + 1] = s >= 256 ? 0 : s;
    head.writeUInt16LE(1, e + 4); // colour planes
    head.writeUInt16LE(32, e + 6); // bits per pixel
    head.writeUInt32LE(images[i].length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += images[i].length;
  });
  return Buffer.concat([head, ...images]);
}

// ---- write the set --------------------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
const files = {
  "32x32.png": 32,
  "64x64.png": 64,
  "128x128.png": 128,
  "128x128@2x.png": 256,
  "icon.png": 512,
  "StoreLogo.png": 50,
  ...Object.fromEntries([30, 44, 71, 89, 107, 142, 150, 284, 310].map((n) => [`Square${n}x${n}Logo.png`, n])),
};
for (const [name, size] of Object.entries(files)) writeFileSync(join(outDir, name), png(size));
writeFileSync(join(outDir, "icon.ico"), ico([16, 24, 32, 48, 64, 128, 256]));
// Wheelie is Windows-only and builds an NSIS installer, so a macOS icon would only be dead weight (and out of date).
rmSync(join(outDir, "icon.icns"), { force: true });
console.log(`icons: wrote ${Object.keys(files).length} PNGs and icon.ico to src-tauri/icons`);
