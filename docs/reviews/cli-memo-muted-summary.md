# cli-memo-muted — Architect Review

**Task:** `cli-memo-muted` (R12: muted-list read command)
**Component:** `psf-memo-cli`
**Architect review commit:** `265618da20`
**Verification record:** `docs/reviews/cli-memo-muted-verification.json`
(`git_sha` `265618da20`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `71f3e19` | specifier | Specify memo-muted (R12) muted-list read command (`specs/memo-muted.feature`, 4 scenarios) |
| `97ca3e8` | coder | Implement the command (`src/commands/memo-muted.js`, `MemoDb.getMuted`, acceptance steps, unit + property tests) |
| `a27c17d` | refactorer | Share the wallet-list command pipeline (`src/lib/wallet-list-command.js`, `memo-following` migrated to the factory) |

The architect branch fast-forwarded `9bffb8a -> a27c17d`, then added review
commit `265618da20` (dead-alias removal, tool-written manifests and the feature
mutation stamp).

## Architectural findings and fixes applied

1. **Wallet-list command factory (good).** `defineWalletListCommand` in
   `src/lib/wallet-list-command.js` owns the wallet-scoped address-list pipeline
   (flag normalization, wallet resolution, unpaginated summary, reporter
   plumbing). `memo-muted` and `memo-following` are now pure declarations of
   `readMethod` / `clientMethod` / `listField` / `label`, so the two commands
   cannot drift apart.

2. **Reused pure helpers and adapter (good).** `follow-list.js` supplies the
   shared `parseWalletSourceFlags` and `formatFollowListMessage`;
   `list-command.js` supplies the read scaffolding; `MemoDb.getMuted` only
   percent-encodes the address and adds no query wiring.

3. **Dead alias removed.** The refactorer left `parseFollowingFlags` as a
   thin alias of `parseWalletSourceFlags`, but production now routes exclusively
   through `parseWalletSourceFlags` (the factory). Removed the unused export and
   its now-redundant unit/property tests; `follow-list.js` keeps only
   `parseWalletSourceFlags`, `parseFollowersFlags`, and `formatFollowListMessage`.

4. **Acceptable factory shape.** The factory returns an anonymous class; this is
   the right trade-off for two commands that are otherwise identical
   declarations, and the shared base keeps dependencies pointing inward.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` where differential under-selected). No survivors.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/wallet-list-command.js` | 2 | 0 | 0 |
| `src/commands/memo-muted.js` | 0 | 0 | 0 |
| `src/commands/memo-following.js` | 0 | 0 | 0 |
| `src/lib/follow-list.js` | 3 | 0 | 0 |
| `src/lib/memo-db.js` | 13 | 0 | 0 |

`follow-list.js` and `memo-db.js` reran with `--mutate-all` after the function
set / test changes; the command modules with zero sites are structural
(declarations only).

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance modules, the shared test helper, and the changed unit/property
tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-muted.feature`): **4 mutations, 4 killed, 0 survived, 0 errors**
(the `muter`/`muted` example cells). The tool wrote an acceptance-mutation
manifest recording `scenario[1]` (all killed) plus a `# mutation-stamp`.

**Suite status** (`verify.sh cli`, record `265618da20`): unit **431 passing**,
property **91 pass / 0 fail**, acceptance **all 24 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-muted`, commit `265618da20`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
