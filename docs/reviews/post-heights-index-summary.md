# Review summary: post-heights-index

**Architect review of the refactorer handoff for task `post-heights-index`.**

## Commits reviewed
- `6a8cf6653e` (refactorer): "Refactor postHeights index code and add property tests" —
  deduplicated postHeights query iteration into a shared generator, extracted shared
  pagination parsing/enrichment and the idempotent create-if-missing write, added property
  tests for postHeight key round-trips and ordering in both `psf-memo-db` and
  `psf-memo-indexer`, exposed them via a separate `property` command.
- Merged into the architect worktree with the prior chain commits (specifier features,
  coder acceptance pipelines) that the refactorer branch carried.

## Architectural findings and fixes applied
The refactorer's module structure was sound (shared `lib/pagination.js`, generator
encapsulation of the secondary-index iteration, `createIfMissing` for idempotent writes).
I applied the following structural fixes:

- **Extracted `assemblePostPage`** into `psf-memo-db/src/use-cases/lib/pagination.js` and
  used it from `list-posts-by-addr` and `list-recent-posts`, removing the duplicated
  post-page assembly tail (attach-reply-counts + pagination object) flagged by DRY (0.84).
- **Extracted `ListUseCase`** base class into `psf-memo-db/src/use-cases/lib/use-case.js`
  and made the three list use cases extend it, removing the identical constructor
  validation boilerplate flagged by DRY at 1.00 across all three files.
- **Built the runner adapter** required by the APS `gherkin-mutator` for `psf-memo-db` and
  `psf-memo-indexer` (`acceptance/lib/runner-worker.js` in each). These route library
  stdout logging to stderr so the persistent worker's stdout carries only JSON responses.

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`, all covered sites)
Every changed source file is fully killed (0 survivors, 0 uncovered):
- `psf-memo-db/src/adapters/post-query.js` — 22/22 killed
- `psf-memo-db/src/use-cases/lib/pagination.js` — 13/13 killed
- `psf-memo-db/src/use-cases/lib/use-case.js` — 0 sites (constructor only)
- `psf-memo-db/src/use-cases/list-posts-by-addr.js` — killed
- `psf-memo-db/src/use-cases/list-recent-posts.js` — 0 sites (post-constructor)
- `psf-memo-db/src/use-cases/list-recent-profiles.js` — 9/9 killed
- `psf-memo-indexer/src/use-cases/action-types/post.js` — 2/2 killed

Tests added to kill all initially-surviving mutants: `parseLimit`/`parseOffset` boundary
values (1 and 100), `hasMore` exact-page boundaries, the `sortProfiles` `seen` tie-break
with falsy values, `scanPostsByAddrTxids`/`scanRecentPostTxids` limit boundary,
`txidFromPostHeight` with absent value, `loadPostsByTxids` `blockHeight` fallback, and the
`MAX_POST_SIZE` exact-boundary in the indexer.

### DRY (`dry4javascript`)
No duplicate candidates found on any changed source file.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions within threshold (max CC 6, CRAP ≤ 6.0). Highest:
`PostQuery.scanPostsByAddrTxids` CC 6 / CRAP 6.0; `handlePost` CC 4 / CRAP 4.8.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **psf-memo-db** `efficient-post-pagination.feature`: 45 mutations discovered, 27
  executed (1 scenario reused from an earlier fully-killed run, 18 skipped). 23 killed,
  **4 survived** — all `limit` example-value mutations (`2→6`, `3→7`, `3→11`, `3→5`).
  Documented equivalents: increasing `limit` above the fixture's post count produces the
  same accepted page because the scenarios assert the returned posts plus a "no more than
  limit" bound rather than an exact page size.
- **psf-memo-indexer** `efficient-post-indexing.feature`: 27 mutations executed, 5 killed,
  **22 survived** across `addr`, `height`, `text`, `txid`, `parentTxid`. The scenarios
  process a transaction with the example values and then assert those same values appear in
  the store, so any mutated input echoes back into the assertion (weak/tautological
  example-to-assertion connection). These are specifier-side feature-quality improvements.

## Suite status
- `psf-memo-db`: unit **58 passing**, property **3 passing**, acceptance **pass**.
- `psf-memo-indexer`: unit **29 passing**, property **2 passing**, acceptance **pass**.

## Handoffs sent
- `git_handoff` priority 00 to **coder** and **refactorer** (follow-up review of the
  architectural changes).
- No specifier handoff: no specification changes in this commit (the feature-file manifest
  churn is tool-generated metadata). The weak-scenario findings above are recorded here for
  the specifier in the durable report.

By architect.
