# Architect review — `account-posts-feed`

**Role**: architect
**Task**: `account-posts-feed` (client-only, `psf-memo-client`)
**Reviewed commits**: `3200e27` (specifier, spec) → `166b998` (coder) → `cb45bfa8f8`
(refactorer)
**Merge**: `e789bd2efa` (refactorer `swarmforge-refactorer` → `swarmforge-architect`)
**Review commit**: `af512e581c` (killed reply-count default mutant + manifests)
**Verification record**: `docs/reviews/account-posts-feed-verification.json`
(`git_sha` `af512e581c5ed48ae3520688c3dab21301e4ee7b`)

## Scope

Show the authenticated account's own Memo posts below the account controls on
`/account`, rendered like the `/profile/:addr` feed. The task adds the feed
component and its Node acceptance adapter, extends `AccountPage` with post
loading/pagination, extracts a testable reply-count view model, and adds the
`account-posts-feed.feature` spec plus unit/property/acceptance coverage. It is
a client-only read feature that broadcasts no Memo action.

## Architectural findings

- **Reply-count view model extraction is correct.** The refactorer moved every
  branch (singular/plural label, class names, tooltip, accessible name, keyboard
  activation, interactive props) out of the JSX component into the pure
  `src/services/reply-count.js`. `reply-count-view.js` is now a thin
  `React.createElement` wrapper and the browser entry `index.js` re-exports it.
  This is exactly the UI/core separation the role asks for: the branching is
  unit-testable and the view is branch-free. Existing consumers
  (`profile/index.js`, `post-thread-node.js`) keep using `PostReplyCount`
  unchanged.
- **The account feed reuses the profile card pieces.** `account-posts-feed.js`
  composes `ProfilePostContent`, `ProfilePostLike`, `PostOptionsMenu`, and
  `ReplyCountView` — the same building blocks as the profile feed — satisfying
  the spec's "same post card" requirement at the component level, written in
  `createElement` form so it is Node-renderable by the acceptance adapter.
- **Dependency direction holds.** `AccountPage` receives `memoDb` by injection,
  so the controller stays free of network/axios concerns while `MemoDb` remains
  the adapter. The feed component is presentational (plus the pure
  `selectLikeState`).
- **Pagination contract verified end to end.** `MemoDb.getPostsByAddr`
  delegates to `getPage` (`/posts/by/:addr`), and the DB's
  `use-cases/lib/pagination.js` returns `pagination.hasMore`. The component's
  Next-button enablement therefore works against the real client, not only the
  acceptance fake.
- **Information hiding is preserved.** The reply-count view model exposes only
  derived attributes; the non-interactive branch nulls `role`, `tabIndex`,
  `onClick`, and `onKeyDown` so the element is inert to pointer and keyboard
  input.
- **Accepted, not changed.** The `AccountPostCard` wrapper intentionally differs
  from the profile page's inline `Card` (the account card omits the seen/block
  meta and uses a `div.card`), but the card contents are the same shared
  components; `dry4javascript` reports no duplicate candidates, so a broader
  card extraction was not warranted. The account card also forwards
  `wallet`/`profiles` to `ProfilePostLike`, which ignores them — harmless.
  The ESM/JSX shells (`post-reply-count/index.js`, `account/index.js`) are not
  mutation-testable (the tool has no JSX parser plugin) and are covered by the
  acceptance suite, consistent with the established boundary.

## Fixes applied

- **Killed a survivor.** The differential mutation run left `count = 0 -> 1`
  alive in `reply-count-view.js`: every suite passed an explicit count, so the
  default was never exercised. Added a unit test that renders `ReplyCountView`
  with no count and asserts `0` / `"0 replies"`; the re-run is 1/1 killed.
- **Manifests.** Recorded `mutate4javascript` manifests for `reply-count.js`,
  `reply-count-view.js`, `account-posts-feed.js`, and the changed
  `account-page.js` (function set grew, so the run used `--mutate-all`), plus the
  `gherkin-mutator` manifest for `specs/account-posts-feed.feature`
  (empty scenarios by design — every scenario retains an intrinsic survivor).

## Verification

### Language mutation (`mutate4javascript`, one file at a time, `--mutate-all --max-workers 8`)

| File | Covered | Killed | Survived | Uncovered |
|------|---------|--------|----------|-----------|
| `src/services/reply-count.js` | 4 | 4 | 0 | 0 |
| `src/components/post-reply-count/reply-count-view.js` | 1 | 1 | 0 | 0 |
| `src/components/app-body/account/account-posts-feed.js` | 2 | 2 | 0 | 0 |
| `src/services/account-page.js` | 39 | 39 | 0 | 0 |

Total **46 killed, 0 survived, 0 uncovered**. `account-page.js` used
`--mutate-all` because new functions were added (differential would have
selected only 19 of 39).

### DRY (`dry4javascript`, scoped to the changed modules, tests, and adapter)

**No duplicate candidates found.**

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`specs/account-posts-feed.feature`: **12 mutations, 4 killed / 8 survived / 0
errors**. All survivors are intrinsic equivalents:

| IDs | Reason |
|-----|--------|
| m2, m6 | single-char `txid` substitution used self-consistently on the serve and assert sides |
| m9–m12 | single-char `txid` substitution, self-consistent across serve/click/assert |
| m3, m7 | case flip of the `url` value in a negative "does not show the raw URL" assertion |

The core embed-rendering mutations were killed: **m1** (text `https` case) and
**m5** (text `Watch` case) for the YouTube link, and **m4**/**m8** (video id
case) for the embed identity.

### CRAP / cyclomatic complexity (`crap4javascript`)

All changed functions are 100% covered. Highest: `AccountPage.loadPosts`
(CC 5, CRAP 5.0); `AccountPage._getProfileField`/`getTruncatedAddress` CC 4;
`AccountPostCard`, `AccountPostsFeed`, and all `reply-count` functions CC ≤ 2.
Exit 0 (threshold 8.0).

### Canonical suite (`verify.sh client`, at `af512e581c`)

| Command | Result |
|---------|--------|
| unit | 806 pass / 0 fail |
| property | 219 pass / 0 fail |
| acceptance | all 49 acceptance suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/account-posts-feed-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `account-posts-feed`, commit `af512e581c`.
