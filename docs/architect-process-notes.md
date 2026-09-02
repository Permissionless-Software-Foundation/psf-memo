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

- **Mutation runs dominate wall-clock time.** Each `mutate4javascript <file>`
  invocation runs the **full test suite as a baseline** (coverage refresh) before
  running mutations, then runs mutations in parallel with `--max-workers 8`.
  Because the baseline re-runs the whole suite, mutating N files costs roughly
  N full-suite runs. Plan for this: batch the affected files, run them
  sequentially, and use `--max-workers 8` to keep the mutation phase fast.
  The DRY and soft-Gherkin-mutation steps are comparatively quick.

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

## Workflow observations

- **Review summaries must be force-added.** `docs/` is in the root `.gitignore`,
  so `git add -A` silently skips `docs/reviews/<task>-summary.md`. The role
  requires the summary to be committed with the byline in the same commit as the
  review changes, so use `git add -f docs/reviews/<task>-summary.md` (or
  `git add -f docs/process-notes.md`) before committing. This has silently
  dropped 8 of 13 summaries in the past; verify with `git ls-files docs/reviews/`
  after committing.

- **`ready_for_next.sh` / `done_with_current.sh`** are the source of truth for
  queued work. `done_with_current.sh` prints `NO_TASK` when the queue is empty;
  stop waiting for work in that case.

- **Handoff `commit` field must be exactly 10 hex chars.** `swarm_handoff.sh`
  rejects shorter abbreviations; use `git rev-parse --short=10 HEAD`.

- **Run per-component verification for every component a task touches** before
  handing off (client, db, indexer), per the monorepo rules.
