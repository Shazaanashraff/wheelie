# Architecture

Wheelie is a [Tauri 2](https://tauri.app) app: a small Rust core hosting a web UI in WebView2. The UI is plain TypeScript with no framework.

## Two windows

| Window | Entry | Purpose |
| --- | --- | --- |
| **Overlay** (`main`) | `index.html`, `src/overlay/main.ts` | The wheel and tool panels. Transparent, always on top, no taskbar entry, shown only while in use. Starts instantly and stays out of the way. |
| **App** (`studio`) | `studio.html`, `src/studio/main.ts` | A normal window for everything that is customised: themes, ring slots, tool library, voice, startup. Closing it hides it; Quit is in the tray. |

Both load the same styles and share one settings store. The app writes settings to `localStorage`; the overlay listens for the `storage` event and re-applies them, so changes show up on the wheel immediately and without any message passing through Rust.

## How the wheel opens

```
Windows ─► low-level keyboard/mouse hook (hook_win.rs)
              └► trigger.rs   pure state machine: hold, release, tap, cancel
                    └► main.rs  moves the overlay under the cursor, shows it, and
                                streams pointer positions as events
                          └► overlay UI (ring.ts)  draws the ring, tracks the hovered slice
```

- **`trigger.rs`** decides *what the input means* (a hold, a tap, a release) and contains no OS calls, so it is unit tested.
- **`hook_win.rs`** is the thin Windows layer that feeds it. It only looks at Space, Alt and the chosen mouse button.
- The overlay is not focused when the ring opens, so the UI cannot read the mouse itself. Rust streams pointer positions to it as `ring:move` events instead.
- Near a screen edge, the ring is moved fully on-screen and the cursor is moved to its centre.
- On release, the slice under the pointer is chosen: a **tool** opens its panel; a **launcher** opens its app, folder or link straight away.

## Source layout

```
src-tauri/src/
  trigger.rs     Hold/release logic as a pure state machine (tested, no OS calls)
  hook_win.rs    Windows low-level keyboard and mouse hooks feeding trigger.rs
  winutil.rs     Focus handling, paste (Ctrl+V injection), clipboard format checks
  clip.rs        Clipboard history thread (memory only)
  notes_core.rs  Notes as .txt files: list/read/write/delete (tested, path-traversal safe)
  notes.rs       Tauri commands wrapping notes_core
  main.rs        Overlay placement, app window, tray, launch at login, commands

src/
  core/          Shared by every window
    model.ts       Settings and the slot model, with migration from older settings
    themes.ts      Theme palettes, accent and contrast logic, applying appearance
    motion.ts      Spring physics: live springs, and springs baked into CSS easings
    icons.ts       The animated icon set (tools, launchers, UI glyphs)
    bridge.ts      The only seam to Rust; simulated in a plain browser
    store.ts, settingsStore.ts   Persistence
    dom.ts, ui.ts  Tiny DOM builder; segmented control, switch, list rows
  overlay/       The wheel
    main.ts        Ring/panel state machine, slot activation
    ring.ts        Ring engine: springs, hover lean, Dock-style pull, tilt, launch/choose
    ringmath.ts    Geometry: hit-testing, pointer influence (tested)
    layout.ts      Placing a panel on screen (tested)
    panelmotion.ts Panel open/close motion, shared with the gallery
  studio/        The app window: shell, live ring preview, one file per page
  tools/         One file per tool; registry.ts is the library
  voice/         Recorder, Whisper worker, dictation controller
  styles/        base.css, icons.css
```

## Theming

A theme is a `Palette` in `core/themes.ts`: background and text colours, how slices are filled, and the theme's **own accent**. `applyAppearance()` turns the palette and the user's settings into CSS custom properties on the root element, and the stylesheets only ever use those:

| Variable | Meaning |
| --- | --- |
| `--bg`, `--bg2`, `--bg3`, `--line` | Surfaces and borders, from the lightest to the most raised |
| `--fg`, `--muted` | Text |
| `--accent` | The user's chosen accent, or else the theme's own |
| `--on-accent` | White or near-black, whichever reads better on `--accent` (3:1 contrast) |
| `--seg`, `--seg-line` | Wheel slice fill and edge |

The accent setting is an empty string by default, meaning *follow the theme*. Picking a colour overrides it; the **theme default** swatch clears it again.

## Icons

Icons are 24x24 SVG strings in `core/icons.ts`, built with `ic(id, size)`. Colour, weight and the duotone fill come from CSS variables. **All tool and launcher icons share one colour**: they carry the `ic-tool` class, and `styles/icons.css` sets it (theme text colour by default; accent or per-tool colours if the user chooses). Components must not recolour icons themselves. Parts that animate carry a class (`.k`, `.hand`, `.shackle`) and the motion lives in `icons.css`.

## Motion

Motion is built on spring physics rather than fixed curves, so it carries momentum and can be redirected mid-flight.

- **Live springs** (`Spring`, stepped by one shared animation loop) drive the wheel: hover lean, the Dock-style pull on neighbouring slices, ring tilt and the choose/dissolve.
- **Baked springs** turn a spring into a CSS `linear()` easing plus its settle time, exposed as `--spring`, `--spring-snappy` and `--spring-bouncy`, so ordinary CSS transitions get the same feel.
- A global level (**Full**, **Subtle**, **Off**) and the Windows reduced-motion setting scale all of it down.

## Where data lives

See [installation.md](installation.md#where-your-data-lives) for locations and [SECURITY.md](../SECURITY.md) for what is and is not collected (nothing is).
