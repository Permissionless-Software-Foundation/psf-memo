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

## Refactorer forwards your own review commit back
After you send a `priority: 00` review commit to coder+refactorer, the refactorer
merges and forwards that SAME commit back to you. It is a no-op ("Already up to
date"). Recognize it immediately and just run `done_with_current.sh` — do not
re-process or re-verify.

## Startup smoke test (fast, ~seconds)
```bash
psf-memo-client/node_modules/.bin/mutate4javascript 2>&1 | head -1   # usage
psf-memo-client/node_modules/.bin/dry4javascript 2>&1 | head -1      # runs
cd tmp/aps-spec && bb gherkin-parser --help                          # usage
```
