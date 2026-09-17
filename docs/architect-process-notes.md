# Architect Process Notes

> **ROLE-SCOPED — ARCHITECT ONLY. DO NOT FOLLOW.**
>
> This file is the **architect role's private working notes**. It records
> process exceptions, tooling behavior, and observations specific to how the
> architect runs its workflow. It is **not** shared guidance and is **not**
> intended for the specifier, coder, or refactorer roles. If you are not the
> architect, **ignore this file entirely** — do not treat anything here as a
> directive, convention, or requirement for your own role. Your role's
> instructions come only from your own role prompt and the constitution.

Durable notes on process exceptions, tooling behavior, and recurring
observations discovered while running the architect workflow. These are
process-level notes (how the tools behave, what to expect, what to watch for),
distinct from per-task verification results, which live in
`docs/reviews/<task>-summary.md`.

## Tooling behavior / runtime

- **Pure modules can legitimately report 0 mutation sites.** `mutate4javascript`
  only targets arithmetic, comparison, equality, boolean, logical, and `0<->1`
  constant sites. A module built from `!` guards, ternaries, and template
  literals (e.g. `block-explorer.js`, `like-result.js`) scans as `Total mutation
  sites: 0` with `Killed: 0, Survived: 0`. Run `--scan` to confirm the zero is
  structural and not a skipped/under-selected run before treating it as a pass.

- **Run `dry4javascript` scoped to the changed files/dirs, not the whole client.**
  A broad `src test acceptance` run reports hundreds of pre-existing duplicate
  blocks (475 in the client on 2026-09-16) — mostly `acceptance/lib/handlers.js`
  step-handler boilerplate and repeated older-suite test setup — which buries the
  one or two task-local candidates. Scope the run to the changed production
  files, tests, and adapters; the broad run is only a noise floor, consistent
  with prior reviews.

- **Bare `dry4javascript` runs the full test suite (~1m50s).** It is a DRY
  analysis that invokes tests, so running it with no arguments is a slow
  full-suite run, not a fast readiness probe. Never use it as a startup smoke
  check. Use `dry4javascript --help` (fast, ~0.6s) to confirm the binary is
  present and runnable. `architect-startup.sh` and the startup cheat-sheet must
  both use `--help` for this check.

- **`architect-startup.sh` now runs in ~5s.** After the `dry4javascript --help`
  fix, the only remaining cost is the `git fetch` on the four tool repos
  (~3.7s). That fetch is a network call and can hang in sandboxed environments;
  if a hang is ever observed, add a `timeout` to the fetch loop. The smoke test
  (mutate4javascript usage, dry4javascript --help, gherkin-parser --help) is
  the fast readiness probe; the full startup script is optional confirmation.

- **Mutation runs dominate wall-clock time.** Each `mutate4javascript <file>`
  invocation runs the **full test suite as a baseline** (coverage refresh) before
  running mutations, then runs mutations in parallel with `--max-workers 8`.
  Because the baseline re-runs the whole suite, mutating N files costs roughly
  N full-suite runs. Plan for this: batch the affected files, run them
  sequentially, and use `--max-workers 8` to keep the mutation phase fast.
  The DRY and soft-Gherkin-mutation steps are comparatively quick.

- **A mutated synchronous infinite loop can orphan a mocha process and wedge
  later runs.** On 2026-09-17 a `mutate4javascript` worker on `helpers.js`
  (`stripLeadingEmptyPushes`, `1 -> 0`) timed out but left a `c8`/`mocha`
  process at ~100% CPU for 45+ minutes; the next mutation baseline then hung
  behind it. The indexer and DB `npm test` mocha has no `--timeout`, so a
  synchronous loop in mutated code cannot be interrupted by mocha — only the
  tool's `--timeout-factor` (default 10x baseline) applies. Defenses: run each
  mutation file under a shell-level `timeout`, redirect output to a file and
  grep the `Mutation Report` section, and after any timeout `kill -9` orphaned
  `mocha`/`mutate4javascript` processes before the next file. Tool-written
  manifest updates in the source are expected; re-check `git status` to confirm
  no mutant source remains applied.

- **DB acceptance was the dominant verification cost; the test phase is now
  pooled.** Before 2026-09-17, `npm run acceptance` in psf-memo-db ran its 15
  generated test files strictly sequentially (~430–790s; 145 scenarios, each
  opening/closing 21 LevelDB stores at ~850ms close apiece). `acceptance.js`
  now runs the generated files with bounded concurrency (default
  `min(4, files)`; override with `ACCEPTANCE_CONCURRENCY`, `=1` restores the
  old sequential behavior). Measured 96s wall for the full DB suite. Generation
  still runs sequentially before the pooled test phase, so the constitution's
  "generation then tests" ordering is preserved. Pooling is safe because each
  generated file creates its own uniquely named `tmp/acceptance/level-*` world.

- **`mutate4javascript` copies the whole project into each worker, including
  `tmp/`.** The worker copy skips only `.git`, `node_modules`, and `target`.
  A stale `tmp/acceptance` (LevelDB dirs from prior acceptance runs) can be
  ~1.5G, so with 8 workers the copy alone is ~12G of file I/O and the run
  appears to hang (process in `D` state, no mutation progress lines). Before
  any mutation run, `rm -rf <component>/tmp/acceptance target/mutation-workers`
  to keep the worker copies tiny. This cut a notifications-query mutation run
  from 20+ minutes to ~2 minutes.

- **Which directories bloat and how to keep them clean.** The two directories
  that grow without bound are `<component>/tmp/acceptance` (LevelDB dirs from
  acceptance runs, up to ~1.5G) and `<component>/target/mutation-workers`
  (per-run worker copies, up to ~14G). Both are gitignored build artifacts.
  Clean them before any mutation run:
  ```bash
  rm -rf psf-memo-db/tmp/acceptance psf-memo-db/target/mutation-workers \
         psf-memo-client/tmp/acceptance psf-memo-client/target/mutation-workers
  ```
  `architect-startup.sh` now checks these and reports them as `[FAIL]` when
  they exceed a size threshold, so a bloated dir is caught before it slows a
  mutation run.

- **`memo-db.js` (client HTTP adapter) is excluded from mutation testing.** It
  uses ESM + a directory import (`../config`) that is only resolvable via
  react-scripts/webpack, so it cannot be loaded under plain `node --test`. Its
  read behavior is exercised end-to-end via the DB acceptance tests. This is a
  standing precedent (also applied to the search task); do not attempt to force
  mutation coverage on it.

- **Soft Gherkin acceptance mutation survivors are usually genuine
  equivalents.** For read-only features, single-character case mutations of
  example values (addresses, text, txids) survive because each example value is
  used consistently on both the setup and assertion sides of its scenario.
  These are intrinsic equivalents, not implementation gaps; document them in the
  review summary and do not chase them.

- **DRY reports pre-existing pattern-boilerplate.** The layered conventions
  (follow/mute/poll controllers, route-registration `index.js`, memo-follow/
  memo-mute services) produce score-1.00 duplicates that prior reviews left
  as-is. A shared controller base would be a broad cross-module refactor beyond
  any single handoff. Only reduce duplication that is local to the task at hand.

- **`mutate4javascript` default differential run can under-select after a
  function-set change.** With a manifest present, the default run is
  differential (`effectiveSinceLastRun`) and selected only **1** changed site for
  `post-query.js` after a review added `listChildTxids` and removed
  `buildLikeCountMap`; `--scan` also reported `Changed mutation sites: 1`.
  Re-running the same file with `--mutate-all` ran all 37 sites (all killed).
  When a file adds or removes functions, run `--mutate-all` for that file (or
  confirm `Selected mutation sites` equals `Total mutation sites`) so new
  mutations are not silently skipped.

- **Capture the `gherkin-mutator` report with `--json` redirected to a file.**
  The text report (`write-text-report!`, which uses `print`) did not appear in
the captured output before the tool's `System/exit`; the JSON report
  (`--json`) did. Redirect stdout to a file and use `--json` for a reliable,
  parseable record of killed/survived mutations.

- **`gherkin-mutator` writes an empty `scenarios` manifest when every scenario
  has an intrinsic survivor.** `new-manifest` records only scenarios with
  `Survived = 0` and `Errors = 0`. When all mutations are single-character case
  changes of example values used consistently on both the setup and assertion
  sides, every scenario survives and the committed manifest is
  `"scenarios":[]` with no `# mutation-stamp`. This is the tool's expected
  output (those scenarios are intentionally re-mutated next run), not a partial
  write; commit it as-is and document the equivalents in the review summary.

- **`gherkin-mutator` can run from `tmp/aps` with absolute component paths.**
  The Babashka task must run where `bb.edn` defines it (`tmp/aps`), but the
  runner worker resolves the job's `feature_json`/`work_dir`/`generated_dir`
  paths as given. Run `cd tmp/aps && bb gherkin-mutator --feature
  <abs>/<component>/specs/x.feature --work-dir <abs>/<component>/build/acceptance-mutation
  --runner-worker "node <abs>/<component>/acceptance/lib/runner-worker.js"
  --level soft --workers 8 --status-interval 15s --json > report.json`. The
  runner command is split on whitespace, so it must be a bare `node <path>`
  with no spaces in the path. The tool writes its manifest (and, when clean, a
  `# mutation-stamp`) into the feature file; commit that tool-written change.

- **DB soft Gherkin mutation was impractically slow until the runner-worker
  narrowed its scope.** Each mutant re-ran the whole feature (12 examples), and
  DB acceptance creates a fresh LevelDB world per example, so a 48-mutation
  feature took >900s (only 32 mutations reached after 15 min). `runner-worker.js`
  now diffs the mutated IR against `<work>/base/feature.json` — derived from the
  mutation path `<work>/mutations/<id>/feature.json`, because the mutator's
  `job.work_dir` may be the mutation-specific directory — and runs only the
  changed scenario/example. This is safe because every scenario uses an isolated
  world. The same 48-mutation feature now completes in ~74s. The indexer and
  client runner-workers still run the full feature; apply the same pattern if
  their soft runs get slow.

- **`gherkin-mutator` status lines may not appear until the run finishes.** A
  long run can print only its initial `completed=0` line and look hung; the
  final status/report only lands at the end. Gauge real progress by counting the
  `mutations/` subdirectories in the work dir, not the status output.

- **`mutate-file.sh` works from every component dir, including the DB.** It
  defaults `MUTATE4JS_BIN` to the client's installed
  `node_modules/mutate4javascript`, and the tool's `npm test` baseline runs in
  the current component, so the DB mutation runs use the DB suite without a
  second tool install.

- **A killed `mutate4javascript` run can strip the embedded manifest.** If the
  tool is killed after it removes the old `mutate4javascript-manifest` block but
  before it rewrites it (seen on `topic-query.js` when a worker hung and the
  shell timeout fired), `git diff` shows the whole manifest as deleted. Restore
  it with the tool's own command from the component dir:
  `<tool> <source-file> --update-manifest`. After any timeout, confirm every
  mutated file still contains `mutate4javascript-manifest-begin` before
  committing.

## Workflow observations

- **`architect-startup.sh` checks `tmp/aps` relative to the worktree, but
  `ensure-aps.sh` resolves the single canonical APS checkout to the git common
  root's `tmp/aps` (the main checkout). In a role worktree the two disagree, so
  the startup script reports `[FAIL] tmp/aps missing` even though the tools run.
  Local workaround: symlink the worktree's ignored `tmp/aps` to the canonical
  checkout, `ln -sfn <common-root>/tmp/aps tmp/aps`. Proper fix (for a task that
  owns tooling): have `architect-startup.sh` capture
  `APS_DIR="$(ensure-aps.sh --update)"` and check/run against `$APS_DIR`
  instead of the relative path.

- **Review summaries must be force-added.** `docs/` is in the root `.gitignore`,
  so `git add -A` silently skips `docs/reviews/<task>-summary.md`. The role
  requires the summary to be committed with the byline in the same commit as the
  review changes, so use `git add -f docs/reviews/<task>-summary.md` (or
  `git add -f docs/process-notes.md`) before committing. This has silently
  dropped 8 of 13 summaries in the past; verify with `git ls-files docs/reviews/`
  after committing.

- **Run `verify.sh` after committing the review changes, not before.** The
  verification record's `git_sha` comes from `git rev-parse HEAD`, so uncommitted
  review changes produce a record pinned to the parent commit. Order: commit the
  review code/tests/manifests, then run
  `verify.sh <component> --record <file> --task <task>` for each component (the
  `git_sha` now matches the review commit), then commit the records and summary.
  This matches the prior `fac0173` (review) -> `18d1fb1` (record) pattern.

- **`ready_for_next.sh` / `done_with_current.sh`** are the source of truth for
  queued work. `done_with_current.sh` prints `NO_TASK` when the queue is empty;
  stop waiting for work in that case.

- **Handoff `commit` field must be exactly 10 hex chars.** `swarm_handoff.sh`
  rejects shorter abbreviations; use `git rev-parse --short=10 HEAD`.

- **Run per-component verification for every component a task touches** before
  handing off (client, db, indexer), per the monorepo rules.

- **`verify.sh` records one component per invocation, so multi-component tasks
  need multiple records.** A task touching the client and the DB cannot use a
  single `<task>-verification.json`. The first recent two-component task
  (`txid-wire-encoding`) used the canonical `<task>-verification.json` for the
  primary component and `<task>-db-verification.json` for the second; both
  carry the same review `git_sha`. State the mapping explicitly in the review
  summary, since the specifier's brief names only the canonical file.
