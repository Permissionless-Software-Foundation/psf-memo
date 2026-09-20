# Feed Tabs — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `feed-tabs` (refactorer handoff
  `merge_and_process refactorer 4b8b4ed499`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from `de3f1c8`). Commits:
  - `f3a41de` Specify merged posts feed with Recent/Following tabs (specifier)
  - `d1372da` Merge Following feed into the posts page as Recent/Following tabs
    (coder)
  - `4b8b4ed` Refactor feed tabs: simplify mode loading, add feed-tabs
    properties (refactorer)
- Architect review commit: `e4bda31256` (view/controller encapsulation + test
  consolidation + tool-written mutation and acceptance manifests).
- Verification record `git_sha`: `e4bda31256` (client).
- Records/summary commit: this commit.

The feature merges the old `/posts/following` route into `/posts/recent` as a
row of two mode buttons. On first open the page asks
`GET /follow/following/:addr`; if the viewer follows at least one account it
selects Following, otherwise Recent. Switching tabs resets to the first page.
The `/posts/following` route and navbar item are removed. The new
`FeedTabsPage` service composes the existing `RecentFeedPage` and
`FollowingFeedPage` controllers behind injected `memoDb`/`wallet`, and the React
shell (`components/app-body/posts/index.js`) renders it. Client-only read
feature; no DB or indexer change.

## Architectural review

- **UI/Core separation (good).** `FeedTabsPage` is pure coordinator logic in
  `src/services/` with `memoDb` and `wallet` injected; it opens no network, DOM,
  or wallet IO itself. The React shell constructs `MemoDb` and the controller and
  maps the snapshot into view state. Acceptance drives the controller directly
  through the fake memo-db, so core behavior is tested with no UI or IO.
- **Dependency rule (good).** The view depends on the service; the service
  depends on the two page controllers and on the `MemoDb` adapter through its
  constructor. No high-level module reaches around the injected adapter, and the
  adapter does not reach back into the controller.
- **Information hiding (one fix).** The controller exposes a tested `getState()`
  snapshot, but the view was still reading `page.posts`, `page.pagination`,
  `page.mode`, `page.emptyBecauseNoFollows`, and `page.offset` directly. Routed
  `showPage` through `getState()` so the controller is the single source of feed
  state (see Fixes).
- **Local code quality (one fix).** The two default-mode unit tests were
  structurally identical and DRY reported them (score 1.00). Consolidated into a
  table-driven pair with a shared assertion helper. Added initial-state tests to
  kill mutation survivors the refactorer left (see Fixes).
- **Delegation, not duplication (accepted).** `FeedTabsPage` owns paging
  (`nextPage`/`previousPage`/`canLoadMore`) and delegates post loading to the two
  sub-pages. It computes `emptyBecauseNoFollows` itself from `hasFollows`, which
  is the correct merged-page semantics (the message shows only when the viewer
  follows no one). `FollowingFeedPage` still exposes its own
  `emptyBecauseNoFollows`, but that is the older `/posts/following` contract and
  is now unused by the tabs flow; it is retained only because
  `specs/following-feed.feature` still specifies it. Not changed here (specifier
  owns retiring that feature); noting it as the one remaining conceptual overlap.
- **Module boundaries (good).** The deleted `following-feed` component left no
  dangling imports; `FollowingFeedPage` remains as the internal delegate used by
  `FeedTabsPage`, and `memo-db.js` gained a thin `getFollowing` adapter method
  next to the existing `getFollowingFeed`.

## Fixes applied

- **View consumes the controller snapshot.** `posts/index.js` `showPage` now
  reads `page.getState()` instead of five internal fields, keeping the
  controller's representation hidden behind its public accessor. The injected
  `memoDb` (needed for author-profile lookup) is still passed explicitly.
- **Killed four mutation survivors with initial-state tests.** The refactorer's
  first mutation run left `constructor.offset = 0`, `constructor.hasFollows =
  false`, `constructor.emptyBecauseNoFollows = false`, and the
  `canLoadMore() ?? false` default surviving because no test observed an
  unloaded controller. Added `constructor starts in a neutral, unloaded state`
  and `canLoadMore is false before any page has been loaded`. Final mutation:
  **22 killed, 0 survived, 0 uncovered.**
- **Removed a local test duplicate.** Extracted
  `assertOnlySelectedFeedLoaded` and folded the two default-mode tests into one
  table so DRY reports no candidate.

No production behavior changes were needed. The controller structure, injected
dependencies, and boundaries were accepted.

## Verification results

Record (pinned to the review commit `e4bda31256`):

| File | Component |
|------|-----------|
| `docs/reviews/feed-tabs-verification.json` | psf-memo-client |

- **Language mutation** (`mutate-file.sh src/services/feed-tabs-page.js
  --max-workers 8`, run twice: the differential pass selected 0 changed sites,
  so the wrapper auto-reran with `--mutate-all`): **22 killed, 0 survived,
  0 uncovered** (22 total/covered, 0 uncovered).
- **DRY** (`dry4javascript`, scoped to the changed production files and the
  changed unit/property tests): **no duplicate candidates found.** The first run
  flagged one local duplicate in the unit test file (two default-mode tests,
  score 1.00); removing it cleared the report. A broad whole-client DRY run was
  not needed and, per standing precedent, its pre-existing step-handler and
  test-setup boilerplate is not part of this task.
- **Cyclomatic complexity / CRAP** (`crap4javascript
  src/services/feed-tabs-page.js`): maximum **CRAP 5.0** at 100% coverage
  (`open` CC 5); `_isEmptyFollowing`/`_loadMode`/`_normalizeTab` CC 3; every
  other function CC ≤ 2. All functions are below the 6.0 target.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`), `psf-memo-client/specs/feed-tabs.feature`: **42 total,
  0 killed, 42 survived, 0 errors.** Every survivor is an intrinsic equivalent:
  a single-character case/character substitution of an example value
  (`followed_text`, `followed_txid`, `followee`, `other`, `other_text`,
  `other_txid`) used consistently on both the setup and assertion sides of its
  scenario, so the scenario still passes. This is the documented behavior for
  this read-only feature; no implementation gap is implied. `gherkin-mutator`
  wrote an `acceptance-mutation-manifest` with `"scenarios":[]` (each scenario
  has an equivalent survivor, so none is recorded) and no `# mutation-stamp`;
  committed as tool-written.

## Suite status

`verify.sh client` **result: pass** at `git_sha e4bda31256`:

- unit: **506 pass / 0 fail**
- property: **121 pass / 0 fail**
- acceptance: **all 37 generated suites passed**
- lint: ok
- build: ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- `git_handoff` to `coder` and `refactorer` (priority 00) with the review commit
  `e4bda31256` for follow-up review: the view now consumes `getState()`, and the
  default-mode tests were consolidated with added initial-state coverage; the
  rest is tool-written mutation and acceptance manifests.
