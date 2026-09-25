# TX Indexer Handoff Retry — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `tx-handoff-retry` (refactorer handoff
  `merge_and_process refactorer d543f97994`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `81beada9dd`). Commits:
  - `a7c1028` Record profile-recency-db-read completion in backlog and
    briefing (specifier/master)
  - `b778509` Specify TX indexer handoff retry (specifier/master)
  - `e911099` Retry TX indexer handoff in the background (coder)
  - `d543f97` Extend TX indexer handoff retry test coverage (refactorer)
- Architect review commit: `0acf7a9353` — hardening tests plus the tool-written
  `mutate4javascript` / gherkin mutation manifests. No production behavior
  changed.
- Records/summary commit: this commit.

After initial block download the block indexer used to `await` a single HTTP
call to the TX indexer control endpoint (`GET /tx-start`). A failed or
unreachable endpoint aborted `start()` and stopped block indexing. The handoff
now runs through `TxIndexerHandoff` in the background: it retries the request
every `TX_INDEXER_HANDOFF_RETRY_MS` (default 10s) until it succeeds, and never
rejects into the block-indexing loop. The HTTP request itself is bounded by
`TX_INDEXER_HANDOFF_TIMEOUT_MS` (default 10s) so a hung connection cannot stall
a retry.

## Architectural review

- **UI/Core separation (good, no UI).** The retry policy lives in a pure use
  case (`src/use-cases/tx-indexer-handoff.js`) with injected `startTxIndexer`
  and `sleep`, so it is unit-testable without network or timers. The axios/URL
  concern is isolated in `src/adapters/tx-indexer.js`; the composition root
  (`use-cases-index.js`) wires the two together. `psf-memo-block-indexer.js`
  only calls `startInBackground()`.
- **Dependency rule (good).** The high-level retry loop depends on an injected
  start function (a stable abstraction), not on axios. The adapter gained
  optional `axios`/`config` injection, which is what lets the adapter be unit
  tested with a stub instead of the real network. The entry point depends
  inward on adapters/use-cases; nothing near IO depends on the entry point.
- **Information hiding and encapsulation (good).** The adapter constructs the
  control URL and returns a plain boolean; the use case returns a small result
  DTO (`started`, `attempts`, `retries`, `waits`) and hides the loop. The
  per-run interval override exists so acceptance/unit tests can drive timing
  without touching process env.
- **Local code quality (good).** `TxIndexerHandoff.run` max CC 6 / CRAP 6.0;
  `startInBackground`, `startTxIndexer`, and `defaultSleep` are CC 1. DRY found
  no duplicate candidates in the changed production files. The retry loop has a
  single exit-success path and one bounded-failure path.
- **Accepted observation — `startInBackground` fallback under-reports attempts
  (documented, not changed).** `run()` only rejects if the injected `sleep`
  rejects; the catch fabricates `{ started: false, attempts: 0, retries: 0,
  waits: [] }`. Production uses the real `setTimeout` sleep (never rejects), so
  this is a defensive dead path. It is now pinned by a unit test rather than
  left as an untested literal.
- **Boundary, not chased — entry point and DI booleans.** `psf-memo-block-indexer.js`
  (15 uncovered sites) and the adapter-wiring boolean in `use-cases-index.js`
  (1 uncovered site) are process-start / constructor wiring that cannot run
  under mocha; consistent with the prior reviews' unsuitable-boundary policy.

## Fixes applied

No production behavior changed; the review hardened mutation coverage.

- **`TxIndexerHandoff.startInBackground` (2 survivors, lines 64–65).** The
  existing background test only asserted `started === false`, so the
  `attempts: 0 -> 1` and `retries: 0 -> 1` fallback literals survived. The test
  now asserts the full fallback result shape.
- **`config/index.js` (8 survivors, lines 4, 6–10, 13, 44).** The module was
  never mutated before and its env fallbacks (`|| -> &&`, `0 -> 1`) all
  survived. Added `test/unit/config/config.unit.js`, which clears the relevant
  env vars, re-imports config with a cache-busting query, and pins the
  documented connection defaults, the two new handoff defaults (10s retry /
  10s timeout), and `debugLevel` 0. The restore hook keeps the test independent
  of the ambient environment.

Re-run results:
- `src/use-cases/tx-indexer-handoff.js`: **12 killed / 0 survived / 0 uncovered**
  (was 10 killed / 2 survived).
- `config/index.js`: **8 killed / 0 survived / 0 uncovered** (was 0 killed / 8
  survived).

## Verification results

Record (pinned to the review commit `0acf7a9353`):
`docs/reviews/tx-handoff-retry-verification.json` — component psf-memo-indexer.

- **Language mutation** (`swarmforge/scripts/mutate-file.sh <file>
  --max-workers 8`, one file at a time; `--mutate-all` for `config/index.js`
  whose manifest records module-level sites):
  - `src/use-cases/tx-indexer-handoff.js`: **12 killed, 0 survived, 0
    uncovered**.
  - `src/adapters/tx-indexer.js`: **3 killed, 0 survived, 0 uncovered**.
  - `config/index.js`: **8 killed, 0 survived, 0 uncovered**.
  - `src/use-cases/use-cases-index.js`: 0 killed, 0 survived, **1 uncovered**
    (adapter-wiring boolean — unsuitable boundary).
  - `psf-memo-block-indexer.js`: 0 killed, 0 survived, **15 uncovered**
    (process entry point, not loadable under mocha).
  - No survivors remain.
- **DRY** (`dry4javascript`, scoped to the five changed production files):
  **"No duplicate candidates found."**
- **Cyclomatic complexity / CRAP** (`crap4javascript`, threshold 8.0) on the
  changed production files: max **CC 6 / CRAP 6.0** (`TxIndexerHandoff.run`);
  `TxIndexerAdapter.startTxIndexer`, `TxIndexerHandoff.startInBackground`, and
  `defaultSleep` are CC 1. The entry-point `start` reports CC 9 with coverage
  N/A (env boundary). Exit 0.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, from `tmp/aps` with the indexer runner worker, `--json`):
  `psf-memo-indexer/specs/tx-indexer-handoff-retry.feature`: **32 total, 23
  killed, 9 survived, 0 errors.** The tool wrote a manifest recording the two
  fully-killed scenarios (2 and 3); scenarios 1 and 4 keep intrinsic survivors
  and are re-mutated next run. Survivors, all intrinsic equivalents:
  - `failures: 0 -> -9` (scenario 1, example 1): the fake endpoint only treats
    `remainingFailures > 0` as a failure, so a negative count behaves exactly
    like zero.
  - Scenario 4 example values (`addr`, `height`, `text`, `txid`, both rows):
    each value is resolved consistently on the setup (`processes a Memo post`)
    and assertion (`posts store contains ... for <txid>`) sides, so a
    case/value change still passes. This matches the prior reviews' documented
    read-only-feature equivalence class.
- **Suite status** (`swarmforge/scripts/verify.sh indexer` after the review
  commit): **pass (4/4)** at `git_sha 0acf7a9353` — unit **164 passing**,
  property **18 pass / 0 fail**, acceptance **all 10 generated suites passed**,
  lint ok.

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only hardening tests and tool-written mutation/acceptance
  metadata.
