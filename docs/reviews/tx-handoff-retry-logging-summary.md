# TX Indexer Handoff Failure Logging — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `tx-handoff-retry-logging` (refactorer handoff
  `merge_and_process refactorer 9f1418cb2e`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `20ed191c62`). Commits:
  - `5770307` Record tx-handoff-retry completion in backlog and briefing
    (specifier/master)
  - `7ce9597` Specify TX indexer handoff failure logging (specifier)
  - `3131e78` Log failed TX indexer handoff attempts (coder)
  - `9f1418c` Extend TX indexer handoff property tests for failure logging
    (refactorer)
- Architect review commit: `a9b1965013` — tool-written `mutate4javascript` and
  gherkin-mutation manifests only. No production behavior changed.
- Records/summary commit: this commit.

Building on `tx-handoff-retry`, each failed TX indexer handoff attempt now emits
one diagnostic line naming the control endpoint (`TX_REST_API_IP` /
`TX_REST_API_PORT`), the error, and the retry interval, so an unreachable TX
indexer is observable instead of silent.

## Architectural review

- **UI/Core separation (good, no UI).** The adapter owns the endpoint
  description (`endpoint()` returns `{ ip, port }`); the retry use case owns
  when a failure is logged but receives both the endpoint description and the
  `log` sink by injection. The composition root (`use-cases-index.js`) supplies
  `console.error` as the sink. The use case remains testable with a captured
  array and no IO.
- **Dependency rule (good).** The use case depends only on injected functions
  (`startTxIndexer`, `sleep`, `endpoint`, `log`); axios/URL details stay in the
  adapter. Nothing near IO depends inward on the use case.
- **Information hiding and encapsulation (good).** `startTxIndexer` and
  `endpoint` share one source of truth for the configured host/port, so the URL
  and the log target cannot drift. The `logFailure` helper keeps message
  construction in one place.
- **Local code quality (good).** `TxIndexerHandoff.run` max **CC 6 / CRAP 6.0**;
  `logFailure`, `endpoint`, `startTxIndexer`, and `startInBackground` are CC 1.
  DRY reports no duplicate candidates in the changed production files.
- **Accepted observation — the bounded diagnostic mode logs a retry that does
  not happen (documented, not changed).** When `maxRetries` is supplied, the
  terminal failed attempt still logs `Retrying in <interval> milliseconds`
  before the loop returns `{ started: false }`. `maxRetries` is a test/diagnostic
  bound only; production runs unbounded and always retries, so the message is
  accurate there. The spec (`tx-indexer-handoff-retry.feature` scenario 5)
  deliberately requires one log per failed attempt (`log_count = retries + 1`),
  so the message wording was left as specified.
- **Boundary, not chased.** `src/use-cases/use-cases-index.js` keeps 1 uncovered
  site (the adapter-wiring boolean), consistent with the unsuitable-boundary
  policy used in prior indexer reviews.

## Fixes applied

None required. All language-mutation and soft-Gherkin survivors were intrinsic
equivalents (below); no production or test changes were needed, so the review
commit contains only tool-written manifests.

## Verification results

Record (pinned to the review commit `a9b1965013`):
`docs/reviews/tx-handoff-retry-logging-verification.json` — component
psf-memo-indexer.

- **Language mutation** (`swarmforge/scripts/mutate-file.sh <file>
  --max-workers 8`, one file at a time; `--mutate-all` re-run on differential
  under-selection):
  - `src/use-cases/tx-indexer-handoff.js`: **15 killed, 0 survived, 0
    uncovered**.
  - `src/adapters/tx-indexer.js`: **3 killed, 0 survived, 0 uncovered**.
  - `src/use-cases/use-cases-index.js`: 0 killed, 0 survived, **1 uncovered**
    (adapter-wiring boolean — unsuitable boundary).
  - No survivors remain.
- **DRY** (`dry4javascript`, scoped to `src/adapters/tx-indexer.js`,
  `src/use-cases/tx-indexer-handoff.js`, `src/use-cases/use-cases-index.js`):
  **"No duplicate candidates found."**
- **Cyclomatic complexity / CRAP** (`crap4javascript`, threshold 8.0) on the
  same files: max **CC 6 / CRAP 6.0** (`TxIndexerHandoff.run`); all other
  functions CC 1. Exit 0.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, from `tmp/aps` with the indexer runner worker, `--json`):
  `psf-memo-indexer/specs/tx-indexer-handoff-retry.feature`: **33 total, 24
  killed, 9 survived, 0 errors, 2 scenarios skipped** (15 already-killed
  mutations from the prior manifest). The new scenario 5 (failure logging) ran
  **16/16 killed**. The tool updated the feature manifest accordingly.
  Survivors, all intrinsic equivalents carried over from the retry feature:
  - `failures: 0 -> -9` (scenario 1, example 1): the fake endpoint only treats
    `remainingFailures > 0` as a failure, so a negative count behaves like zero.
  - Scenario 4 example values (`addr`, `height`, `text`, `txid`, both rows):
    each value is resolved consistently on the setup and assertion sides, so a
    case/value change still passes.
- **Suite status** (`swarmforge/scripts/verify.sh indexer` after the review
  commit): **pass (4/4)** at `git_sha a9b1965013` — unit **168 passing**,
  property **19 pass / 0 fail**, acceptance **all 10 generated suites passed**,
  lint ok.

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only tool-written mutation/acceptance metadata.
