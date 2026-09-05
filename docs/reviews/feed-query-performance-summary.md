# Review summary: feed-query-performance

**Architect review of the refactorer handoff for task `feed-query-performance`.**

## Commits reviewed
- `df39b47` (specifier): Spec feed query performance — per-page reply counting and
  capped total scan (`feed-query-performance.feature`), and update
  `efficient-post-pagination.feature` to the per-page reply-count assertion.
- `65e85c9` (coder): Implement capped-scan feed query for `/posts/recent` —
  `PostQuery.scanRecentPostTxidsAndCount` with `TOTAL_SCAN_CAP=10`, per-page
  reply counting via `countRepliesForTxids`, and acceptance handlers/fixture for
  the new spec.
- `2455745` (refactorer): Reduce CRAP in the capped-scan query — extract
  `PostQuery.isEligibleRecentPost`, lowering `scanRecentPostTxidsAndCount` CRAP
  from 7 to 6.

Merged onto the architect worktree on `swarmforge-architect`.

## Architectural findings and fixes applied
The structure is sound and consistent with the codebase's layered layout.
UI/Core separation and the dependency rule hold: `ListRecentPosts` (use case)
calls the `PostQuery` adapter (near-IO) through its interface, and the
optimization correctly replaced the two full-index scans (`countTopLevelPosts`
over all of `postHeights`, `buildReplyCountMap` over all of `postChildren`) with
a single capped scan plus per-page reply counting. Information hiding is good:
`TOTAL_SCAN_CAP` is internal to the adapter, and the use case only sees
`{ txids, total }`. The refactorer's `isEligibleRecentPost` cleanly isolates the
reply/mute eligibility check.

**Dead-code removal applied (cohesion / information hiding):** the optimization
left the old full-scan methods dead in production — `topLevelPostTxids`,
`countTopLevelPosts`, `countTopLevelPostsByAddr`, and `buildReplyCountMap` were
referenced only by unit tests. These are the exact slow paths the task
eliminated, so leaving them in the adapter was a latent hazard (accidental
reintroduction of the slow path). I removed them and their unit tests.
`loadReplyTxids` was kept (still used by `scanFollowingFeedTxidsAndCount`), and
the thin backwards-compat wrappers `scanRecentPostTxids` / `scanPostsByAddrTxids`
were kept consistent with the existing convention.

**Test hardening applied (kill mutation survivors):**
- `psf-memo-db/test/unit/adapters/post-query.unit.js`: added a raw-scan-bound
  test asserting the scan stops at exactly `offset + limit + cap` entries —
  kills the `rawCount = 0 -> 1` and `rawCount >= maxRaw -> >` survivors.
- `psf-memo-db/test/unit/use-cases/list-recent-posts.unit.js`: added
  `viewerAddr` forwarding and `viewer` fallback cases — kills the
  `viewerAddr || viewer || null -> &&` survivor.

No other production source changes were required; the only non-test source diffs
are tool-generated mutation manifests.

## Verification results

### Language mutation (`mutate4javascript`, full coverage, `--max-workers 8`)
- **psf-memo-db**
  - `post-query.js`: 42 killed, **0 survived**, 0 uncovered.
  - `list-recent-posts.js`: 2 killed, **0 survived**, 0 uncovered.

### DRY (`dry4javascript`)
- Changed files (`post-query.js`, `list-recent-posts.js`): **no duplicate
  candidates**.
- Full DB `src/`: pre-existing pattern-boilerplate (follow/mute/topic state
  use-cases, follow/mute controllers and adapters) — unrelated to this batch and
  left consistent with convention.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions are well below the 8.0 threshold. Highest:
`PostQuery.scanRecentPostTxidsAndCount` (CC 6, 100% cov, CRAP 6.0),
`PostQuery.buildLikeCountMap` / `likeTxidFromPostLike` /
`scanFollowingFeedTxidsAndCount` / `scanPostsByAddrTxidsAndCount` (CC 5, 100%
cov, CRAP 5.0), `ListRecentPosts.execute` (CC 4, 100% cov, CRAP 4.0).
`isEligibleRecentPost` CC 3, 100% cov.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **psf-memo-db** `feed-query-performance.feature`: 25 executed, **5 survived**
  — all `limit` and `max_entries` parameter mutations. The fixture holds more
  posts than the mutated `limit` (so the returned page is unchanged), and the
  `max_entries` assertions are upper bounds still satisfied after mutation.
  Genuine equivalents / weak example-to-assertion connections (specifier-side
  feature-quality items).
- **psf-memo-db** `efficient-post-pagination.feature`: 30 executed, **6 survived**
  — all `limit` and `max_iterations` parameter mutations, same class of genuine
  equivalents as above.

No implementation changes are warranted for the soft-mutation survivors; they are
intrinsic equivalents or feature-quality items for the specifier.

## Suite status
- `psf-memo-db`: unit **345 passing** (was 342; +3 hardening tests, −4 dead-method
  tests), property **40 passing**, acceptance **pass** (all feature files,
  including the new `feed-query-performance`), lint **pass**.

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the feed-query
  performance review commit containing the dead-code removal, test hardening,
  refreshed mutation manifests, and Gherkin acceptance-mutation stamps for the
  batch features.
- No specifier handoff: no functional or spec change in this commit (only
  dead-code removal, test hardening, and tool-generated manifests/stamps).

By architect.
