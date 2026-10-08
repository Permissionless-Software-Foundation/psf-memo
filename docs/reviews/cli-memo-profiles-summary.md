# cli-memo-profiles — Architect Review

**Task:** `cli-memo-profiles` (R10: recent-profiles read command)
**Component:** `psf-memo-cli`
**Architect review commit:** `292dfa1c1b`
**Verification record:** `docs/reviews/cli-memo-profiles-verification.json`
(`git_sha` `292dfa1c1b`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `5d57910` | specifier | Specify memo-profiles (R10) recent-profiles read command (`specs/memo-profiles.feature`, 6 scenarios) |
| `3e31441` | coder | Implement the command (`src/lib/memo-profiles.js`, `src/commands/memo-profiles.js`, `MemoDb.getRecentProfiles`, acceptance steps, unit + property tests) |
| `9569671` | refactorer | Share the formatted-page read pipeline (`ListReadCommand`, `runOutcomeCommand`, `runPostsPageCommand` delegation) |

The architect branch fast-forwarded `850674c -> 9569671`, then added review
commit `292dfa1c1b` (mutation-survivor test fix, DB page-test consolidation,
and tool-written manifests).

## Architectural findings and fixes applied

1. **One read pipeline for formatted pages (good).** `runOutcomeCommand` in
   `src/lib/read-command.js` now owns validate -> read -> `{ message, data }`, and
   both `ListReadCommand` (formatted lists) and `runPostsPageCommand` (post
   pages) delegate to it. The duplicated pipeline code that previously lived in
   `post-page-command.js` is gone; the post-page function now only supplies the
   `formatFeedMessage` mapping.

2. **`ListReadCommand` captures the shared command scaffolding (good).**
   `memo-profiles`, `memo-topics`, and `memo-search` extend it and keep only
   their own `parseFlags`, `format`, and read method. The command wiring
   (`initReadCommand` / `createMemoDbClient` / method binding) stays in one
   place, with `memo-profiles` a thin wiring layer over the pure
   `src/lib/memo-profiles.js` helpers.

3. **Adapter stays consistent (good).** `MemoDb.getRecentProfiles` reuses the
   private `toQuery` builder, so the new route adds no query-serialization
   duplication. It is unit-covered and mutation-covered.

4. **Mutation survivor fixed.** The first mutation run left one survivor in
   `src/lib/memo-profiles.js` (`profile.name || '(unset)'`, `|| -> &&`): the
   existing assertion `assert.include(message, 'alice')` also matched the
   avatar URL and bio substrings, masking the missing name. Strengthened the
   unit test to pin the exact rendered segments
   (`addrA: alice, avatar ...` and `addrB: (unset), avatar ...`). Re-run: 4
   killed, 0 survived.

5. **DRY fix applied.** `dry4javascript` flagged the new `getRecentProfiles`
   unit tests as score-1.00 duplicates of the `getTopics` tests. Folded
   `getRecentProfiles` into the existing table-driven `default page` describe and
   merged the two limit/offset tests into a table-driven `paged list routes`
   describe. Re-run: only one duplicate remains (below).

6. **Accepted DRY boilerplate (documented, not chased).** The re-run reports a
   single score-1.00 pair between `src/commands/memo-profiles.js` and
   `src/commands/memo-topics.js`. After the `ListReadCommand` extraction this is
   the per-command variation glue (constructor, flag parser, formatter, reader)
   for two structurally identical lists; the route, formatter, and collection
   genuinely differ. Consistent with the process notes on layered-convention
   boilerplate, this is left as-is rather than moving formatting into
   constructor closures.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`). No survivors.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/list-command.js` | 0 | 0 | 0 |
| `src/lib/memo-profiles.js` | 4 | 0 | 0 |
| `src/commands/memo-profiles.js` | 0 | 0 | 0 |
| `src/lib/read-command.js` | 1 | 0 | 0 |
| `src/lib/memo-db.js` | 13 | 0 | 0 |
| `src/commands/memo-search.js` | 0 | 0 | 0 |
| `src/commands/memo-topics.js` | 0 | 0 | 0 |
| `src/lib/post-page-command.js` | 0 | 0 | 0 |

`read-command.js` selected 0 of 1 covered sites in differential mode
(`runOutcomeCommand` added) and `mutate-file.sh` reran it with `--mutate-all`.
The zero-site modules were confirmed structural (the run reported `Total
mutation sites: 0` with the functions still recorded in their manifests).

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, and the new/changed tests): after the consolidation
the DB test duplicates are gone; the only remaining pair is the accepted
`memo-profiles` / `memo-topics` command-class glue documented above.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-profiles.feature`): **33 mutations, 31 killed, 2 survived, 0
errors**. The 2 survivors are upward `limit` mutations in the pagination
outline (`$.scenarios[1].examples[2].limit: 2 -> 6` and
`$.scenarios[1].examples[3].limit: 5 -> 9`): the fake service slices the
5-profile fixture, so at the tail of the list a larger limit returns exactly the
same rows. These are fixture-masked intrinsic equivalents (a larger bound can
never change the result); documented, not chased. The tool wrote an
acceptance-mutation manifest recording `scenario[2]` (9 mutations) and
`scenario[3]` (8 mutations), all killed; the pagination scenario is
intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `292dfa1c1b`): unit **402 passing**,
property **81 pass / 0 fail**, acceptance **all 21 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-profiles`, commit `292dfa1c1b`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
