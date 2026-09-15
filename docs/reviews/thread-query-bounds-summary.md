# Review summary: thread-query-bounds

**Architect review of the refactorer handoff for task `thread-query-bounds`.**

## Commits reviewed
- `9db1137` (specifier): Add thread query performance specification
  (`psf-memo-db/specs/thread-query-performance.feature`) and record both
  implementation parts in the backlog.
- `3c4de9c` (coder): Implement bounded thread query for `/posts/:txid/thread` —
  per-thread like counting via `countLikesForTxids` instead of the whole-DB
  `buildLikeCountMap`, and a prefix-scan of `postChildren` per node instead of a
  full-store walk.
- `386fea9` (refactorer): Add property tests for the thread query and cover
  `GetPostThread` edge cases.

Merged onto the architect worktree (`swarmforge-architect`) as `d422db0`. The
merge also fast-forwarded the architect branch to `master`'s client worktree
changes (new-post txid display, nav menu, tooltip, Dockerfile cleanup); those
were already on `master` and are outside this task, but their suites were run as
part of merge hardening.

## Architectural findings and fixes applied
The core optimization is correct and worth keeping: thread work is now
proportional to the thread, not the database. The review found and fixed three
structural issues the handoff left behind.

1. **Information hiding / dependency direction (the key fix).** The refactorer
   moved the `postChildren` key format (`${parentTxid}:`, `:\uffff`) into the
   `GetPostThread` use case, which also reached into
   `postQuery.postChildrenDb.iterator(...)` and `postQuery.postsDb.get(...)`
   directly. That couples a high-level use case to the LevelDB representation.
   I added `PostQuery.listChildTxids(txid)` (adapter owns the key format and the
   prefix bounds), made `GetPostThread` call `listChildTxids` and the existing
   `PostQuery.getPostOrNull`, and made `countRepliesForTxids` delegate to
   `listChildTxids` (removing the duplicated prefix-scan). `GetPostThread` now
   depends only on the `PostQuery` interface.

2. **Dead full-scan method removed (cohesion).** `PostQuery.buildLikeCountMap`
   was the exact whole-database like scan this task eliminated; after the change
   it was referenced only by tests. Removed it and its tests, consistent with
   the `feed-query-performance` review precedent. `postTxidFromPostLike` and
   `postLikeKey` were kept (still pinned by the key round-trip property test).

3. **Uncovered guards now covered + property tests realigned.** The prefix-scan
   guards (`child?.parentTxid !== txid`, `!child?.childTxid`) and the
   `buildThreadNode` cycle guard were uncovered by the handoff tests. I moved the
   prefix-bound assertions into `PostQuery` unit/property tests, added unit cases
   for the parent-mismatch and missing-child guards, added a cycle test, and
   repurposed the `like-count` property test to the live `countLikesForTxids`
   path.

The only production behavior change is the removal of the dead method; thread
results, ordering, and like counts are unchanged.

## Verification results

### Language mutation (`mutate4javascript`, full mutation, `--max-workers 8`)
- **`psf-memo-db/src/adapters/post-query.js`**: 37 killed, **0 survived**, 0 uncovered.
- **`psf-memo-db/src/use-cases/get-post-thread.js`**: 10 killed, **0 survived**, 0 uncovered.
- The differential/default run only selected 1 changed site after the manifest
  refresh, so both files were re-run with `--mutate-all` to guarantee the new
  `listChildTxids` and removed method were actually mutated. Manifests were
  refreshed by the tool (no hand edits).

### DRY (`dry4javascript`)
- Changed files (`post-query.js`, `get-post-thread.js`): **no duplicate
  candidates**. The `postChildren` prefix-scan is now single-sourced in
  `PostQuery.listChildTxids`.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions are well below the 8.0 threshold and 100% covered. Highest:
`PostQuery.scanRecentPostTxidsAndCount` (CC 6, CRAP 6.0, pre-existing),
`GetPostThread.buildThreadNode` (CC 5, CRAP 5.0), `PostQuery.likeTxidFromPostLike`
/ `scanFollowingFeedTxidsAndCount` / `scanPostsByAddrTxidsAndCount` (CC 5,
CRAP 5.0). `PostQuery.listChildTxids` is CC 4, CRAP 4.0; `countRepliesForTxids`
is CC 2, CRAP 2.0.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **`thread-query-performance.feature`**: 8 executed, **6 killed**, **2 survived**.
  Both survivors are `max_entries` upper-bound mutations
  (`1 -> 3` and `0 -> 7`). The assertion is `reads <= max_entries`, so raising
  the bound can never fail: the fixture performs 1 and 0 `postChildren` reads
  respectively, still below the larger bound. These are intrinsic equivalents /
  weak example-to-assertion connections (the same class documented for
  `feed-query-performance`), not implementation gaps; no change warranted. The
  feature stamp is correctly withheld because survivors remain.

## Suite status
- `psf-memo-db`: unit **357 passing**, property **44 passing**, acceptance
  **11/11 generated files pass** (including `thread-query-performance`),
  lint **pass**.
- `psf-memo-client` (merge hardening): unit **309 passing**, lint **pass**,
  build **pass**.
- `psf-memo-indexer` (merge hardening): unit **85 passing**, lint **pass**.

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the review commit
  (adapter encapsulation, dead-code removal, test hardening, refreshed mutation
  manifests, Gherkin acceptance-mutation manifest).
- No specifier handoff: no functional or spec change in the review commit
  (structural refactor, tests, and tool-generated manifests only).

By architect.
