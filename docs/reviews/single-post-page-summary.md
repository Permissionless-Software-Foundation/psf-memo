# Architect review — `single-post-page`

**Role**: architect
**Task**: `single-post-page` (`psf-memo-client` only)
**Reviewed commits**: `8233188` (specifier, feature) → `419fdc8` (coder, the
`/posts/thread/<txid>` page) → `37f46f4` (merge coder into refactorer) →
`e19e47a4841f9e1717aa3b5bd8aa750746f43181` (refactorer, drop unused controller
state and add the property suite)
**Merge**: `8998c5b` (merge `e19e47a484` into `swarmforge-architect`)
**Review commit**: `0e20ebe6b1f452ac09ae69ad09f6cf4c6de10425`
**Verification record**: `docs/reviews/single-post-page-verification.json`
(`git_sha` `0e20ebe6b1…`, `branch` `swarmforge-architect`)

## Scope

The `/posts/thread/<txid>` single-post permalink page: a post's timestamp now
links to it and the shared post-options menu copies its absolute URL. The page
renders the root post plus its reply thread ten per page with a "Load more
replies" control, keeps the normal like/reply actions on the root and every
reply (replying to a reply targets that reply), shows "Post not found" for an
unknown txid, surfaces a failed request's error, and loads without a wallet.

## Architectural findings

- **UI/core separation is correct.** `src/services/single-post-page.js` is a
  pure controller over an injected `memoDb`/`copyToClipboard`/`origin`;
  `post-permalink.js` is a pure path builder; `post-time-link.js` is a plain
  React component shared by the browser and the acceptance adapter
  (`acceptance/lib/render-post-time-link.js`). The React page
  (`app-body/single-post/index.js`) is the thin adapter and follows the
  existing `new MemoDb()` page convention.
- **Fix applied — one source of truth for the permalink prefix.** The feature
  added `post-permalink.js` (`THREAD_PATH_PREFIX = '/posts/thread'`) but
  `thread-page.js` still hard-coded its own copy, and the acceptance router
  (`postsOnCurrentPage`) branches on both `ThreadPage.THREAD_PATH_PREFIX` and
  `SinglePostPage.THREAD_PATH_PREFIX`. I pointed `thread-page.js` at the
  canonical module so the two pages cannot silently diverge.
- **Fix applied — removed a DRY-reported local duplicate.** `dry4javascript`
  flagged two near-identical setups (score 0.86) in the new unit test file.
  Extracted `loadPageWithReplies(count)`; the scoped DRY run is now clean.
  (Broad pre-existing client boilerplate was left as documented in the
  process notes.)
- **Intentionally unchanged.** `SinglePostPage.flattenReplies` (replies only,
  pre-order) and `ThreadPage._flatten` (root plus replies) are genuinely
  different traversals; merging them would add coupling for five lines.
  `ReplyThreadPage.REPLY_THREAD_PATH` is unused but pre-existing and outside
  this task.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)
| File | Total | Selected | Killed | Survived |
|------|-------|----------|--------|----------|
| `src/services/single-post-page.js` | 31 | 31 | 31 | 0 |
| `src/components/post-feed/post-options-menu.js` | 8 | 8 | 8 | 0 |
| `src/services/post-options.js` | 10 | 10 | 10 | 0 |
| `src/services/thread-page.js` | 4 | 4 | 4 | 0 |

`post-options.js` and `thread-page.js` selected 0 under differential mode
(their changed lines carry no mutation operators); `mutate-file.sh` detected
the under-selection and re-ran all sites with `--mutate-all`. Structural zeros:
`post-permalink.js` and `post-time-link.js` (0 sites — template literals,
`??`, and ternaries only). Excluded, matching the `memo-db.js` precedent:
`post-feed-item.js`, `app-body/index.js`, `app-body/single-post/index.js` are
ESM + JSX and fail `BABEL_PARSER_SYNTAX_ERROR` under `node --test`. Every
changed site that the tool can mutate is killed (53/53).

### DRY (`dry4javascript`, scoped to the changed files)
```
No duplicate candidates found.
```

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)
| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/single-post-page.feature` | 53 | 14 | 39 | 0 |

The tool wrote a manifest recording scenario 7 (`2/2` killed) with a
`mutation-stamp`; scenarios with intrinsic survivors are re-mutated next run,
as designed. All 39 survivors are single-character case/substitution changes of
`Examples` values that are resolved on both the setup and assertion sides, so
the mutation cannot change the outcome: 26 `txid` values, 4 reply `message`
strings, 2 `error` strings, and 5 `served` reply counts that the fixed
assertions (`shows 10`, load-more monotonicity, or a consistently resolved
`<served>`) do not distinguish. These are intrinsic equivalents, not
implementation gaps.

### CRAP (`crap4javascript`, scoped, unit coverage)
Maximum CRAP 6.0 (`SinglePostPage.load`, CC 6 at 100% coverage); every function
is at or below the 8.0 threshold.

### Canonical suite (`verify.sh client`, at `0e20ebe6b1`)
| Command | Result |
|---------|--------|
| unit | 937 pass / 0 fail |
| property | 260 pass / 0 fail |
| acceptance | all 52 suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/single-post-page-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `single-post-page`, review commit `0e20ebe6b1`.
