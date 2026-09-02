# following-feed — Architect Review Summary

**By architect.**

## Task and commits reviewed
- Task: `following-feed` (refactorer handoff, `merge_and_process refactorer d606ee6608`)
- Merged `swarmforge-refactorer` (fast-forward) — commits:
  - `6d94372` Spec Following feed (P6.6) (specifier)
  - `6d1bd14` Implement Following feed (coder)
  - `d606ee6` Refactor following feed: reduce CRAP/DRY, add property coverage (refactorer)

## Follow-up refactorer handoff (`merge_and_process refactorer b85878a5d5`)
- Merged `swarmforge-refactorer` — commit `b85878a` "Refactor following-feed scan: extract
  isFolloweePost to cut CRAP".
- **Architectural review (confirmed good):** `isFolloweePost` is a private helper within
  `PostQuery` that extracts the reply/viewer/membership predicate from
  `scanFollowingFeedTxidsAndCount`. It adds no new dependencies, preserves information hiding
  (the LevelDB model stays encapsulated), and keeps the dependency direction inward. Behavior is
  unchanged.
- **CRAP reduction confirmed:** `scanFollowingFeedTxidsAndCount` CC 7→5 (CRAP 7.0→5.0);
  `isFolloweePost` CC 3, both 100% covered.
- **Mutation:** `post-query.js` 0 killed / 0 survived / 0 uncovered (manifest refreshed by the
  approved tool).
- **DRY:** no new production duplication; only pre-existing test-helper duplicates.
- **Soft Gherkin mutation:** `following-feed.feature` 12 executed, 0 killed, 12 survived — all
  genuine equivalents (single-char case mutations of example values), unchanged from the prior
  review.
- **Suites:** DB unit 281 passing, property 37 passing, acceptance 9 files passing, lint clean;
  client acceptance 19 files passing.

## Architectural findings and fixes
- **UI/Core separation (confirmed good):** Client `FollowingFeedPage` is a thin, testable
  controller wrapping the `MemoDb` HTTP client; the React `FollowingFeed` component stays a pure
  UI shell. The feature is read-only and needs no wallet broadcast. Core behavior is testable
  without UI or network I/O.
- **Dependency rule (confirmed good):** DB `ListFollowingFeed` extends the shared `ListUseCase`
  base and depends only on the `followQuery` and `postQuery` adapter interfaces; the `/posts`
  REST controller is a thin adapter. The refactorer's `runUseCase`/`listPostsForAddr` extraction
  removed the duplicated try/catch error wrapper across the addr-scoped handlers.
- **Information hiding (confirmed good):** `PostQuery.scanFollowingFeedTxidsAndCount` encapsulates
  the LevelDB key/iterator model and the follows-join; the controller hides the query/limit/offset
  wiring; the client `MemoDb.getFollowingFeed` hides the HTTP endpoint. No framework or persistence
  structures leak across boundaries.
- **DRY reductions applied (behavior-preserving):** extracted `parseRequiredString` into
  `src/use-cases/lib/pagination.js` and used it in `ListFollowingFeed`, `ListPostsByAddr`, and
  `ListTopicPosts`, removing the three duplicated `parseAddr`/`parseRoom` required-field guards.

## Test hardening applied (kill mutation survivors / cover uncovered)
- **psf-memo-client `following-feed-page.test.js`** (covered 2 previously-uncovered sites):
  - constructor starts with `emptyBecauseNoFollows` false — covers the constructor field init;
  - `canLoadMore` is false when pagination is absent — covers the `canLoadMore` null-guard.
- **psf-memo-db `use-cases/index.unit.js`** (new): composition-root test asserting `start()`
  instantiates every use case (including `listFollowingFeed`) and that the constructor rejects
  missing adapters — covers the previously-uncovered `UseCases.start` wiring.

No production behavior changed; the only non-test source diffs are tool-generated mutation
manifests and the Gherkin acceptance-mutation stamp.

## Verification results

### Language mutation (`mutate4javascript`, differential vs manifest)
- **psf-memo-db** — all affected files **0 killed / 0 survived / 0 uncovered**:
  `list-following-feed.js`, `list-posts-by-addr.js`, `list-topic-posts.js`, `lib/pagination.js`,
  `use-cases/index.js`, `adapters/post-query.js`, `controllers/rest-api/posts/controller.js`,
  `controllers/rest-api/posts/index.js`.
- **psf-memo-client**
  - `following-feed-page.js` **0 killed / 0 survived / 0 uncovered**.
  - `memo-db.js` excluded: HTTP adapter using ESM + directory import (`../config`) only
    resolvable via react-scripts/webpack, not loadable under plain `node --test`; its read
    behavior is exercised end-to-end via the DB `/posts/following` acceptance. Consistent with
    the search precedent.

### DRY (`dry4javascript`)
- The `parseRequiredString` extraction removed the three duplicated required-field guards.
- Remaining duplicates are pre-existing pattern-boilerplate inherent to the established layered
  conventions (follow/mute/poll controllers, route-registration `index.js`, memo-follow/memo-mute
  services) and test/acceptance helpers — left as-is, consistent with prior reviews.

### CRAP / cyclomatic complexity (`crap4javascript`)
All following-feed functions well below the 8.0 threshold — highest is `FollowingFeedPage.load`
(CC 6, 100% cov, CRAP 6.0) and `parseRequiredString` (CC 3, 100% cov, CRAP 3.0); the rest are
CC 1–2 with 100% coverage.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **psf-memo-client** `following-feed.feature`: 12 executed, **0 killed, 12 survived** — all
  survivors are single-character case mutations of the example values (addresses, text, txids).
  Each example value is used consistently on both the setup and assertion sides of its scenario,
  so the mutation yields the same result set; the mutations are genuine equivalents.
  Specifier-side feature-quality item.

No implementation changes are warranted for the soft-mutation survivors; they are intrinsic
equivalents.

## Suite status
- **psf-memo-client**: unit **229 passing** (was 227; +2 hardening tests), property **30 passing**,
  acceptance **19 generated files, all passing**, lint **clean**, build **pass**.
- **psf-memo-db**: unit **281 passing** (was 280; +1 new composition-root test), property **37
  passing**, acceptance **9 generated files, all passing**, lint **clean**.
- **psf-memo-indexer**: unit **85 passing** (untouched by this task).

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the review commit (test hardening +
  refreshed mutation manifests + Gherkin acceptance-mutation stamp) for follow-up review.
- No specifier handoff: no functional or spec change in this commit (only test hardening and
  tool-generated manifests/stamps).
