# Profile Recency Via DB Read API — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `profile-recency-db-read` (refactorer handoff
  `merge_and_process refactorer bcde7019cc`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `03ad934cd3`). Commits:
  - `aa8156a` Record profile-token-name-tooltip completion in backlog and
    briefing (specifier/master)
  - `440ab0b` Spec profile recency establishment via the DB read API
    (specifier/master)
  - `7065733` Establish profile recency through the DB newest-post read API
    (coder)
  - `bcde701` Clean up profile-recency DB read and extend coverage
    (refactorer)
- Architect review commit: `3a3c314b92` — three mutation-killing unit tests plus
  the tool-written `mutate4javascript` / `gherkin-mutator` manifests. No
  production behavior changed.
- Records/summary commit: this commit.

When a set-profile transaction (0x6d05) arrives after the address has already
posted, the indexer no longer scans its own `addrPostHeights` store across the
REST boundary. Instead it asks psf-memo-db for the newest confirmed qualifying
post via a new read endpoint `GET /profile/newest-post/:addr`. A qualifying post
is a top-level post (0x6d02) or a topic message (0x6d0c); replies (tracked in
`postParents`) and poll creations (tracked in `polls`) do not qualify, and a post
above `status.chainBlockHeight` is unconfirmed. The newest confirmed post wins,
with `seen` as the tie-breaker at equal heights. The read API returns
`{ addr, blockHeight, seen }`, or an empty object when the address has none.

## Architectural review

- **Single source of truth for the qualifying-post rule (good).** The rule lived
  twice before this task: the DB backfill and the indexer each scanned
  `addrPostHeights` and applied confirmation/qualifying filters. The refactorer
  extracted the pure helpers into `psf-memo-db/src/lib/qualifying-post.js`, and
  both `lib/backfill-profile-recency.js` and the new
  `adapters/profile-query.js#getNewestQualifyingPost` use them. The indexer's
  duplicate `qualifyingCandidate` / `newerCandidate` / `findNewestQualifyingPost`
  were deleted.
- **Dependency rule (good).** The indexer use case now depends on the injected
  `newestQualifyingPost` abstraction (an HTTP read client), not on a persistence
  store; the DB owns the read/qualifying rules. Low-level HTTP concerns stay in
  `src/adapters/newest-qualifying-post.js`; the high-level indexer rule in
  `src/use-cases/action-types/profile-recency.js` stays free of axios/URL details.
- **UI/Core separation (good, n/a for UI).** The DB rule is a pure, IO-free
  library exercised under plain mocha; the use case validates its input and
  delegates to the adapter; the controller and router are thin.
- **Information hiding and encapsulation (good).** `addrRange` stays private;
  `getNewestQualifyingPost` on the adapter returns exactly `{ addr, blockHeight,
  seen }` and never leaks LevelDB records. Cash addresses contain colons, so the
  key parser splits the height/txid from the end and the range lookup is bounded
  by the requested address.
- **Local code quality (good).** Max cyclomatic complexity 5 in both components;
  the confirmation rule and the upsert ordering each appear once. The read path
  scans only the requested address's `addrPostHeights` range.
- **Accepted observation — the backfill and read API treat a missing chain tip
  differently (documented, not changed).** The DB `isConfirmedEntry` treats every
  entry as confirmed when no tip is stored; the indexer `isConfirmed` treats a
  missing block height as unconfirmed. Each is correct for its caller (the
  backfill cannot disprove confirmation; a mempool post has no height), and the
  behavior is pinned by unit and acceptance tests.
- **Accepted observation — generic `getRecord` helper lives in the
  qualifying-post library (documented, not changed).** `qualifying-post.js`
  exports `isNotFound`/`getRecord` and `backfill-profile-recency.js` imports them,
  while `profile-query.js` keeps its own `getRecordOrNull`. The scoped DRY run
  reports no candidate (the bodies differ below the tool thresholds); extracting a
  generic record-read module would be a cross-module refactor beyond this handoff.

## Fixes applied

Three language-mutation survivors were killed with focused unit tests:

- **DB poll exclusion (`profile-query.js` line 43 `pollsDb || null`).** Added a
  `getNewestQualifyingPost` test where the newest `addrPostHeights` entry is a
  poll creation; the older top-level post must be returned. Without the
  `pollsDb` wiring the poll would be treated as qualifying.
- **DB chain-tip exclusion (`profile-query.js` line 44 `statusDb || null`).**
  Added a test with a post above `chainBlockHeight`; the newest *confirmed*
  post must be returned. Without the `statusDb` wiring the above-tip post would
  win.
- **Indexer idempotent no-write (`profile-recency.js` line 53 `seen <=
  existingSeen`).** Added a test that asserts `update` is not called when the
  same height and seen are re-recorded. The old assertion only checked final
  state, so the `<` mutant (which rewrites an identical record) survived.

Re-run results: DB `profile-query.js` **20 killed / 1 survived / 0 uncovered**
(was 18 killed / 3 survived); indexer `profile-recency.js` **15 killed / 1
survived / 0 uncovered** (was 14 killed / 2 survived).

## Verification results

Records (pinned to the review commit `3a3c314b92`):

| File | Component |
|------|-----------|
| `docs/reviews/profile-recency-db-read-verification.json` | psf-memo-db |
| `docs/reviews/profile-recency-db-read-indexer-verification.json` | psf-memo-indexer |

- **Language mutation** (`swarmforge/scripts/mutate-file.sh <file>
  --max-workers 8`, one file at a time, differential with automatic
  `--mutate-all` re-run on under-selection):
  - DB `src/lib/qualifying-post.js`: **19 killed, 2 survived, 0 uncovered**
    (21 sites). Survivors: `isNewer` line 94 `> -> >=` and line 95 `> -> >=`.
  - DB `src/lib/backfill-profile-recency.js`: **0 sites** (pure orchestration
    over the shared helpers; structural zero).
  - DB `src/adapters/profile-query.js`: **20 killed, 1 survived, 0 uncovered**.
    Survivor: `compareRecency` line 59 `< -> <=`.
  - DB `src/controllers/rest-api/profile/controller.js`: **0 sites**.
  - DB `src/controllers/rest-api/profile/index.js`: **0 sites**.
  - DB `src/use-cases/get-newest-qualifying-post.js`: **1 killed** (the address
    validation branch).
  - DB `src/use-cases/index.js`: **1 killed**.
  - DB `src/adapters/index.js`: 2 sites, **2 uncovered** (the `return true`
    booleans in `openDatabases`/`start` at the LevelDB wiring boundary).
  - Indexer `src/adapters/newest-qualifying-post.js`: **2 killed**.
  - Indexer `src/use-cases/action-types/profile-recency.js`: **15 killed, 1
    survived, 0 uncovered**. Survivor: `recordProfileRecency` line 68
    `blockHeight ?? 0 -> 1`.
  - Indexer `src/adapters/adapters-index.js`: 1 site, **1 uncovered** (the
    adapter wiring boolean).
- **Documented equivalent/dead survivors (not chased):**
  - `isNewer` lines 94/95 (`> -> >=`): each branch is entered only when the
    compared field is unequal, and `qualifyingCandidate` returns no `txid`, so an
    equal height/seen candidate is structurally identical — the stored result is
    unchanged.
  - `compareRecency` line 59 (`< -> <=`): the `a.addr === b.addr` guard two lines
    above returns first, so the equality case never reaches the tie-break.
  - `recordProfileRecency` line 68 (`blockHeight ?? 0 -> 1`): the `?? 0` fallback
    is unreachable because `isConfirmed` rejects a null/undefined height before
    the call; the sibling `seen ?? 0` fallback is killed by the missing-seen test.
  - The `adapters/index.js` / `adapters-index.js` uncovered sites are boolean
    literals in environment-only adapter wiring (LevelDB open + HTTP client
    construction), consistent with prior reviews' unsuitable-boundary policy.
- **DRY** (`dry4javascript`, scoped to the changed production files):
  - DB (`qualifying-post.js`, `backfill-profile-recency.js`, `profile-query.js`,
    `adapters/index.js`, `get-newest-qualifying-post.js`, `use-cases/index.js`,
    `profile/controller.js`, `profile/index.js`): **"No duplicate candidates
    found."**
  - Indexer (`newest-qualifying-post.js`, `adapters-index.js`,
    `profile-recency.js`): **"No duplicate candidates found."**
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the changed production
  files, threshold 8.0):
  - DB max **CC 5 / CRAP 5.0** (`findNewestQualifyingPost`,
    `ProfileQuery.compareRecency`, `ProfileQuery.getRecordOrNull`,
    `qualifyingCandidate`); all others ≤ 4. Exit 0.
  - Indexer max **CC 5 / CRAP 5.0** (`isConfirmed`, `recordProfileRecency`,
    `upsertProfileRecency`); all others ≤ 4. Exit 0.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with each component's runner worker and
  `--json`):
  - `psf-memo-db/specs/newest-qualifying-post.feature`: **6 total, 6 killed, 0
    survived, 0 errors.** The feature is new, so every mutation ran fresh; the
    tool wrote a clean `# mutation-stamp`.
  - `psf-memo-indexer/specs/profile-recency-indexing.feature`: **88 total, 8
    killed, 80 survived, 0 errors.** The 8 kills are all scenario 3's ordering
    values (`height`/`seen`/`firstHeight`/`secondHeight`) where the expectation
    is independently tied. The 80 survivors are intrinsic: each mutated example
    value (`addr`, `txid`, `text`, `room`, `question`, numeric heights/seens) is
    resolved consistently on both the setup and assertion sides, so the scenario
    still passes. Per the tool's contract all scenarios retain a survivor, so the
    committed manifest is `"scenarios":[]` with no `# mutation-stamp` (re-mutated
    next run), matching prior reviews.
- **Suite status** (`swarmforge/scripts/verify.sh`, after the review commit):
  - `verify.sh db` **result: pass (4/4)** at `git_sha 3a3c314b92`:
    unit **454 passing**, property **67 pass / 0 fail**, acceptance **all 23
    generated suites passed**, lint ok.
  - `verify.sh indexer` **result: pass (4/4)** at `git_sha 3a3c314b92`:
    unit **150 passing**, property **14 pass / 0 fail**, acceptance **all 9
    generated suites passed**, lint ok.

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only hardening tests and tool-written mutation/acceptance
  metadata.
