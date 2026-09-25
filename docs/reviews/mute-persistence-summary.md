# Mute Persistence — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `mute-persistence` (refactorer handoff
  `merge_and_process refactorer 172b35d910`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `43b4f74`). Commits:
  - `9543c09` Specify mute persistence (specifier)
  - `b5991c2` Add mute entity route to persist indexer mute writes (coder)
  - `172b35d` Refactor mute persistence: share acceptance assertions, add
    entity properties (refactorer)
- Architect review commit: `5de0ab1f42` — runner-adapter boundary fix, plus
  tool-written mutation/acceptance manifests and a process-note update. No
  production behavior changed.
- Records/summary commit: this commit.

The indexer persists mutes through `createEntityDb('mute', 'key', 'muteData')`,
which POSTs `{ key, muteData }` to `/level/mute`. `ENTITY_CONFIG` had no `mute`
route, so every such write 404'd and the mutes store stayed empty for the read
API and feed filter. The change registers the `mute` route against `mutesDb`
(keyed `${muterAddr}:${muteeHash160}`), covered by controller unit tests, a
property test for the generic entity CRUD contract, and Gherkin acceptance that
drives the real entity route registry plus the unmute/muted-list steps. The
indexer component was not touched by this task.

## Architectural review

- **UI/Core separation (good).** `crud-handlers.js` is a pure module: a config
  table plus a `makeCrudHandlers` factory that only talks to an injected
  `adapters.level[dbProp]`. The HTTP boundary lives in `level/index.js` (Koa
  router) and `level/controller.js`. The acceptance step builds the controller
  from the same adapters and dispatches through
  `controller.entityHandlers.mute.create(ctx)`, i.e. it exercises the real route
  registry reached through `ENTITY_CONFIG` without an HTTP server, exactly as
  the feature requires.
- **Dependency rule (good).** `crud-handlers.js` has no IO or framework
  imports; the controller and router depend inward on it. Registering `mute` is
  a data-only change to a leaf table, so no new dependency edge was introduced.
- **Information hiding and encapsulation (good).** `makeCrudHandlers` keeps the
  generic `keyParam`/`bodyIdField`/`bodyDataField` contract and hides the
  LevelDB store behind `dbProp`. The write key `${muterAddr}:${muteeHash160}`
  matches the read adapter
  (`src/adapters/mute-query.js`: `${muterAddr}:${hash160(muteeAddr)}`), so the
  entity route and the mute read API share one representation and the
  end-to-end round-trip is real, not simulated.
- **Local code quality (good).** The refactorer extracted
  `parseAddressList`/`assertListContainsExactly`/`assertListExcludes` and reused
  them for the followers, topic-followers, and muted-list assertions, and merged
  the two near-identical mute/unmute step handlers into one
  `stores an? (un)?mute record ...` handler. The added config line is a single
  table entry with no control flow.

## Fixes applied

One structural fix was required; it is in the gherkin-mutation runner adapter,
not in production code.

- **runner-worker stdout protocol corruption (fixed).** The coder's
  `storeMuteViaEntityApi` imports `LevelRESTControllerLib` into
  `acceptance/lib/handlers.js`. That import loads `src/adapters/wlogger.js`,
  whose winston `Console` transport writes through `console._stdout`
  (== `process.stdout`) and emits `info: Wlogger initialized...` at module load.
  The DB `runner-worker.js` redirected only `console.log`, so the mutator's
  first `readLine` read that log line, failed to parse it as JSON, and reported
  all **24** soft mutations as `errors` (and wrote an empty manifest). Fixed by
  capturing the real `process.stdout.write` for the worker's own JSON responses
  and replacing `process.stdout.write` with a stderr redirect, so any
  production/stdout writer is invisible to the protocol while the response
  channel stays intact. Verified directly: `node acceptance/lib/runner-worker.js
  < /dev/null` now leaves stdout empty and sends the winston/config lines to
  stderr. The lesson is recorded in `docs/architect-process-notes.md`.
- No production module-structure change was needed. The entity-route table
  addition, the property test, and the shared acceptance assertions were
  accepted as delivered.

## Verification results

Record (pinned to the review commit `5de0ab1f42`):

| File | Component |
|------|-----------|
| `docs/reviews/mute-persistence-verification.json` | psf-memo-db |

- **Language mutation** (`swarmforge/scripts/mutate-file.sh
  src/controllers/rest-api/level/crud-handlers.js --max-workers 8`): the first
  differential pass selected **0 of 3** covered sites (the new config line
  changes the module hash but not the `makeCrudHandlers` function hash), and
  `mutate-file.sh` automatically reran with `--mutate-all`:
  **3 total / 3 covered / 3 killed / 0 survived / 0 uncovered.** The only
  production file the task changed was `crud-handlers.js`.
- **DRY** (`dry4javascript`, scoped to the changed JS files):
  - `src/controllers/rest-api/level/crud-handlers.js`: **no duplicate
    candidates.**
  - `acceptance/lib/runner-worker.js`: **no duplicate candidates.**
  - `acceptance/lib/handlers.js`: **97** pre-existing score-1.00 boilerplate
    pairs (fixture loaders and the established request-state/report/list handler
    convention, plus the new mute handlers, which follow that same convention).
    **None** of the changed regions participates in a candidate; the new shared
    assertion helpers introduce no duplicate.
  - `test/unit/controllers/level.controller.unit.js`: **1** pre-existing pair
    (the older post/postheight create tests), present before this task.
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the changed production
  file, 100% coverage): `makeCrudHandlers` **CC 1 / CRAP 1.0**. Exit 0
  (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the DB runner worker and `--json`):
  `psf-memo-db/specs/mute-persistence.feature`: **24 total, 8 killed, 16
  survived, 0 errors.** Because every scenario carries intrinsic survivors, the
  tool wrote the expected empty `"scenarios":[]` manifest (no `# mutation-stamp`).
- **Soft mutation survivors — all intrinsic equivalents:**
  - `muter` / `otherMuter` (8 survivors): the muter address is used consistently
    as the read-side list prefix and the write-side store prefix. The read API
    returns cash addresses derived from the mutee hash, not the muter, so no
    independently tied constant can fail; the mutation is a valid round-trip.
  - `muteHeight` / `unmuteHeight` (8 survivors): the heights are written but
    never asserted, and the mute/unmute order is fixed by step order, not by
    height. Height persistence is covered instead by the property test's
    full-record round-trip and the unit test's `put` argument assertion, so the
    acceptance scenario deliberately does not duplicate it.
  - The 8 killed mutations are `mutee`/`otherMutee` case/character changes that
    invalidate the address, so `hash160()` throws and the scenario fails; they
    confirm the step really parses the address rather than passing it through
    opaquely.
- **Suite status**: `verify.sh db` **result: pass (4/4)** at `git_sha
  5de0ab1f42`:
  - unit **458 passing** (454 before; +4 mute entity handler tests)
  - property **71 pass / 0 fail** (67 before; +4 generic entity CRUD properties)
  - acceptance **all 24 generated suites passed** (23 before; the new
    `mute-persistence` suite adds 3 scenarios × 2 examples = 6 example
    executions)
  - lint ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only a gherkin-mutation test-adapter fix and tool-written
  mutation metadata.
