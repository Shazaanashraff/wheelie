import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionOf, stampChangelog } from "./version.mjs";

const REPO = "https://github.com/o/r";
const LOG = `# Changelog

## [Unreleased]

### Added

- New thing.

## [0.1.0] - 2026-01-01

### Added

- First.

[Unreleased]: ${REPO}/compare/v0.1.0...HEAD
[0.1.0]: ${REPO}/releases/tag/v0.1.0
`;

test("stamping turns Unreleased into a dated release and opens a fresh Unreleased", () => {
  const out = stampChangelog(LOG, "0.2.0", "2026-02-02", REPO);
  assert.match(out, /## \[Unreleased\]\n\n## \[0\.2\.0\] - 2026-02-02\n\n### Added\n\n- New thing\./);
  assert.match(out, new RegExp(`\\[Unreleased\\]: ${REPO}/compare/v0\\.2\\.0\\.\\.\\.HEAD`));
  assert.match(out, new RegExp(`\\[0\\.2\\.0\\]: ${REPO}/compare/v0\\.1\\.0\\.\\.\\.v0\\.2\\.0`));
});

test("the first release links to its tag", () => {
  const first = LOG.replace(/## \[0\.1\.0\][\s\S]*?\n\n(?=\[Unreleased\])/, "").replace(/^\[0\.1\.0\]: .*\n/m, "");
  const out = stampChangelog(first, "0.1.0", "2026-01-01", REPO);
  assert.match(out, new RegExp(`\\[0\\.1\\.0\\]: ${REPO}/releases/tag/v0\\.1\\.0`));
});

test("stamping refuses a version that is already there, or a missing Unreleased heading", () => {
  assert.throws(() => stampChangelog(LOG, "0.1.0", "2026-02-02", REPO), /already has 0\.1\.0/);
  assert.throws(() => stampChangelog("# Changelog\n", "0.2.0", "2026-02-02", REPO), /Unreleased/);
});

test("a version's notes stop at the next heading or the link list", () => {
  assert.equal(sectionOf(LOG, "0.1.0"), "### Added\n\n- First.");
  assert.equal(sectionOf(LOG, "Unreleased"), "### Added\n\n- New thing.");
  assert.throws(() => sectionOf(LOG, "9.9.9"), /no section for 9\.9\.9/);
});
