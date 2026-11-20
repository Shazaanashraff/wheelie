# Contributing to Wheelie

Thanks for wanting to help. Wheelie is a small, focused app, and contributions of every size are welcome: bug reports, ideas, docs, new tools, polish.

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

| I want to... | Do this |
| --- | --- |
| **Report a bug** | [Open a bug report](https://github.com/Shazaanashraff/wheelie/issues/new?template=bug_report.yml). Include your Wheelie and Windows versions and the steps to reproduce. |
| **Request a feature** | [Open a feature request](https://github.com/Shazaanashraff/wheelie/issues/new?template=feature_request.yml). Describe the problem first, then the change you would like. |
| **Report a security issue** | Do not use a public issue. Follow [SECURITY.md](SECURITY.md). |
| **Fix something or add a feature** | Read on. For anything bigger than a small fix, please open an issue first so we can agree on the approach before you spend time on it. |
| **Improve the docs** | Edit the Markdown and open a pull request. Typos and clarifications are always welcome. |

Good first issues are labelled [`good first issue`](https://github.com/Shazaanashraff/wheelie/labels/good%20first%20issue).

## Design principles

Changes are judged against these, so they are worth knowing:

1. **Fast and light.** The wheel must open instantly. No heavy dependencies, nothing that slows startup.
2. **Private.** Everything stays on the machine: no accounts, no telemetry, no network calls beyond the voice-model download. A change that adds network access needs a very good reason.
3. **Calm.** Motion should feel natural, not busy. It must respect the Full / Subtle / Off setting and the Windows reduced-motion preference.
4. **Consistent.** One icon colour, themes that each look deliberate, readable text on every accent. Use the CSS variables, not hard-coded colours.

## Setting up

You need [Node 22+](https://nodejs.org). To run the real app you also need [Rust](https://rustup.rs) and the Visual Studio C++ build tools on Windows.

```sh
git clone https://github.com/Shazaanashraff/wheelie.git
cd wheelie
npm install
npm run dev          # the UI in a browser: works on any OS, no Rust needed
```

The [development guide](docs/development.md) covers running the full Tauri app, the project layout and testing.

## Making a change

1. **Fork** the repository and create a branch from `main`:
   `git switch -c fix/calculator-backspace`
2. **Make your change.** Keep it focused: one logical change per pull request.
3. **Test it.** Run these before pushing; CI runs the same checks:
   ```sh
   npm run typecheck
   npm test
   npm run build
   cargo test --manifest-path src-tauri/Cargo.toml   # if you touched Rust (Windows)
   ```
4. **Update the changelog.** Add a line under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
5. **Open a pull request** against `main` and fill in the template. Screenshots or a short recording are very helpful for visual changes.

A maintainer will review it. Expect some back and forth; it is about making the change as good as it can be, not about you.

### Commit messages

Short, in the imperative, saying what changed and why:

```
Make calculator keys respond on press

Keys fired on `click`, which only happens after release. Using
`pointerdown` makes them feel immediate.
```

Optional prefixes such as `fix:`, `feat:` and `docs:` are fine but not required.

### Code style

- **TypeScript**, strict mode. The code is plain DOM (no framework); build elements with the `h()` helper in `src/core/dom.ts`, which never parses user text as HTML.
- Keep logic that can be tested **separate from the DOM** (see `calcparse.ts` and `calcstate.ts`) and add tests next to it as `*.test.ts`.
- Colours, spacing and motion come from CSS variables (`--accent`, `--fg`, `--spring`, ...). Do not hard-code them. Text on the accent colour uses `--on-accent`.
- Do not set an icon's colour on its container. Tool and launcher icons share one colour, defined in `src/styles/icons.css`.
- Rust: `cargo fmt`, and keep Windows-only code behind `cfg(windows)`. Pure logic (like `trigger.rs`) should stay free of OS calls so it can be unit tested.
- Match the style of the surrounding code. An `.editorconfig` is provided.

## Adding a tool

Tools are self-contained, so this is the most approachable kind of contribution.

1. **Create `src/tools/yourtool.ts`** exporting a `Tool` (see `src/tools/types.ts`):
   ```ts
   export const yourtool: Tool = {
     id: "yourtool",
     name: "Your tool",
     desc: "One line shown in the library",
     size: [360, 480], // panel size in CSS px
     mount(root, ctx) {
       root.append(h("div", {}, "Hello"));
       return () => { /* optional cleanup */ };
     },
   };
   ```
   Use `store` from `src/core/store.ts` to persist anything, and put pure logic in its own file with tests.
2. **Draw an icon** in `TOOL_ICONS` in `src/core/icons.ts`: a 24x24 line icon using `currentColor`. Mark shapes that should fill in duotone mode with `class="f"`. Add an entry to `TOOL_COLORS` for the optional colourful mode.
3. **Register it** in `src/tools/registry.ts` by importing it and adding it to `LIBRARY`.
4. **Add icon motion** (optional) in `src/styles/icons.css`, in the "when an icon plays" block.
5. **Test it** in the browser with `npm run dev`, in more than one theme, and check it in the [motion gallery](http://localhost:1420/gallery.html).
6. Add it to the tool list in the README and to the changelog.

## Reviewing and releasing

Maintainers: the release process is in [docs/releasing.md](docs/releasing.md).

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
