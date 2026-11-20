#!/usr/bin/env node
// Release helper. The app's version lives in five places; this keeps them in step.
//
//   node scripts/version.mjs check [vX.Y.Z]   fail unless every file agrees (and matches the tag, if given)
//   node scripts/version.mjs bump  X.Y.Z      set the version everywhere and stamp the changelog
//   node scripts/version.mjs notes X.Y.Z [out.md]   print (or write) that version's section of CHANGELOG.md
//
// See docs/releasing.md for the full release process.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = (p) => join(root, p);
const read = (p) => readFileSync(file(p), "utf8");
const write = (p, s) => writeFileSync(file(p), s);

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** Every place the version is written, and how to read or replace it. */
const SOURCES = [
  {
    path: "package.json",
    get: (s) => JSON.parse(s).version,
    set: (s, v) => s.replace(/("version":\s*")[^"]+(")/, `$1${v}$2`),
  },
  {
    path: "package-lock.json",
    get: (s) => JSON.parse(s).packages[""].version,
    // The first two "version" keys belong to the root package (top level, then packages[""]).
    set: (s, v) => {
      let n = 0;
      return s.replace(/("version":\s*")[^"]+(")/g, (m, a, b) => (n++ < 2 ? `${a}${v}${b}` : m));
    },
  },
  {
    path: "src-tauri/Cargo.toml",
    get: (s) => s.match(/^version\s*=\s*"([^"]+)"/m)?.[1],
    set: (s, v) => s.replace(/^(version\s*=\s*")[^"]+(")/m, `$1${v}$2`),
  },
  {
    path: "src-tauri/Cargo.lock",
    get: (s) => s.match(/\[\[package\]\]\nname = "wheelie"\nversion = "([^"]+)"/)?.[1],
    set: (s, v) => s.replace(/(\[\[package\]\]\nname = "wheelie"\nversion = ")[^"]+(")/, `$1${v}$2`),
  },
  {
    path: "src-tauri/tauri.conf.json",
    get: (s) => JSON.parse(s).version,
    set: (s, v) => s.replace(/("version":\s*")[^"]+(")/, `$1${v}$2`),
  },
];

const versions = () => SOURCES.map((x) => ({ path: x.path, version: x.get(read(x.path)) }));

function check(tag) {
  const found = versions();
  const want = tag ? tag.replace(/^v/, "") : found[0].version;
  if (!SEMVER.test(want)) fail(`"${want}" is not a version like 1.2.3`);
  const bad = found.filter((f) => f.version !== want);
  for (const f of found) console.log(`${f.version === want ? "ok " : "BAD"}  ${f.path.padEnd(28)} ${f.version}`);
  if (bad.length) fail(`${bad.map((b) => b.path).join(", ")} ${bad.length === 1 ? "does" : "do"} not match ${want}`);
  console.log(`\nAll versions agree: ${want}`);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Turn the "Unreleased" heading into a dated release and start a fresh Unreleased above it. */
export function stampChangelog(text, version, date, repoUrl) {
  if (!/^## \[Unreleased\]/m.test(text)) throw new Error('CHANGELOG.md has no "## [Unreleased]" section');
  if (new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\]`, "m").test(text)) throw new Error(`CHANGELOG.md already has ${version}`);
  let out = text.replace(/^## \[Unreleased\][^\n]*\n/m, `## [Unreleased]\n\n## [${version}] - ${date}\n`);
  // Reference-style links at the bottom of the file.
  const prev = out.match(/^\[(\d+\.\d+\.\d+[^\]]*)\]: .*$/m)?.[1];
  out = out.replace(/^\[Unreleased\]: .*$/m, `[Unreleased]: ${repoUrl}/compare/v${version}...HEAD`);
  const link = prev ? `[${version}]: ${repoUrl}/compare/v${prev}...v${version}` : `[${version}]: ${repoUrl}/releases/tag/v${version}`;
  out = out.replace(/^(\[Unreleased\]: .*)$/m, `$1\n${link}`);
  return out;
}

/** The body of one version's section, without its heading. */
export function sectionOf(text, version) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start < 0) throw new Error(`CHANGELOG.md has no section for ${version}`);
  let end = lines.findIndex((l, i) => i > start && (l.startsWith("## [") || /^\[[^\]]+\]: /.test(l)));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join("\n").trim();
}

function bump(version) {
  if (!SEMVER.test(version)) fail(`"${version}" is not a version like 1.2.3`);
  const repo = JSON.parse(read("package.json")).repository?.url?.replace(/\.git$/, "").replace(/^git\+/, "");
  if (!repo) fail('package.json needs a "repository.url"');
  const changelog = stampChangelog(read("CHANGELOG.md"), version, today(), repo);
  for (const x of SOURCES) write(x.path, x.set(read(x.path), version));
  write("CHANGELOG.md", changelog);
  check(`v${version}`);
  console.log(`\nNext: review the diff, commit, tag v${version} and push the tag (docs/releasing.md).`);
}

function notes(version, out) {
  const body = sectionOf(read("CHANGELOG.md"), version.replace(/^v/, ""));
  if (!body) fail(`The ${version} section of CHANGELOG.md is empty`);
  if (out) writeFileSync(out, body + "\n");
  else console.log(body);
}

function fail(msg) {
  console.error(`version: ${msg}`);
  process.exit(1);
}

// Only run as a CLI (the pure helpers above are imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, arg, out] = process.argv.slice(2);
  try {
    if (cmd === "check") check(arg);
    else if (cmd === "bump" && arg) bump(arg);
    else if (cmd === "notes" && arg) notes(arg, out);
    else fail("usage: version.mjs check [vX.Y.Z] | bump X.Y.Z | notes X.Y.Z [out.md]");
  } catch (e) {
    fail(e.message);
  }
}
