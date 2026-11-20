# Changelog

All notable changes to Wheelie are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The radial wheel: hold **Alt + Space** (or the middle mouse button), point at a slice and release to open a tool.
- Twelve tools: Calculator, Clock (stopwatch, timer, pomodoro), Notes, To-do, Clipboard history, Unit converter, Links, App launcher, Colours, Snippets, Passwords and World clock.
- Launcher slots that open an app, folder or link the moment you release over them.
- The Wheelie app window for themes, the ring layout, the tool library, voice and startup, with a live ring preview.
- Eight themes (Dark, Light, Midnight, Graphite, Sunset, Forest, Rose, Tinted), ten accent colours and a custom picker.
- Wheelie's own icon set, animated on hover, with line or duotone style and three weights.
- Spring-based motion (Full / Subtle / Off), which also follows the Windows reduced-motion setting.
- On-device voice notes using a Whisper model; audio is never saved or uploaded.
- Notes stored as plain `.txt` files in `Documents\Wheelie Notes`.
- An interactive motion gallery (`gallery.html`) for previewing every animation.
- Start with Windows, with the app living quietly in the tray.

- **Wheelie, the character.** A little pixel creature lives in the middle of the ring while nothing is hovered. It builds itself up on launch, looks around, then follows the pointer with its eyes, blinks, taps its feet, hops and smiles, in the theme's accent colour. All its movement is in whole pixels.
- A new app icon, tray icon and sidebar brand: the same character, drawn from one shared sprite. `npm run icons` regenerates the whole icon set.
- **Tool info in the centre.** Hover a slice and the hub shows what that tool is up to (the timer's time left, to-dos remaining, your last result, how many notes or links you have...), with a progress arc for timers, pomodoro and to-dos.

### Changed

- The app's sidebar and brand icons are always monochrome. The Icon colour setting now only affects the wheel and tool panels.
- Themes now carry their own accent colour. Sunset is orange, Forest is green and Rose is pink until you pick an accent yourself; a "theme default" swatch resets it.
- Text on an accent colour now picks white or dark automatically, so light accents (such as Graphite's) stay readable.
- Every tool and launcher icon uses one colour, the theme's foreground, in the wheel, panel headers, the sidebar and cards. *Accent* and *Colourful* are still available in Appearance.
- Calculator keys respond on press instead of on release, and their feedback is faster (instant press, 90 ms release).
- The source tree is organised into `core/`, `overlay/`, `styles/`, `tools/`, `studio/`, `voice/` and `gallery/`.

### Removed

- The glow around the wheel: the soft drop-shadow halo and the pointer-following highlight are gone, leaving crisp slices.

### Fixed

- A light-theme calculator style that never applied, because it targeted an attribute nothing set.
- Appearance rows no longer clip their labels in narrow windows.

[Unreleased]: https://github.com/Shazaanashraff/wheelie/commits/main
