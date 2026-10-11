# Architect review — `memo-following-feed`

**Role**: architect
**Task**: `memo-following-feed` (AF1/R17, `psf-memo-cli` only)
**Reviewed commits**: `2af4690` (specifier, `memo-following-feed.feature` + docs) →
`03abf5e` (coder, viewer's Following feed) → `a8aa7d6` (merge coder into
refactorer) → `c734866` (refactorer, property coverage for the feed and the
shared renderer)
**Merge**: `0120330` `Merge refactorer memo-following-feed into architect`
**Review commit**: `87856e54c4` (tool-written manifests only)
**Verification record**: `docs/reviews/memo-following-feed-verification.json`
(`git_sha` `87856e54c454978c0536692ac790b0423e70b07a`)

## Scope

Adds the read-only `memo-following-feed` command: resolve the viewer's wallet
(`-n`/`--wif`), read one page of `GET /posts/following/:addr` from
`psf-memo-db` (the top-level posts, replies and the viewer's own posts
excluded, authored by the profiles the viewer follows, newest first), and
report the posts and the service pagination unchanged. It is the CLI mirror of
the web client's Following tab; the DB owns the follow-join, exclusion, and
ordering. A missing wallet source exits 2; a failed request exits 1. No
broadcast. The merged range also carries two specifier commits from `master`
(`ef335f2` adds `psf-memo-cli/SKILL.md`, `ec0a72f` queues AF1–AF3); neither is
part of the feature review.

## Architectural findings

- **Excellent reuse; no structural fix required.** The command extends the
  existing `ListReadCommand` and composes only shared pieces: `resolveWalletSource`
  for the `-n`/`--wif` boundary, `parseNonNegativeInteger` via
  `parseFollowingFeedFlags` for `--limit`/`--offset`, `MemoDb.getFollowingFeed` →
  the shared `getAddrPage` (same `encodeURIComponent`/query wiring as
  `getPostsByAddr` and `getNotifications`), and `formatFeedMessage` from
  `memo-feed.js` for rendering. Nothing was reimplemented.
- **Dependency direction and boundaries are clean.** The command depends only
  on lib modules; the wallet and HTTP boundaries stay injected (`walletUtil`,
  `MemoDbClass`, `fetchImpl`, `dbUrl`, `envUrl`), so the command is fully
  testable under Node with no wallet file or network. `getFollowingFeed` is one
  more one-line route method on the existing `MemoDb` boundary.
- **Flag validation and wallet resolution are correctly ordered.** `parseFlags`
  validates only the page flags up front; the wallet source is validated in
  `resolveWalletSource`, which throws the shared `UsageError`, so a missing
  wallet still exits 2 before any read while a bad `--limit`/`--offset` is
  rejected even earlier. The read method receives the parsed fields and the
  `--db-url` override through the shared `runOutcomeCommand` pipeline.
- **No duplication.** The page parser, feed renderer, and address-page client
  helper are all shared with the sibling commands; DRY reports no candidates.
- **Acceptance harness reuse.** The step handlers plug into the shared
  `acceptance/lib/read-command.js` runner and `read-result.js` assertions; only
  the following-feed fixture and the route branch were added to the world.

## Fixes applied

- No production or test change was needed; the refactorer's property coverage is
  thorough and every mutation site is already killed.
- **Recorded the tool-written manifests** for the changed modules
  (`memo-db.js` now including `getFollowingFeed`) and the `gherkin-mutator`
  stamp/manifest for `specs/memo-following-feed.feature`. No manifest was
  hand-edited.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/commands/memo-following-feed.js` | 3 | 3 | 3 | 3 | 0 |
| `src/lib/memo-following-feed.js` | 1 | 1 | 1 | 1 | 0 |
| `src/lib/memo-db.js` | 13 | 13 | 13 | 13 | 0 |

`memo-db.js` first under-selected (the added `getFollowingFeed` changed the
module hash), so `mutate-file.sh` reran it with `--mutate-all` and killed all
sites. **17/17 mutation sites killed, 0 survived.**

### DRY (`dry4javascript`, scoped to the changed files and their peers)

```
No duplicate candidates found.
```

Both the canonical scoped run and a lowered-threshold run
(`--min-lines 3 --min-nodes 12`) report no candidates.

### Cyclomatic complexity (`crap4javascript`, changed `src/` files)

All functions are 100% covered and below the CRAP threshold of 8.0; the highest
are `MemoDb.getJson` (CC 5), `toQuery` (CC 4), and
`MemoFollowingFeed.parseFlags` (CC 3), all CRAP ≤ 5.0. Exit code 0.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/memo-following-feed.feature` | 31 | 31 | 0 | 0 |

No survivors and no intrinsic equivalents. The tool-written stamp and manifest
are committed as-is.

### Canonical suite (`verify.sh cli`, at `87856e54c4`)

| Command | Result |
|---------|--------|
| unit | 674 passing |
| property | 147 pass / 0 fail |
| acceptance | all 43 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record:
`docs/reviews/memo-following-feed-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `memo-following-feed`, review commit `87856e54c4`.
