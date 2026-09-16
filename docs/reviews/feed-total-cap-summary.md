# feed-total-cap — Architect Review

Task: `feed-total-cap`
Component: `psf-memo-db`
Base: `c2bfbc3` (last merged architect review)

## What was reviewed

Inbound refactorer batch (priority 10):

- **`c131b91`** — coder: *Raise recent-feed total scan cap to 500*. Changes
  `PostQuery.TOTAL_SCAN_CAP` from 10 to 500, adds two unit cases
  (exact-total-under-cap and default-cap read bound), and adds the
  `many-top-level-posts` acceptance fixture (510 top-level posts).
- **`10deb3e`** — refactorer: *Add recent-feed cap property tests*. Adds
  `test/property/recent-feed-cap.property.test.js` (capped total, newest-first
  pagination conservation, bounded raw scan, 500 default cap, reply exclusion).

Also in the linear chain (specifier-side): `a643820` (backlog entry) and
`28b34b5` (spec: new `feed-total-cap.feature`, `feed-query-performance`
scenario 2 renamed and totals raised to the exact-under-cap value).

Merged onto `swarmforge-architect` by fast-forwarding to `10deb3e`.

**Architect review commit: `b2c78fb651`** — tool-written manifests only (the
`mutate4javascript` manifest in `post-query.js` and the `gherkin-mutator`
acceptance stamps in the two touched feature files). This summary and the
verification record are committed directly on top of it, so
`git diff b2c78fb651 HEAD` touches only `docs/`. The record's `git_sha` is
`b2c78fb651`, the commit that contains the verified source state.

## Architectural findings and fixes applied

No structural change was warranted.

1. **Information hiding / dependency rule.** The cap remains a module-private
   constant (`TOTAL_SCAN_CAP = 500`) in `src/adapters/post-query.js`, exposed
   only through the existing optional `totalScanCap` parameter. The high-level
   `ListRecentPosts` use case does not learn any new index or IO detail; there
   is no new dependency from core toward LevelDB, and no new module boundary.
2. **Testability.** The new property tests drive `PostQuery` through in-memory
   doubles (`makePostHeightsDb` with a read counter, `makeParentsDb`,
   `makeQuery`) and never touch LevelDB or the network; the read bound is
   observable through the counter. Tests stay separate from the generators in
   `test/property/harness.js`.
3. **Duplication.** `dry4javascript` reported no duplicate candidate in the
   changed source (`post-query.js`) nor in the new property test. The 74
   duplicate blocks it did report are pre-existing `acceptance/lib/handlers.js`
   step-handler boilerplate and old `post-query.unit.js` mock shapes; none
   overlaps `loadManyTopLevelPosts`. Deferred as documented pre-existing
   pattern-boilerplate, consistent with prior reviews.
4. **Acceptance fixture.** `loadManyTopLevelPosts` lives in the acceptance
   handler library (test helper), separate from unit/property tests. It writes
   `posts`, `postHeights`, and `addrPostHeights`; the `addrPostHeights` writes
   are not read by the recent-feed path but are harmless and keep the fixture
   reusable for address queries.

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`)
- `psf-memo-db/src/adapters/post-query.js`: differential run selected 0 of 37
  covered sites (only a module-level constant changed), so `mutate-file.sh`
  auto-reran `--mutate-all`: **37 killed, 0 survived, 0 uncovered**.

### DRY (`dry4javascript`)
- Changed files (`src/adapters/post-query.js`,
  `test/property/recent-feed-cap.property.test.js`,
  `test/unit/adapters/post-query.unit.js`, `acceptance/lib/handlers.js`):
  **no new duplicate candidates**. The 74 reported blocks are all pre-existing
  handler/unit mock boilerplate.

### CRAP / cyclomatic complexity (`crap4javascript src/adapters/post-query.js`)
All functions below the 8.0 threshold. Highest:
`PostQuery.scanRecentPostTxidsAndCount` (CC 6, 100% covered, CRAP 6.0),
then `likeTxidFromPostLike` / `scanFollowingFeedTxidsAndCount` /
`scanPostsByAddrTxidsAndCount` (CC 5, CRAP 5.0). The cap change does not alter
cyclomatic complexity.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **`feed-total-cap.feature`**: 10 executed, **7 killed**, **3 survived**,
  0 errors.
  - `examples[1].limit 50 -> 43`: genuine equivalent — after `offset 499` only
    11 of the 510 posts remain, so the page length is `min(limit, 11) = 11` for
    both values and `total 500` / `hasMore false` are unchanged.
  - `examples[1].max_entries 510 -> 512`: intrinsic upper-bound equivalent — the
    `at most` bound mutated upward can never fail (actual reads 510); APS exposes
    no project mutation filter, documented precedent.
  - `examples[1].offset 499 -> 504`: weak example-to-assertion connection — the
    scenario asserts `total`, `hasMore`, and the read bound but not the returned
    page slice, so shifting the offset within the tail still passes. Specifier-side
    feature-quality item, not an implementation gap.
- **`feed-query-performance.feature`**: 25 executed, **18 killed**, **7
  survived**, 0 errors. All 7 are the same pre-existing class already documented
  in `feed-query-performance-summary.md` (5 survivors then): `limit` mutations
  wider than the page, `max_entries` upper-bound mutations, and one new
  `offset 0 -> 7` page-slice mutation exposed by the specifier's revised
  examples. Genuine equivalents / weak assertions; no implementation change
  warranted.

### Suite status
`swarmforge/scripts/verify.sh db --record
docs/reviews/feed-total-cap-verification.json --task feed-total-cap`
-> **pass (4/4)**:
unit **358 passing**, property **48 pass / 0 fail**, acceptance **all 12
acceptance suites passed** (including the new `feed-total-cap`), lint **pass**.
Record `git_sha` = `b2c78fb651`.

## Handoffs sent
- End-of-chain `git_handoff` to the specifier (`priority: 50`, task
  `feed-total-cap`) with the review commit so it can merge
  `swarmforge-architect` into `master`.
- No coder/refactorer handoff: the review is tool-written manifests only, with
  no follow-up work for them. The soft-mutation survivors are specifier-side
  feature-quality items, not implementation gaps.

By architect.
