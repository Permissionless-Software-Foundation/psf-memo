# fix-aps-worktree-path — Architect Review

Task: `fix-aps-worktree-path`
Components: `psf-memo-client`, `psf-memo-db`, `psf-memo-indexer` (all three acceptance runners)
Base: `9571133` (architect process notes); inbound refactorer commit `16462e93c6`

## What was reviewed

Inbound refactorer batch (priority 50, one item), merged onto
`swarmforge-architect` as `8b546be` (clean ort merge; the only architect-side
change since the common ancestor was `docs/architect-process-notes.md`). The
linear chain reviewed:

- **`d227f01`** — coder: *Fix acceptance runner APS checkout path in worktrees*.
  Adds `swarmforge/scripts/lib/aps-dir.cjs` and makes the client, db, and
  indexer acceptance runners resolve the canonical APS checkout from the path
  `ensure-aps.sh` prints, instead of a worktree-local `<worktree>/tmp/aps`.
  Adds `psf-memo-client/test/unit/aps-dir.test.js`.
- **`16462e9`** — refactorer: *Refactor APS worktree fix: share acceptance runner
  pipeline*. Extracts the duplicated generation/run pipeline from the three
  runners into `swarmforge/scripts/lib/acceptance-runner.cjs`; the client and
  indexer runners become thin adapters, the db runner keeps its pooled
  concurrency and LevelDB cleanup. Adds unit and property tests for the shared
  helpers.

**Architect review commit: `03e98a84b9`** — the `mutate4javascript` footer
manifests on the two shared modules, the hardening tests, and the extracted
shared test helper. The verification records and this summary are committed on
top, so `git diff 03e98a84b9 HEAD` touches only `docs/`. The records' `git_sha`
is `03e98a84b9`, the commit that contains the verified source state.

## Architectural findings and fixes applied

The refactorer's structure is sound and required no further boundary change.
The shared generation pipeline has one home, the component runners are thin
adapters that differ only in how they run the generated tests, and the APS
checkout decision is a single pure function. The hardening work was
mutation- and duplication-driven.

1. **UI/Core separation.** Not applicable to product UI, but the relevant
   boundary holds: the shared module is pure orchestration plus two injectable
   effectful helpers (`ensureAps`, `apsCommit`, `generateTests` all accept a
   `run` seam), so core generation decisions are testable without shelling out.
2. **Dependency rule.** The three component acceptance adapters depend inward
   on the shared tooling library; the library depends only on Node built-ins.
   No component reaches into another component (the db runner supplies its own
   paths and concurrency, the client/indexer use the shared wrapper).
3. **Information hiding.** APS checkout resolution is now owned by
   `aps-dir.cjs`; the generation/report contract by `acceptance-runner.cjs`.
4. **Testable boundary and mutation coverage.** The shared modules started with
   no mutation manifest and no coverage of their effectful branches. Ten
   effectful unit tests were added in
   `psf-memo-client/test/unit/acceptance-runner-effects.test.js` covering the
   shared-script APS path, the recursive fallback clone, the corrupt-metadata
   error path, the report/exit codes, the sequential test loop (pass, stdout,
   stderr), and the full sequential flow. After hardening: **16 covered, 15
   killed, 1 survivor** for `acceptance-runner.cjs`, and **1 covered, 1 killed**
   for `aps-dir.cjs` (see below for the survivor).

### Documented equivalent survivor

- `acceptance-runner.cjs:81`, `removeStaleGeneratedTests`, `{ force: true } ->
  { force: false }`. `force` only suppresses `ENOENT`, and the path comes
  straight from `readdirSync`, so the file exists at removal time; the
  surrounding `try/catch` swallows the only other difference. Behaviorally
  equivalent, not an implementation gap.

### Out-of-scope latent issue (not introduced here)

`isUpToDate` looks for `metadata/<base>.json` using the raw feature base, while
the three `acceptance/lib/generate.js` files write metadata under the slugified
`metadataName(base)` (lowercase, non-alphanumerics collapsed to `-`). Every
current feature file is already lowercase-hyphen, so the cache check works; a
future feature named with uppercase letters or underscores would silently
disable the incremental generation cache (performance only, no correctness
impact for users). This predates the refactor and is unrelated to the APS path
fix, so it was left as-is; a small follow-up should share the metadata-name rule
between the generators and the cache check.

### DB acceptance adapter shell

`psf-memo-db/acceptance/acceptance.js` carries 19 mutation sites (concurrency
and LevelDB cleanup) but is the DB acceptance test driver, not a unit-testable
module; no db/indexer unit test imports it. Like the `memo-db.js` client HTTP
adapter and the DB CLI repair wrapper, it is exercised end-to-end by the
acceptance suite and is not language-mutation-tested. The client and indexer
adapters report 0 mutation sites.

## Verification results

### Language mutation (`mutate4javascript`)

The shared modules live outside every component cwd, so a normal component run
cannot cover them (`--allow-external` is off in the tool's `npx c8` wrapper) and
the parallel worker rejects an out-of-cwd source. Coverage was generated once
from the repo root (`npx c8 ... npm --prefix psf-memo-client test`, whose lcov
includes both shared modules) and the runs used `--reuse-coverage --mutate-all`
from the client cwd (serial, because `--max-workers` rejects out-of-cwd
sources). This is a tooling-scope limitation, not a mutation result.

- `swarmforge/scripts/lib/acceptance-runner.cjs`: **16 covered, 15 killed,
  1 survived, 0 uncovered**.
- `swarmforge/scripts/lib/aps-dir.cjs`: **1 covered, 1 killed, 0 survived**.

### DRY (`dry4javascript`, scoped to the changed production files and tests)

First scoped run reported 3 duplicate blocks, all task-local: the duplicated
`tmpDir` helper, the symmetric stdout/stderr hardening tests, and a
structurally similar pair of pre-existing helper tests. The scratch-dir helper
was extracted to `psf-memo-client/test/support/tmp-dir.js`, the two symmetric
tests were collapsed into a table-driven loop, and the two helper tests now
share a `writeFiles` fixture. Final scoped run: **No duplicate candidates
found.**

### Cyclomatic complexity (`crap4javascript`)

Every function in the shared modules is CC <= 6: `removeStaleGeneratedTests`
CC 6, `ensureAps`/`isUpToDate`/`runTestsSequentially` CC 5, `resolveApsDir`
CC 4, `generateTests` CC 3, the rest CC 1–2. All well under the 8.0 threshold.
(Coverage shows `N/A` because the tool's c8 wrapper excludes files outside the
component cwd — the same scoping note as above; the mutation run proves the
lines are covered.)

### Soft Gherkin acceptance mutation

**Not applicable.** No Gherkin feature file changed and no acceptance behavior
changed; this task is acceptance-runner tooling only. The refactored runners are
exercised end-to-end by the acceptance phase of every component's canonical
verification below.

### Suite status

All records carry the review `git_sha` `03e98a84b9`. This is a three-component
task, so the client uses the canonical record name and the other components use
suffixed names:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/fix-aps-worktree-path-verification.json --task fix-aps-worktree-path`
  -> **pass (5/5)**: unit **655 pass / 0 fail**, property **183 pass / 0 fail**,
  acceptance **all 42 suites passed**, lint **ok**, build **ok**.
- `swarmforge/scripts/verify.sh db --record
  docs/reviews/fix-aps-worktree-path-db-verification.json --task fix-aps-worktree-path`
  -> **pass (4/4)**: unit **458 passing**, property **71 pass / 0 fail**,
  acceptance **all 24 suites passed**, lint **ok**.
- `swarmforge/scripts/verify.sh indexer --record
  docs/reviews/fix-aps-worktree-path-indexer-verification.json --task fix-aps-worktree-path`
  -> **pass (4/4)**: unit **168 passing**, property **19 pass / 0 fail**,
  acceptance **all 10 suites passed**, lint **ok**.

Property tests were run as their own explicit command by `verify.mjs`, separate
from unit coverage, language mutation, and Gherkin mutation.

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `fix-aps-worktree-path`) with
  the review commit `03e98a84b9` so it can merge `swarmforge-architect` into
  `master`.
- No coder/refactorer handoff: this review is mutation hardening plus local
  test-helper extraction with no follow-up work for those roles.

By architect.
