# Releasing

For maintainers. A release is a tag: pushing `vX.Y.Z` builds the Windows installer and publishes a GitHub Release with the installer, a portable `.exe` and `SHA256SUMS.txt`, using the changelog entry as the release notes.

## Versioning

[Semantic Versioning](https://semver.org/). While Wheelie is `0.x`, minor versions (`0.2.0`) may include larger changes and patch versions (`0.1.1`) are fixes. Tags with a hyphen (`v1.0.0-beta.1`) are published as **pre-releases**.

## Before the first release

Releases are unsigned, so SmartScreen will warn users (the notes and installation guide explain this). The README also notes that the app has not yet been through wide testing on real machines, so a first tag such as `v0.1.0` is best published as a pre-release (`v0.1.0-beta.1`) until a few people have run it.

## Cutting a release

1. **Make sure `main` is green** and everything you want is merged.
2. **Write the changelog.** Everything going out should be listed under `## [Unreleased]` in [CHANGELOG.md](../CHANGELOG.md).
3. **Bump the version** everywhere with one command:
   ```sh
   npm run version:bump -- 0.2.0
   ```
   This updates `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and `src-tauri/tauri.conf.json`, turns *Unreleased* into a dated `## [0.2.0]` section, and starts a fresh *Unreleased* above it.
4. **Review and commit:**
   ```sh
   git diff
   git commit -am "Release 0.2.0"
   git push
   ```
5. **Tag and push the tag:**
   ```sh
   git tag v0.2.0
   git push origin v0.2.0
   ```
6. **Watch the run** in the repository's *Actions* tab. When it finishes, the release appears under *Releases*. Open it, read it through, and edit the notes if needed.

## What the workflow checks

`.github/workflows/release.yml` refuses to publish unless:

- every version file matches the tag (`npm run version:check` runs the same check locally),
- `CHANGELOG.md` has a non-empty section for that version,
- the typecheck, frontend tests and Rust tests pass.

## If something goes wrong

- **The workflow failed before publishing:** fix the problem, then move the tag: `git tag -d v0.2.0 && git push origin :refs/tags/v0.2.0`, commit the fix, and tag again.
- **A bad release is already public:** mark it as a pre-release or delete it from the *Releases* page, fix forward, and publish a new patch version. Do not reuse a version number people may already have downloaded.

## One-time repository setup

These are settings on GitHub, not files, so they have to be switched on by hand:

- **Settings, then General:** add a description and topics (for example `windows`, `tauri`, `radial-menu`, `productivity`) and a social preview image.
- **Settings, then Code security:** enable **Private vulnerability reporting** (the security policy and issue links rely on it), and Dependabot alerts.
- **Settings, then Branches:** protect `main`: require a pull request and the *CI* checks to pass.
- **Settings, then General, then Features:** enable **Discussions** if you want a place for questions and ideas separate from issues.
- Create the labels `good first issue` and `help wanted` if they are missing (new repositories include them by default).
