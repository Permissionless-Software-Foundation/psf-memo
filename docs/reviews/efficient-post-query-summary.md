# Review summary: efficient-post-query

**Architect review of the refactorer handoff for task `efficient-post-query`.**

## Commits reviewed
- `a5dc01e` (specifier): Spec efficient post queries via `addrPostHeights` and
  `postLikes` indexes — `backfill-post-indexes.feature`,
  `efficient-post-query.feature` (DB) and `addr-and-like-indexing.feature`
  (indexer).
- `a68151b` (coder): Implement efficient post query with `addrPostHeights` and
  `postLikes` indexes — `scanPostsByAddrTxidsAndCount`, by-address/recent post
  listings backed by the secondary indexes.
- `89f0b678c7` (refactorer): Refactor efficient post query — extract
  `computeLikeTip`/`isPaymentTo` in the like handler (CRAP 13.2 -> <=5.0),
  consolidate txid-extraction helpers into `txidFromKeyParts` (DRY), add a
  level-db unit test, and add property tests for key round-trips and by-address
  pagination conservation.

Merged onto the architect worktree on `swarmforge-architect`.

## Architectural findings and fixes applied
The structure is sound and consistent with the codebase's layered layout.
UI/Core separation and the dependency rule hold: `PostQuery` is a pure adapter
over the injected LevelDB store handles and hides the padded-height key model;
the use cases (`ListPostsByAddr`, `ListRecentPosts`) validate inputs and return
plain records, and the REST controllers stay thin. The refactorer's
`txidFromKeyParts` cleanly removes the duplicated key-parsing logic, and the
extracted `computeLikeTip`/`isPaymentTo` make the like-tip calculation testable
without touching the `handleLike` data flow. The new property test file is
isolated under `test/property/`, correctly excluded from the unit/coverage
paths, and pins key round-trips plus pagination conservation.

**Test hardening applied (kill mutation survivors):**
- `psf-memo-db/test/unit/adapters/post-query.unit.js`: added `#isReply` cases
  (true, not-found, `LEVEL_NOT_FOUND`, non-not-found rethrow) — kills the
  `true -> false` survivor — and `#scanPostsByAddrTxidsAndCount` total and
  limit-bounding cases.
- `psf-memo-indexer/test/unit/use-cases/action-types/helpers.unit.js`: added
  `#normalizeTwoPushMemoDatas` (2-byte-prefix no-split, extra-push no-split),
  `#stripLeadingEmptyPushes` (non-empty single-byte no-strip, lone-empty keep,
  falsy-later-push), and `#txHashFromPush` cases — kills 4 survivors
  (`&& -> ||`, `> -> >=`, `|| -> &&`, and the `datas[0] -> datas[1]` guard).

No production source changes were required; the only non-test source diffs are
tool-generated mutation manifests.

## Verification results

### Language mutation (`mutate4javascript`, full coverage, `--max-workers 8`)
- **psf-memo-db**
  - `post-query.js`: 34 killed, **0 survived**.
  - `list-posts-by-addr.js`: 1 killed, 0 survived.
  - `list-recent-posts.js`: 0 sites (thin config wrapper).
- **psf-memo-indexer**
  - `like.js`: 9 killed, 0 survived.
  - `helpers.js`: 18 killed, **0 survived**.
  - `post.js`: 2 killed, 0 survived.

### DRY (`dry4javascript`)
- DB `src/`: pre-existing REST-controller boilerplate duplication
  (health/profile/posts routers and controllers) plus the follow controller —
  pre-existing and unrelated to this batch; a shared controller base would be a
  broad cross-controller refactor beyond this handoff, so it is left consistent
  with convention.
- Indexer `src/`: pre-existing `set-name`/`set-profile`/`set-profile-pic` action
  duplication and `rpc.js` internal duplication — unrelated to this batch.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions are well below the 8.0 threshold. Highest:
`normalizeTwoPushMemoDatas` (CC 5, 100% cov, CRAP 5.0),
`PostQuery.scanRecentPostTxids` (CC 4, 100% cov, CRAP 4.0), `handleLike`
(CC 4, 100% cov, CRAP 4.0). `computeLikeTip`/`isPaymentTo` CC 3, 100% cov.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **psf-memo-db** `backfill-post-indexes.feature`: 22 executed, **22 killed, 0
  survived**.
- **psf-memo-db** `efficient-post-query.feature`: 52 executed, **45 killed,
  7 survived** — all `limit` and `max_iterations` parameter mutations. The
  fixture holds fewer posts than the mutated `limit` (so the returned page is
  unchanged), and the `max_iterations` assertions are upper bounds still
  satisfied after mutation. Genuine equivalents / weak example-to-assertion
  connections (specifier-side feature-quality items).
- **psf-memo-indexer** `addr-and-like-indexing.feature`: 31 executed,
  **6 killed, 25 survived** — single-character case/substitution mutations in
  the example `addr`/`height`/`text`/`txid`/`parentTxid` values. Each scenario
  writes and reads the same parameter consistently, so a mutated value does not
  change the observable outcome (weak write/read connection). Specifier-side
  feature-quality items.

No implementation changes are warranted for the soft-mutation survivors; they
are intrinsic equivalents or feature-quality items for the specifier.

## Suite status
- `psf-memo-db`: unit **130 passing** (was 126; +4 hardening tests), property
  **13 passing**, acceptance **pass** (5 feature files), lint **pass**.
- `psf-memo-indexer`: unit **46 passing** (was 38; +8 hardening tests), property
  **2 passing**, acceptance **pass** (2 feature files), lint **pass**.

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the efficient
  post-query review commit containing the test hardening, refreshed mutation
  manifests, and Gherkin acceptance-mutation stamps for the batch features.
- No specifier handoff: no functional or spec change in this commit (only test
  hardening and tool-generated manifests/stamps).

By architect.
