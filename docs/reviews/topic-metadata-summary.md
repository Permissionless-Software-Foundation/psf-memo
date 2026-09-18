# Topic Metadata Columns — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `topic-metadata` (refactorer handoff `merge_and_process refactorer dd11964174`).
- Merged `swarmforge-refactorer` (fast-forward). Topic-metadata commits:
  - `a599b34` Spec topic metadata columns
  - `8da0f09` Implement topic metadata columns (coder)
  - `dd11964` Refactor topic metadata: cut CRAP, share test doubles, harden
    property tests (refactorer)
- Architect review commit: `3f05488` (survivor-killing tests + tool-written
  mutation manifests/stamps). Verification record `git_sha`: `3f05488da0`.
- Records/summary commit: (this commit).

The feature adds `lastSeen` (epoch-ms of the newest topic post, 0 for
follow-only rooms) and `followerCount` to each `topicSummaries` record; exposes
them from `GET /topics`; rebuilds them in the backfill utility; and renders
four topic columns (name, relative time, post count, follower count) on the
client topics page.

## Architectural findings

- **UI/Core separation (good).** The React `Topics` component stays thin: it
  delegates load/pagination to the testable `TopicDiscoveryPage` controller and
  formats labels with the pure `relative-time.js` service (own unit tests). The
  controller also exposes `getLastSeenLabel` for the acceptance/unit seam. The
  component calls `relativeTime(topic.lastSeen, …)` directly rather than that
  wrapper, but both share the same pure function, so the exercised logic is the
  tested logic. Accepted as-is.
- **Dependency direction (good).** Indexer metadata maintenance is isolated in
  `topic-indexing.js`; `topic-follow.js`/`topic-message.js` only decide *when*
  to call `recordTopicFollow`/`recordTopicPost`. `backfill-topic-indexes.js`
  takes injected LevelDB handles and holds no file-system concerns; the CLI
  wrapper opens the real stores. `TopicQuery.listTopics` reads metadata from
  `topicSummaries` and ordering/pagination from `topicRecency` with
  `limit: offset + limit`, never iterating `rooms`.
- **Information hiding (good).** `getIfPresent`/`isNotFound` hide not-found
  handling; `listTopics` defaults missing metadata fields to 0 for legacy
  summaries. The `topicSummaries` record shape and `topicRecencyKey` are
  duplicated between the indexer and the DB — unavoidable cross-deployable
  protocol constants (the components share no module); both are pinned by
  exact-key/field tests so they cannot drift silently.
- **Local quality (good).** The refactorer replaced the ternary follower delta
  with `Number(isActive) - Number(wasActive)`, dropping `recordTopicFollow` from
  CC 8 to CC 6. The indexer and DB share in-memory store doubles
  (`test/support/memory-db.js`, `test/support/level-double.js`) instead of
  re-creating them per test.
- **Observation (not changed).** `recordTopicFollow` recomputes
  `followerCount` from `summary.followerCount ?? 0`. If a room's `roomsDb`
  record survives but its `topicSummaryDb` summary is lost, an idempotent replay
  (delta 0) would report 0 rather than the true active-follow count. This only
  arises from a degraded store state that the backfill repairs, and no runtime
  path reaches it, so it was left unchanged.

## Fixes applied (kill language-mutation survivors)

Added DB unit tests only; no production behavior changed.

- `psf-memo-db/test/unit/adapters/topic-query.unit.js`
  - `listTopics()` called with no arguments defaults `limit` 100 / `offset` 0
    (killed `offset = 0 -> 1`).
  - A legacy summary without `postCount` reports 0 (killed `?? 0 -> 1`).
  - A post without `blockHeight` orders after a height-1 post, pinning the
    zero default (killed `blockHeight ?? 0 -> 1`).
- `psf-memo-db/test/unit/lib/backfill-topic-indexes.unit.js`
  - A post without `blockHeight` summarizes at `lastHeight` 0 and recency
    height 0 (killed `value.blockHeight ?? 0 -> 1`).
  - `topicRecencyKey(undefined|null, room)` equals `topicRecencyKey(0, room)`
    (killed `blockHeight ?? 0 -> 1`).

These five survivors were the only real mutation gaps; all remaining survivors
are documented intrinsic equivalents.

## Verification

Records (`git_sha` `3f05488da024895005786de0b8dd6973045d7b46`):

| File | Component |
|------|-----------|
| `docs/reviews/topic-metadata-verification.json` | psf-memo-indexer (canonical) |
| `docs/reviews/topic-metadata-db-verification.json` | psf-memo-db |
| `docs/reviews/topic-metadata-client-verification.json` | psf-memo-client |

Suite status (all `pass`):

- **psf-memo-indexer**: 113 unit, 12 property, 7 acceptance suites, lint ok.
- **psf-memo-db**: 392 unit (was 387; +5 review tests), 57 property,
  16 acceptance suites, lint ok.
- **psf-memo-client**: 441 unit, 90 property, 33 acceptance suites, lint ok,
  build ok.

Language mutation (`mutate4javascript`, `--max-workers 8`; `--mutate-all`
where the differential run under-selected the changed DB files):

- Indexer: `topic-indexing.js` 26/26 killed; `topic-follow.js` 3/3 killed;
  `topic-message.js` 3 killed / 1 survived.
- DB: `topic-query.js` 29/29 killed (after hardening);
  `backfill-topic-indexes.js` 11 killed / 2 survived.
- Client: `relative-time.js` 8/8 killed; `topic-discovery-page.js` 2/2 killed.

Total 82 killed, 3 survived.

Documented mutation equivalents:

- `psf-memo-indexer/src/use-cases/action-types/topic-message.js` line 30
  `pushDatas[0] -> pushDatas[1]`: `handlePost` normalizes a two-push payload and
  always reads the text at index 1; index 0 is never inspected, so the action
  prefix and the room are interchangeable there.
- `psf-memo-db/src/lib/backfill-topic-indexes.js` lines 43/45 `> -> >=`: on
  equality the guard assigns the value it already holds, so the summary is
  unchanged.

DRY (`dry4javascript`, scoped to changed files): no candidates in the changed
production files. One candidate in tests — the identical `topicRecencyKey`
ordering property test in `psf-memo-db` and `psf-memo-indexer` — is
cross-component duplication mirroring the duplicated key function; not
reducible without a shared test package, consistent with the accepted protocol
constant. No change.

CRAP (`crap4javascript`): every changed function is 100% covered and below the
8.0 threshold; highest CRAP/CC 6.0 (`recordTopicFollow`, `collectSummaries`,
`TopicQuery.getTopicPostTxids`, `relativeTime`).

Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`):

- DB `topic-metadata.feature`: 30 total, **30 killed**, 0 survived → the tool
  wrote a `# mutation-stamp` plus the per-scenario manifest.
- Indexer `topic-metadata-indexing.feature`: 62 total, 14 killed, 48 survived.
- Client `topic-metadata-columns.feature`: 28 total, 16 killed, 12 survived.

All survivors are intrinsic equivalents, not implementation gaps: single-character
case mutations of example values (`room`, `addr`, `txid`, `text`) are resolved
consistently on both the setup and assertion sides of their scenario; the
`height`/`firstHeight`/`secondHeight` mutations feed scenarios that do not
assert height; the `firstSeen`/`secondSeen` mutations do not cross the asserted
`max(seen)` (the killed mutations are the ones that do); and the client
`lastSeen` mutations stay inside the same relative-time bucket. These are
specifier-side feature-quality items (weak write/read connection), consistent
with prior reviews. The mutator wrote manifests into the indexer and client
features; those tool-written changes are committed as-is.

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using the records/summary commit.
- No coder/refactorer follow-up: the review adds tests and tool-written
  metadata only, with no production behavior change.
