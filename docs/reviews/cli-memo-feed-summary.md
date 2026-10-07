# cli-memo-feed — Architect Review

**Task:** `cli-memo-feed` (R1: the first `psf-memo-cli` read command)
**Component:** `psf-memo-cli`
**Architect review commit:** `baf9ca2`
**Verification record:** `docs/reviews/cli-memo-feed-verification.json` (`git_sha` `baf9ca2`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `66bf26f` | specifier | Specify the memo-feed read command |
| `1b947ae` | coder | Implement the memo-feed read command (`src/lib/memo-feed.js`, `src/commands/memo-feed.js`, registration, acceptance steps, unit tests) |
| `9cbbae2` | refactorer | Share acceptance assertions via `assertEqual`; add memo-feed property tests |

The architect branch fast-forwarded `d78fb09 -> 9cbbae2`, then added review
commit `baf9ca2`.

## Architectural findings and fixes applied

1. **Command parsed its flags twice behind a dead return (fixed).** `run`
   called `validateFlags(flags)` and then `parseFeedFlags(flags)` separately,
   while `validateFlags` ignored its own parse result and returned a constant
   `true` that no caller used. `validateFlags` now returns the resolved page
   and `run` consumes it, so the flags are parsed exactly once and the dead
   `return true` is gone. This also removed the sole `true -> false` mutation
   site in the command (previously an untestable equivalent).

2. **Boundaries reviewed (sound).** `src/commands/memo-feed.js` is a thin
   wiring layer over the shared `runCommand` reporter (output/exit contract),
   the read-only `MemoDb` client, and the pure helpers in `src/lib/memo-feed.js`.
   Dependencies point inward to stable abstractions; the command is fully
   testable without network or wallet because `MemoDbClass`, `fetchImpl`, and
   the output streams are injected. No framework or persistence structure leaks
   across the boundary.

3. **Acceptance-handler refactor (good).** The refactorer replaced hand-rolled
   `if (...) throw new Error(...)` assertions in
   `acceptance/lib/steps/memo-feed.js` with the shared `assertEqual` helper,
   matching the convention set by the prior acceptance-consolidation pass and
   reducing local duplication without weakening the assertions.

4. **Test boundaries (good).** Unit/property tests stay out of the acceptance
   and mutation paths; property tests are a separate explicit command and are
   not part of the mutation/coverage baseline.

## Verification

**Language mutation** (`mutate4javascript`, differential with `--mutate-all`,
`--max-workers 8`), one file at a time:

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/commands/memo-feed.js` | 1 | 0 | 0 |
| `src/lib/memo-feed.js` | 8 | 0 | 0 |

The initial run left four survivors. Two were in `parseNonNegativeInteger`
(`< 0` constants and the empty/`null` fallback guard) and were killed by new
unit coverage for zero and for empty/`null` page flags — property tests do not
participate in the `npm test` mutation baseline, so they could not kill these.
The command's `true -> false` survivor was eliminated structurally by finding 1
above. All refreshed manifests are recorded in the sources.

**DRY** (`dry4javascript`, scoped to the changed production modules, the
memo-feed step handler, and the unit/property tests): **no duplicate candidates
found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-feed.feature`): **33 mutations, 27 killed, 6 survived, 0 errors**.
The 27 kills cover the `hasMore`, `txids`, and text/count example cells plus the
empty-feed scenario. The 6 survivors are intrinsic equivalents:

- `limit: 2 -> 6` and `limit: 5 -> 9` in Memo Feed - 2 — with `offset 4` only one
  post remains and the fixture has only five posts, so the reported page,
  total (5), and `hasMore` are unchanged for any sufficiently large limit.
- `limit: 1 -> 3` and `limit: 2 -> 4` in Memo Feed - 3 — the scenario asserts a
  single post (alpha / charlie) that is still present in the widened page.
- the two `viewer` address mutations in Memo Feed - 4 — the value is used
  consistently on both the setup and assertion sides, so the command passes the
  mutated value through and the request assertion matches it.

This is the documented read-only round-trip equivalent class; the tool-written
manifest records the single fully-killed scenario (Memo Feed - 5) and the
remaining scenarios are intentionally re-mutated on the next run.

**Suite status** (`verify.sh cli`, record `baf9ca2`): unit **157 passing /
100% statements-branches-functions-lines**, property **27 pass / 0 fail**,
acceptance **all 6 suites passed**, lint clean — **pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task `cli-memo-feed`;
  review commit `baf9ca2`.
- No follow-up work identified for the coder or refactorer.

By architect.
