# Development guide

How to build, run and test Wheelie. For the contribution process, see [CONTRIBUTING.md](../CONTRIBUTING.md). For how the code fits together, see [architecture.md](architecture.md).

## Prerequisites

| To do this | You need |
| --- | --- |
| Work on the UI, run tests, build the web bundle | [Node 22+](https://nodejs.org). Works on Windows, macOS and Linux. |
| Run or build the real app | The above, plus [Rust](https://rustup.rs) (stable) and the Visual Studio C++ build tools, on **Windows**. WebView2 ships with Windows 10/11. |

The real app uses Windows-only APIs (low-level input hooks), so it can only be built and run on Windows. Almost everything else can be developed anywhere, because the UI runs in an ordinary browser.

## Commands

```sh
npm install              # once
npm run dev              # UI in the browser at http://localhost:1420
npm run tauri dev        # the real app, with the global hooks (Windows)
npm run typecheck        # TypeScript, no emit
npm test                 # all frontend and script tests
npm run build            # typecheck + production web build into dist/
npm run tauri build      # installer in src-tauri/target/release/bundle/nsis (Windows)
cargo test --manifest-path src-tauri/Cargo.toml   # Rust tests (Windows)
```

The first `npm run tauri dev` also registers Wheelie to start with Windows. Turn that off in the app's **General** page if you do not want it.

## Working in the browser

`npm run dev` serves three pages, with the Rust side simulated by `src/core/bridge.ts`:

| Page | URL | What it is |
| --- | --- | --- |
| The wheel | <http://localhost:1420/> | Hold the **middle mouse button** or **Space** to open the ring, move over a slice, release. |
| The Wheelie app | <http://localhost:1420/studio.html> | The settings window: themes, ring editor, library, voice, general. |
| Motion gallery | <http://localhost:1420/gallery.html> | Every animation, hoverable and clickable, with theme and motion-level switches. |

Settings are shared between the pages through `localStorage`, so changing a theme in the app page changes the wheel page live, as it does in the real app.

## Project layout

```
.github/            Issue forms, PR template, CI and release workflows, Dependabot
docs/               Guides (this folder); previews/ holds screenshots and GIFs
scripts/            Release helper (version.mjs) and build helpers
src/
  core/             Shared code: settings model, themes, motion engine, icons, DOM helpers, bridge to Rust
  overlay/          The wheel window: ring engine, the Wheelie character, geometry, panel placement and motion
  studio/           The Wheelie app window: shell, live preview, one file per page
  tools/            The tools. One file per tool; registry.ts is the library
  voice/            Voice notes: recorder, Whisper worker, dictation controller
  gallery/          The motion gallery page
  styles/           base.css (layout, ring, panels, tools) and icons.css (icon colour and motion)
src-tauri/
  src/              Rust: input hooks, window handling, tray, clipboard, notes files
  tauri.conf.json   App and window configuration
index.html          Entry for the wheel        studio.html   Entry for the app window
gallery.html        Entry for the motion gallery
```

Tests live next to the code they test, as `*.test.ts`, and run on Node's built-in test runner. Logic that can be tested without a DOM is kept in its own file for that reason.

## Tests

```sh
npm test
```

covers the calculator parser and state, what the ring's centre shows for each tool, the character's gaze and timing, unit and time-zone data, colour maths, password generation, snippet formatting, the settings model and its migration, theme and contrast logic, spring physics, ring geometry, panel placement, and the release script.

Rust tests cover the trigger state machine (`trigger.rs`) and the notes file layer (`notes_core.rs`). They run on Windows in CI.

## Checking visual changes

Wheelie is very visual, so look at your change:

- Try it in **several themes**, at least one light (Light or Rose) and one dark, and with Accent and Colourful icon colours.
- Try **Motion: Full, Subtle and Off**.
- Check text on accent-coloured surfaces. Graphite's light accent is a good stress test.
- Use the [motion gallery](http://localhost:1420/gallery.html) to see every animation in one place.

## Continuous integration

Every pull request runs `.github/workflows/ci.yml`:

- **Typecheck, test, build UI** on Linux.
- **Rust tests and installer** on Windows. It builds the installer and uploads it as an artifact (kept 14 days) so you can try a pull request.

Releases are covered in [releasing.md](releasing.md).
