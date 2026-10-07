# cli-memo-topics — Architect Review

**Task:** `cli-memo-topics` (R7: the topic list read command)
**Component:** `psf-memo-cli`
**Architect review commit:** `ccb7ab8702`
**Verification record:** `docs/reviews/cli-memo-topics-verification.json`
(`git_sha` `ccb7ab8702`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `216041d` | specifier | Specify the memo-topics read command (`specs/memo-topics.feature`, 5 scenarios) |
| `def117e` | coder | Implement the command (`memo-topics.js` lib + command, shared `page-summary.js`, `MemoDb.getTopics`, acceptance steps, unit + property tests) |
| `f26a679` | refactorer | Add `formatPageSummary`, route the three paged summaries through it, fix the acceptance step's misnamed local import binding |

The architect branch fast-forwarded `b6d7fac -> f26a679`, then added review
commit `ccb7ab8702` (tool-written manifests; no manual code changes were
required this time).

## Architectural findings and fixes applied

1. **Shared paged summary renderer (good).** `page-summary.js` now owns
   `formatReadCount`, `formatPagination`, and the new `formatPageSummary(items,
   noun, formatItem, pagination)`. `memo-feed`, `memo-notifications`, and
   `memo-topics` share the count -> per-item lines -> pagination skeleton and
   supply only their noun and item formatter. This is a cleaner seam than the
   earlier `formatReadCount` + `formatPagination` pair, which still left the
   loop duplicated.

2. **Thin topics command (good).** `MemoTopics` is a constructor plus
   `run`/`validateFlags`/`createClient`/`readTopics`; the pure `memo-topics.js`
   owns the page defaults and the summary, and the route stays in
   `MemoDb.getTopics`.

3. **Naming fix (good).** The coder's acceptance step imported the command as a
   local binding named `MemoTimes`. It was functionally identical (the default
   export is the `MemoTopics` class), but the misleading name is corrected to
   `MemoTopics`.

4. **No manual fixes needed.** The first `--mutate-all` pass left no survivors,
   and the scoped `dry4javascript` run reported no duplicate candidates, so the
   review commit contains only the tool-written manifests and the acceptance
   mutation manifest.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` for the new/changed modules). No survivors; a follow-up
`--scan` confirmed `Changed mutation sites: 0` and `Manifest exists: true` for
all six.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/page-summary.js` | 1 | 0 | 0 |
| `src/lib/memo-topics.js` | 1 | 0 | 0 |
| `src/commands/memo-topics.js` | 0 | 0 | 0 |
| `src/lib/memo-db.js` | 6 | 0 | 0 |
| `src/lib/memo-feed.js` | 2 | 0 | 0 |
| `src/lib/memo-notifications.js` | 1 | 0 | 0 |

The mutation suite runs `npm test` (unit only), so the property tests do not
contribute kills. The source diffs in the review commit are the tool-written
refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, and the new unit/property tests): **no duplicate
candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-topics.feature`): **28 mutations, 26 killed, 2 survived, 0
errors**. The 26 kills are the page `limit`/`offset`/`rooms`/`hasMore` mutations
that change the returned page and the per-topic room/lastSeen/post/follower
mutations. The 2 survivors are intrinsic equivalents: `scenario[2]` limit
`2 -> 6` (offset 4) and `scenario[3]` limit `5 -> 9` (offset 0) do not change
the observable page because the five-topic fixture is exhausted. The tool wrote
a manifest recording `scenario[2]` (all 12 mutations killed); the survivor
scenarios are intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `ccb7ab8702`): unit **357 passing**,
property **65 pass / 0 fail**, acceptance **all 18 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-topics`, commit `ccb7ab8702`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
