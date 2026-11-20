## What does this change?

<!-- A sentence or two. Link the issue it closes, e.g. "Closes #123". For anything sizeable, please open an issue first. -->

## Why?

<!-- The problem it solves, or the behaviour you wanted. -->

## How was it tested?

<!-- What you ran or tried. Screenshots or a short recording help for anything visual. -->

## Checklist

- [ ] `npm run typecheck` and `npm test` pass
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes (if Rust changed)
- [ ] I added or updated tests for logic changes
- [ ] I added a line to `CHANGELOG.md` under **Unreleased** (for user-visible changes)
- [ ] I updated the docs / README if behaviour changed
- [ ] No new network calls, telemetry or data collection (Wheelie is local-only)
