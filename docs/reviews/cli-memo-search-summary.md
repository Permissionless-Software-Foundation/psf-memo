# cli-memo-search — Architect Review

**Task:** `cli-memo-search` (R9: full-text search read command)
**Component:** `psf-memo-cli`
**Architect review commit:** `2cd80790da`
**Verification record:** `docs/reviews/cli-memo-search-verification.json`
(`git_sha` `2cd80790da`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `955ca55` | specifier | Specify memo-search (R9) full-text search read command (`specs/memo-search.feature`, 7 scenarios) |
| `3c2b375` | coder | Implement the command (`src/lib/memo-search.js`, `src/commands/memo-search.js`, `MemoDb.search`, acceptance steps, unit + property tests) |
| `76f37f7` | refactorer | Share the memo-db query builder (`toQuery`) and the flag-violation test helpers |

The architect branch fast-forwarded `085e873 -> 76f37f7`, then added review
commit `2cd80790da` (tool-written mutation manifests and the acceptance-mutation
manifest).

## Architectural findings and fixes applied

1. **Layering matches the established read-command pattern (good).** The pure
   `src/lib/memo-search.js` owns the required `-q` query, the page defaults, the
   blank-query empty page, and the human-readable summary; `src/commands/memo-search.js`
   is a thin wiring layer over the shared `initReadCommand` / `runReadCommand`
   plumbing; the `/search` route lives in the read-only `MemoDb` adapter. Core
   rules are testable without IO.

2. **Shared query builder removes adapter duplication (good).** The refactorer's
   private `toQuery` helper in `src/lib/memo-db.js` replaces the repeated
   `URLSearchParams` wiring in `getRecentPosts`, `getAddrPage`, `getFollowState`,
   `getTopics`, `getTopicPosts`, and `search`. It is module-private (not
   exported), so it hides the serialization detail, and it drops `null`/
   `undefined` so the optional viewer is omitted uniformly. A side effect is that
   `getFollowState` no longer serializes `undefined` arguments; that is the more
   correct behavior and is covered by the suite.

3. **Tests stay separate from helpers (good).** `test/support/usage-error.js`
   holds the shared `captureUsageError` / `assertPageFlagViolations` assertions,
   and the acceptance step handlers reuse the shared `read-result` helpers
   (`findReportedItem`, `findReportedPost`, `assertReportedField`) with
   regex-captured parameters.

4. **No structural fix required.** The post/profile line rendering in
   `formatSearchMessage` is intentionally not `formatPageSummary`, because the
   search summary interleaves the two collections before the pagination line.
   No local duplication remained after the shared query builder; the scoped DRY
   run reported no candidates.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`). No survivors; `--scan` confirmed the command module is structurally empty
(`Total mutation sites: 0`, `Manifest exists: true`).

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-search.js` | 5 | 0 | 0 |
| `src/commands/memo-search.js` | 0 | 0 | 0 |
| `src/lib/memo-db.js` | 12 | 0 | 0 |

`memo-db.js` first selected 9 of 12 covered sites in differential mode
(function-set change), and `mutate-file.sh` reran it with `--mutate-all` to kill
all 12. The mutation suite runs `npm test` (unit only), so the property tests do
not contribute kills.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, and the new/changed unit and property tests): **no
duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-search.feature`): **22 mutations, 20 killed, 2 survived, 0
errors**. The 20 kills are the pagination `limit`/`offset`/`txids`/`hasMore`
mutations and the reported post/profile field mutations. The 2 survivors are
single-character case mutations of the `scenario[3]` viewer addresses
(`$.scenarios[3].examples[0].viewer`, `$.scenarios[3].examples[1].viewer`);
each mutated address is used consistently on both the request and the
query-parameter assertion side of the scenario, so these are intrinsic
equivalents. The tool wrote an acceptance-mutation manifest recording
`scenario[2]` (16 mutations) and `scenario[4]` (4 mutations), all killed; the
viewer scenario is intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `2cd80790da`): unit **389 passing**,
property **76 pass / 0 fail**, acceptance **all 20 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-search`, commit `2cd80790da`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
