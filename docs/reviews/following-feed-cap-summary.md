# Following Feed Cap — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `following-feed-cap` (refactorer handoff
  `merge_and_process refactorer 5653ecef9d`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from `eaaed8e`). Commits:
  - `6462977` Record mute broadcast result completion in backlog and briefing
    (specifier; the prior task's completion record, carried in by the
    fast-forward and outside this task)
  - `2ce0a62` Specify following feed capped scan (specifier)
  - `db21694` Implement following feed capped scan (coder)
  - `5653ece` Refactor following feed cap: share acceptance seeding, add cap
    properties (refactorer)
- Architect review commit: `b7c20560c2` (dead reply-txid loader removal +
  tool-written mutation and acceptance manifests).
- Verification record `git_sha`: `b7c20560c2` (db).
- Records/summary commit: this commit.

The feature bounds `GET /posts/following/:addr`: the old scan iterated the
entire global `postHeights` index to compute `pagination.total` (live total
10942) and first built a global reply-txid set by iterating all of
`postParents`. The new scan uses per-candidate `isReply` point lookups against
`postParents` and stops after `offset + limit + 500` *eligible* followed posts,
reporting `total = min(eligible, 500)` so the first pages stay bounded while
`hasMore` still works. The cap counts eligible followed posts, not raw index
entries (followed posts are sparse). DB-only; the client renders
`pagination.total` unchanged. Touches `psf-memo-db` only.

## Architectural review

- **UI/Core separation (good).** The change lives in the DB component: the
  `PostQuery` adapter (LevelDB access) and the `ListFollowingFeed` use case.
  There is no UI/IO boundary crossed; the use case is testable with an injected
  adapter.
- **Dependency rule (good).** `ListFollowingFeed` depends on the adapter through
  its injected `postQuery`/`followQuery` interfaces; the adapter is the
  low-level module and does not reach back into the use case. Dependency
  direction is unchanged by this task.
- **Information hiding and encapsulation (good).** The adapter exposes only
  `scanFollowingFeedTxidsAndCount` returning `{ txids, total }`; reply
  detection and followee membership are encapsulated in `isReply` and
  `isFolloweePost`. The cap semantics are documented on the method. The
  acceptance runner observes store iteration through a wrapped iterator rather
  than reaching into adapter internals.
- **Local code quality (one fix).** Switching from the global reply-txid set to
  per-candidate lookups left `PostQuery.loadReplyTxids` (and its
  `load-reply-txids.js` import) with no callers; it was the only uncovered code
  in `post-query.js` (lines 98–99 at 99.39%). Removed (see Fixes).
- **Duplication (documented, not changed).** The capped-scan scaffold in
  `scanFollowingFeedTxidsAndCount` now resembles
  `scanRecentPostTxidsAndCount`, but the two differ deliberately: the recent
  feed caps on *raw* index entries while the following feed caps on *eligible*
  followed posts, and their eligibility predicates differ (`isEligibleRecentPost`
  applies mute filtering, `isFolloweePost` applies follow membership). The
  recent-feed cap is pre-existing and outside this task, so no shared extraction
  was forced; DRY reports no candidate in the changed production file.

## Fixes applied

- **Removed the dead `PostQuery.loadReplyTxids` method** and its now-unused
  `load-reply-txids.js` import. Nothing called it after the capped scan moved to
  `isReply` point lookups (`search-query.js` imports the shared lib directly).
  This removed the last uncovered lines in the module and its mutation-manifest
  entry; the mutation tool regenerated the manifest.

No other production changes were needed. Module structure, dependency direction,
and information hiding were accepted.

## Verification results

Record (pinned to the review commit `b7c20560c2`):

| File | Component |
|------|-----------|
| `docs/reviews/following-feed-cap-verification.json` | psf-memo-db |

- **Language mutation** (`mutate4javascript src/adapters/post-query.js
  --mutate-all --max-workers 8`; the file removed a function, so all sites were
  forced to avoid differential under-selection): **40 killed, 0 survived,
  0 uncovered** (40 total sites, 11 reported changed by `--scan`).
- **DRY** (`dry4javascript`, scoped to the changed production file, the
  acceptance handlers, and the changed unit/property tests): **no duplicate
  candidate involves `src/adapters/post-query.js` or the new property tests.**
  The 115 reported candidates are all pre-existing boilerplate:
  `acceptance/lib/handlers.js` step-handler bodies (the
  `request ... with limit ... and offset ...` / `... store was not iterated`
  patterns) and `test/unit/adapters/post-query.unit.js` repeated test setup.
  Both classes pre-date the task and span unrelated suites, so they were left
  as-is per the standing precedent.
- **Cyclomatic complexity / CRAP** (`crap4javascript src/adapters/post-query.js`):
  max **CRAP 6.0** at 100% coverage
  (`scanFollowingFeedTxidsAndCount` CC 6, `scanRecentPostTxidsAndCount` CC 6,
  `likeTxidFromPostLike`/`scanPostsByAddrTxidsAndCount` CC 5,
  `isReply`/`listChildTxids`/`countLikesForTxids` CC 4); `isFolloweePost` CC 3,
  every other function CC ≤ 3. All functions are below the 8.0 threshold.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`), `psf-memo-db/specs/following-feed-performance.feature`:
  **17 total, 14 killed, 3 survived, 0 errors.** The three survivors are
  intrinsic equivalents caused by the small fixtures, not implementation gaps:
  - `m9` scenario 1 example 2 `limit: 50 -> 43` — only 11 posts remain after
    `offset: 499`, so both limits return the same 11 expected txids.
  - `m10` scenario 1 example 2 `max_entries: 510 -> 512` — the corpus (510) is
    below the cap, so the scan reads all 510; the assertion is "at most", a
    performance ceiling rather than an exact count, so 512 still holds.
  - `m15` scenario 2 example 1 `limit: 10 -> 7` — the mixed fixture has only two
    eligible followed posts, so both limits return both.
  `gherkin-mutator` wrote an `acceptance-mutation-manifest` with
  `"scenarios":[]` (each scenario has an equivalent survivor, so none is
  recorded) and no `# mutation-stamp`; committed as tool-written.

## Suite status

`verify.sh db` **result: pass** at `git_sha b7c20560c2`:

- unit: **405 passing**
- property: **60 pass / 0 fail**
- acceptance: **all 19 generated suites passed** (including both
  following-feed-performance scenarios/example sets)
- lint: ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- `git_handoff` to `coder` and `refactorer` (priority 00) with the review commit
  `b7c20560c2` for follow-up review: the only production change is the removal of
  the dead `PostQuery.loadReplyTxids`; the rest is tool-written mutation and
  acceptance manifests.
