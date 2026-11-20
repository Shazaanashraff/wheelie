# Wheelie

A radial "weapon wheel" menu for Windows, built for personal use. Hold a shortcut, a ring of tools opens around your pointer, point at one and let go.

Inspired by [Helix](https://tryhelix.app/) (Mac). This is an independent rewrite for Windows: no code, artwork or branding is shared.

## Using it

| Do this | To get |
| --- | --- |
| Hold **Alt + Space** (or the **middle mouse button**) | The ring opens at your pointer |
| Move to a slice and release | Opens that tool |
| Release in the centre hub | Cancels |
| Quick tap instead of a hold | Ring stays open: click a slice, or press **1-8** |
| **Esc**, or click away from a panel | Closes it |
| Right-click the tray icon | Settings / Quit |

The trigger keys, theme, accent colour and which tools are in the ring (and their order) are all in **Settings**.

### The ring, slots and the tool library

The ring has **8 slots**. Each slot holds either a **tool from the library** or a **launcher** that runs an app, folder or link the moment you release over it (no panel). Open **Settings → Ring** to change what is in each slot, reorder, or empty a slot (at least 2 must stay). Picking a tool that is already in another slot swaps the two.

Library: Calculator · Clock · Notes · To-do · Clipboard · Units · Links · Apps · **Colours** (eyedropper + saved palette) · **Snippets** (saved text, `{date}` `{time}` `{weekday}` filled in, click to paste) · **Passwords** (strong random passwords) · **World clock**

### Look and motion

**Settings → Look**: 8 themes (Dark, Light, Midnight, Graphite, Sunset, Forest, Rose, Tinted), 10 accent colours plus a custom picker, icon colour (match theme / accent / colourful), icon style (line / duotone), icon weight, ring transparency, and motion (Full / Subtle / Off; also respects the Windows reduced-motion setting).

The icons are Wheelie's own set, drawn as SVG, and they animate on hover (the stopwatch hand sweeps, the lock opens, the chain links part, calculator keys ripple...). The ring blooms open and slices lean toward your pointer.

### Voice notes

In **Notes**, press the mic (or the mic next to *New* for a brand-new voice note), speak, then press **Done**. Your words are written into the note and saved as text like anything you type.

- **Private:** speech is turned into text **on your PC** by a small Whisper model. Audio is never uploaded and never saved, only the text.
- **First use:** the model (about 45 MB) downloads once from Hugging Face, then works offline. You can pre-download it, or pick a more accurate or multilingual model, in **Settings → Voice**.
- Windows may ask to allow microphone access the first time. If it was blocked, enable it in *Settings → Privacy & security → Microphone*.

### Tools (v1)

- **Calculator**: its own keypad and design (nothing from Windows is launched). Type on the keyboard or click keys, live result as you type, `fx` for scientific keys, history. `=` copies the result.
- **Notes**: every note is a plain **`.txt` file** in `Documents\Wheelie Notes`, so you can open, back up or sync them with anything. The Notes tool shows a searchable history (newest first, with a preview and date), autosaves as you type, and never creates empty files. Deleting asks for a second click.
- **Clock** (stopwatch, timer, pomodoro) · **To-do** · **Clipboard history** (click to paste) · **Unit converter** · **Links** · **App launcher**

![All screens](docs/previews/00-overview-v2.png)

More screens are in [`docs/previews`](docs/previews).

## Get it on Windows

Pushing to GitHub runs `.github/workflows/windows.yml`, which builds on a Windows runner and uploads:

- `wheelie-windows-installer`: the `.exe` installer (per-user, no admin needed)
- `wheelie-windows-portable-exe`: just `wheelie.exe`

Open the workflow run on GitHub, download the artifact, run it. Windows SmartScreen will warn because the app is unsigned: **More info → Run anyway**.

## Develop

Prerequisites on Windows: [Node 22+](https://nodejs.org), [Rust](https://rustup.rs), and the Visual Studio C++ build tools. WebView2 ships with Windows 10/11.

```sh
npm install
npm run tauri dev      # the real app, with the global hooks
npm run tauri build    # produces the installer in src-tauri/target/release/bundle/nsis
```

The UI can also be developed in any browser, on any OS, without Rust:

```sh
npm run dev            # then hold the middle mouse button, or Space, to open the ring
npm test               # calculator parser + unit conversion tests
```

(`cargo test --manifest-path src-tauri/Cargo.toml` runs the trigger state-machine and notes-file tests.)

## How it works

```
src-tauri/src/
  trigger.rs    Hold/release logic as a pure state machine (unit tested, no OS calls)
  hook_win.rs   Windows low-level keyboard + mouse hooks that feed trigger.rs
  winutil.rs    Focus handling, paste (Ctrl+V injection), clipboard format checks
  clip.rs       Clipboard history thread (in memory only)
  notes_core.rs Notes as .txt files: list/read/write/delete (unit tested, path-traversal safe)
  notes.rs      Tauri commands wrapping notes_core
  main.rs       Window placement, tray, commands exposed to the UI
src/
  ring.ts       Ring rendering, hit-testing, bloom/lean motion
  main.ts       Ring/panel state machine, slot activation
  model.ts      Settings + slot model (migration from older settings), unit tested
  themes.ts     Theme palettes and applying appearance
  icons.ts      Wheelie's animated icon set;  iconMotion.css: the motion
  tools/        One file per tool; registry.ts is the library
  voice/        Recorder, Whisper worker, dictation controller
  bridge.ts     Seam to Rust; simulated in a plain browser
```

One transparent, always-on-top window does everything. On a hold, Rust moves it under the cursor, shows it, and streams pointer positions to the UI (the window isn't focused yet, so the UI can't read the mouse itself). Near a screen edge the ring is moved fully on-screen and the cursor is moved to its centre.

## Things to know

- **Global hooks.** Wheelie installs Windows low-level keyboard and mouse hooks. They look only at Space/Alt and the mouse button you chose, and nothing is recorded or sent anywhere. The logic is in `trigger.rs` and `hook_win.rs` if you want to check.
- **The trigger is swallowed.** While Wheelie is running, Alt+Space no longer opens the window menu, and the chosen mouse button no longer works normally in other apps. Change or turn off either in Settings.
- **Clipboard history is memory-only** and skips copies flagged by password managers. It is cleared when you quit.
- **Your data** stays on your machine. Notes are `.txt` files in `Documents\Wheelie Notes`; to-dos, links, settings and calculator history live in the app's local WebView storage. There is no account and no network use.
- **Status:** the Windows-only code compiles cleanly for Windows, and the logic and UI are tested, but the finished app has not yet been run on a real Windows machine. Expect to find a rough edge or two in focus handling.

## Ideas for next

Launch at login · Ask AI tool (your own API key) · Screenshot / colour picker / screen record · window snapping · a second ring of 8 · currency in Units
