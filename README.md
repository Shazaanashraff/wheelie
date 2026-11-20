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

### Tools (v1)

Calculator (type the math, Enter copies the result) · Clock (stopwatch, timer, pomodoro) · Notes (multiple, autosaved) · To-do · Clipboard history (click to paste) · Unit converter · Links · App launcher

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

(`cargo test --manifest-path src-tauri/Cargo.toml` runs the trigger state-machine tests.)

## How it works

```
src-tauri/src/
  trigger.rs    Hold/release logic as a pure state machine (unit tested, no OS calls)
  hook_win.rs   Windows low-level keyboard + mouse hooks that feed trigger.rs
  winutil.rs    Focus handling, paste (Ctrl+V injection), clipboard format checks
  clip.rs       Clipboard history thread (in memory only)
  main.rs       Window placement, tray, commands exposed to the UI
src/
  ring.ts       Ring rendering + slice hit-testing
  main.ts       Ring/panel state machine
  tools/        One file per tool
  bridge.ts     Seam to Rust; simulated in a plain browser
```

One transparent, always-on-top window does everything. On a hold, Rust moves it under the cursor, shows it, and streams pointer positions to the UI (the window isn't focused yet, so the UI can't read the mouse itself). Near a screen edge the ring is moved fully on-screen and the cursor is moved to its centre.

## Things to know

- **Global hooks.** Wheelie installs Windows low-level keyboard and mouse hooks. They look only at Space/Alt and the mouse button you chose, and nothing is recorded or sent anywhere. The logic is in `trigger.rs` and `hook_win.rs` if you want to check.
- **The trigger is swallowed.** While Wheelie is running, Alt+Space no longer opens the window menu, and the chosen mouse button no longer works normally in other apps. Change or turn off either in Settings.
- **Clipboard history is memory-only** and skips copies flagged by password managers. It is cleared when you quit.
- **Your data** (notes, to-dos, links, settings) is stored locally in the app's WebView storage. There is no account and no network use.
- **Status:** the Windows-only code compiles cleanly for Windows, and the logic and UI are tested, but the finished app has not yet been run on a real Windows machine. Expect to find a rough edge or two in focus handling.

## Ideas for next

Launch at login · Ask AI tool (your own API key) · Screenshot / colour picker / screen record · window snapping · a second ring of 8 · currency in Units
