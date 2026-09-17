# Topic Recency Pagination — Architect Review

## Task and commits reviewed

- Task: `topic-recency-pagination` (refactorer handoff `92ce290873`).
- Reviewed commits: `e2c0bbe` (spec), `e02bea5` (implement), `92ce290` (refactor).
- Architect commits: `0e8f8f0` (review), plus test-time tooling `0072b81`
  (pooled DB acceptance) and `d94aed8` (narrowed gherkin-mutator runner-worker).

The feature adds two derived topic indexes — `topicSummaries` (per-room
`postCount`/`lastHeight`) and `topicRecency` (one inverted-height key per room) —
so `GET /topics` can order and paginate by most recent post without iterating
the rooms store. A backfill utility rebuilds both indexes from the rooms store.

## Architectural findings

- **Good separation in the indexer.** Index maintenance lives in its own
  `src/use-cases/action-types/topic-indexing.js`; `topic-message.js` and
  `topic-follow.js` only decide *when* to call `recordTopicPost` /
  `ensureTopicRoom`. The generic `getIfPresent` helper hides not-found handling.
- **Good boundary in the DB.** `src/lib/backfill-topic-indexes.js` takes
  injected LevelDB handles and holds no file-system concerns; the CLI wrapper in
  `util/room/` owns store opening/closing and the backup warning.
  `TopicQuery.listTopics` reads counts from `topicSummaries` and pages the
  `topicRecency` iterator with `limit: offset + limit`, so the rooms store is
  never iterated and only the recency records needed for the page are read.
- **Client reuses `PaginatedPage`** instead of duplicating load/pagination
  logic; `openTopic`/`topicFeedPath` stay in the testable controller.
- **`topicRecencyKey` is duplicated** in the indexer helpers and the DB backfill
  library. This is an unavoidable cross-deployable protocol constant (the
  components do not share a module); both are pinned by exact-key unit tests so
  the two encodings cannot drift silently.
- **Observation, not changed:** `ListTopics` computes
  `hasMore: offset + topics.length < total`, while the pre-existing
  `ListTopicPosts` computes `hasMore: total > enriched.length` (no offset term).
  The latter is spec-encoded in `topic-read.feature` scenario 3 and is out of
  this task's scope; it is the source of two documented soft-mutation survivors.
- **CRAP/complexity:** the refactorer extracted `roomFromEntry`/`applyPost` from
  `collectSummaries` (CRAP 7.0 → 4.0) and shared `roomRange` between
  `getTopicPostTxids`/`listRoomFollowers`. No new high-complexity functions were
  introduced; the review changes are tests plus tool-written manifests.

## Fixes applied

- Added `test/unit/use-cases/action-types/topic-indexing.unit.js` covering the
  `recordTopicPost` height fallbacks (missing `blockHeight`, legacy summary
  without `lastHeight`, stale recency deletion), killing 4 survivors.
- Added exact `topicRecencyKey` encoding and `isNotFound` unit cases to
  `helpers.unit.js`, killing the `- -> +` / `0 -> 1` / `&& -> ||` survivors.
- Added a max-size boundary case to `topic-message.unit.js`, killing the
  `> -> >=` survivor.

## Verification

Records (all carry review commit `0e8f8f0eae2d4115d0b5b65eda2d924a7e3620da`):

| File | Component |
|------|-----------|
| `topic-recency-pagination-verification.json` | psf-memo-indexer (canonical) |
| `topic-recency-pagination-db-verification.json` | psf-memo-db |
| `topic-recency-pagination-client-verification.json` | psf-memo-client |

Suite status: indexer 101 unit / 12 property / 6 acceptance suites; db 384 unit
/ 57 property / 15 acceptance suites; client 431 unit / 85 property / 32
acceptance suites + build. All lint clean.

Language mutation (all changed production files):

- Indexer: `topic-indexing.js` 12/12 killed; `helpers.js` 23/23 killed;
  `topic-follow.js` 3/3 killed; `topic-message.js` 3 killed / 1 survived.
- DB: `topic-query.js` 16/16 killed; `backfill-topic-indexes.js` 8/8 killed;
  `list-topics.js` and `topics/controller.js` have no mutation sites.
- Client: `topic-discovery-page.js` 2/2 killed (`memo-db.js` is excluded per
  standing precedent).

Documented mutation equivalent:

- `topic-message.js` line 30 `pushDatas[0] -> pushDatas[1]`: `handlePost`
  normalizes the two-push payload and reads the text at index 1; it never reads
  index 0, so the room name and the action prefix are interchangeable there.

DRY (`dry4javascript`, scoped to changed files): no duplicate candidates in any
of the three components.

Soft Gherkin acceptance mutation (`--level soft`):

- Indexer `topic-recency-indexing.feature`: 42 total, 4 killed, 38 survived.
- DB `topic-pagination.feature`: 48 total, 42 killed, 6 survived.
- DB `backfill-topic-indexes.feature`: 21 total, 21 killed, 0 survived.
- DB `topic-read.feature`: 31 total, 29 killed, 2 survived.
- Client `topic-pagination.feature`: 10 total, 8 killed, 2 survived.

All survivors are intrinsic equivalents: example values (`addr`, `room`, `text`,
`txid`, `height`) flow into both the setup and the assertion in the same
scenario; the remaining survivors are `limit`/`offset` values that do not change
the asserted read counts or page membership (or `count` values above the 50-item
page size). No implementation gaps. The mutator wrote manifests/stamps into the
five feature files; those tool-written changes are committed.

## Test-time improvements (requested)

- **DB acceptance is now pooled** (`0072b81`): the 15 generated files run with
  bounded concurrency (default `min(4, files)`, `ACCEPTANCE_CONCURRENCY`
  override) instead of strictly sequentially. Generation still runs first and
  sequentially. Full DB acceptance dropped from ~430–790s to ~73s.
- **DB soft Gherkin mutation now narrows to the changed scenario/example**
  (`d94aed8`): the runner-worker diffs the mutated IR against
  `<work>/base/feature.json` and runs only the changed case (safe because each
  scenario uses an isolated world). A 48-mutation feature dropped from >900s
  (only 32 mutations reached) to ~74s.
- Process notes record both changes and the orphaned-mocha mutation-hang
  investigation.

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) for merge into
  `master`; no coder/refactorer follow-up was required.
