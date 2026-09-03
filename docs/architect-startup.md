# Architect Startup Cheat-Sheet

Fast-start notes for the architect role in this monorepo. Captured from the
`topic-feed` session (2026-08-28) to make the next session's startup faster.

## Tool locations (already installed — do not reinstall or re-verify)
- Language mutation/CRAP/DRY (JavaScript): `psf-memo-client/node_modules/.bin/`
  - `mutate4javascript`, `crap4javascript`, `dry4javascript`
- APS Babashka tools: `tmp/aps-spec/` (run via `bb <task>` from that dir)
  - `gherkin-parser`, `gherkin-mutator`, `gherkin-ir-dry-checker`
- Runner adapters (for `gherkin-mutator`):
  - DB: `psf-memo-db/acceptance/lib/runner-worker.js`
  - Client: `psf-memo-client/acceptance/lib/runner-worker.js`

## Language mutation — the `--mutate-all` gotcha (IMPORTANT)
`mutate4javascript` runs in **differential mode** when a manifest is embedded in
the source file: it only re-runs mutations in functions whose hash changed since
the last run. If you add tests to kill survivors but the SOURCE is unchanged, a
plain re-run reports `Killed: 0, Survived: 0, Uncovered: 0` and silently skips
the survivors.

**Always pass `--mutate-all` when re-running mutation on a file that already has
a manifest** (especially right after adding hardening tests). New files (no
manifest) run fully on the first pass.

Canonical invocation (run from the component dir so `npm test` works):
```bash
node ../psf-memo-client/node_modules/mutate4javascript/bin/mutate4javascript.js \
  src/<file>.js --max-workers 8 --mutate-all
```

## Gherkin soft mutation — canonical invocation
Run from `tmp/aps-spec/`. Use `--json` and redirect stderr to `/dev/null` for a
clean parseable report (worker logs go to stderr; the report goes to stdout).
```bash
bb gherkin-mutator \
  --runner-worker "node <component>/acceptance/lib/runner-worker.js" \
  --feature <component>/specs/<feature>.feature \
  --work-dir <component>/tmp/acc-mut-<name> \
  --level soft --workers 8 --status-interval 30s --json \
  2>/dev/null > /tmp/report.json
```
Parse survivors with a small python one-liner over `d['results']` (filter
`Status == 'survived'`).

## Long runs
- Mutation and gherkin-mutator runs take 60-180s each. Use `--max-workers 8` /
  `--workers 8` and `--status-interval` so progress is visible.
- Run verification sequentially (never concurrent with acceptance generation).

## Keep build dirs clean (mutation speed)
`mutate4javascript` copies the whole project (including `tmp/`) into each worker.
Stale `tmp/acceptance` (LevelDB dirs) and `target/mutation-workers` can bloat to
~1.5G and ~14G, making the worker copy alone many GB and mutation runs appear to
hang. `architect-startup.sh` now flags any of these over 100MB as `[FAIL]`.
Clean them before any mutation run:
```bash
rm -rf psf-memo-db/tmp/acceptance psf-memo-db/target/mutation-workers \
       psf-memo-client/tmp/acceptance psf-memo-client/target/mutation-workers
```
This cut a notifications-query mutation run from 20+ minutes to ~2 minutes.

## Refactorer forwards your own review commit back
After you send a `priority: 00` review commit to coder+refactorer, the refactorer
merges and forwards that SAME commit back to you. It is a no-op ("Already up to
date"). Recognize it immediately and just run `done_with_current.sh` — do not
re-process or re-verify.

## Startup smoke test (fast, ~seconds)
```bash
psf-memo-client/node_modules/.bin/mutate4javascript 2>&1 | head -1   # usage
psf-memo-client/node_modules/.bin/dry4javascript --help 2>&1 | head -1  # usage (NOT bare)
cd tmp/aps-spec && bb gherkin-parser --help                          # usage
```

**IMPORTANT — never run bare `dry4javascript` as a smoke check.** With no
arguments it runs the **full test suite** (~1m50s) before reporting, so it is
not a fast readiness probe. Use `dry4javascript --help` (fast, ~0.6s) to
confirm the binary is present and runnable. The same applies to
`architect-startup.sh`, which must check `dry4javascript --help` rather than
bare `dry4javascript`.
