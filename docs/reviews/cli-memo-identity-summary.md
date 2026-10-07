# cli-memo-identity — Architect Review

**Task:** `cli-memo-identity` (R15: report the wallet's own Memo identity)
**Component:** `psf-memo-cli`
**Architect review commit:** `a403a53`
**Verification record:** `docs/reviews/cli-memo-identity-verification.json` (`git_sha` `a403a53`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `6a11880` | specifier | Specify the memo-identity read command |
| `5d887bc` | coder | Implement the memo-identity read command (`src/lib/memo-identity.js`, `src/commands/memo-identity.js`, `MemoDb.getName`/`getProfilePic`, registration, acceptance steps, unit tests) |
| `640f9f6` | refactorer | Share the `assertUsageError` acceptance helper across the read features; add identity property tests |

The architect branch fast-forwarded `a9aa65a -> 640f9f6`, then added review
commit `a403a53`.

## Architectural findings and fixes applied

1. **Composition over a new abstraction (good, accepted).** `memo-identity` is
   the first read command that also needs a wallet. It composes the shared
   `read-command.js` scaffolding with the shared `wallet-source.js` resolver and
   the pure `memo-identity.js` helpers (BCH summing, sats→BCH, token-UTXO
   collection, summary), rather than growing the read-command module with
   wallet concerns. The `WalletUtil` is injected so the command stays testable
   without a wallet file or network.

2. **Independent reads fan out, missing data defaults locally (good).**
   `readProfile` issues the name, profile-text, and avatar requests with
   `Promise.all`, then normalizes a missing document to an empty field
   (`doc?.field || ''`). A transport failure still propagates as exit 1. The
   merge of wallet-derived and profile-derived data happens at the command
   boundary.

3. **Shared acceptance usage assertion (good).** The refactorer added
   `assertUsageError` to `acceptance/lib/read-command.js` and routed
   memo-identity, memo-thread, and memo-get-post through the shared read-command
   assertions, removing the last local stderr parsing and duplicated
   exit-code/message shells.

4. **Duplicated level-resource tests consolidated (fixed).** `dry4javascript`
   flagged the newly added `MemoDb.getName` and `getProfilePic` tests as
   structurally identical (and the existing 404 tests as identical).
   Extracted local `requestLevelResource(method, addr, path, body)` and
   `assertMissingResource(method, arg)` helpers and table-drove the two
   resource families; DRY is now clean.

## Verification

**Language mutation** (`mutate4javascript`, `--mutate-all`, `--max-workers 8`),
one file at a time:

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/commands/memo-identity.js` | 5 | 0 | 0 |
| `src/lib/memo-identity.js` | 10 | 0 | 0 |
| `src/lib/memo-db.js` | 4 | 0 | 0 |

The manifest-only source diffs are the tool-written refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
read-command/step modules, and unit/property tests): initially flagged the
`getName`/`getProfilePic` test pairs; after consolidation the re-run is **no
duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-identity.feature`): **26 mutations, 12 killed, 14 survived,
0 errors**. The 12 kills are the cross-cell balance mutations (`sats`/`bch` and
`utxos`/`balances`) where mutating one side alone breaks the computed-vs-reported
assertion. The 14 survivors are intrinsic equivalents: each `addr`, `name`,
`bio`, and `url` cell is used on both the setup and assertion sides of its
scenario (the wallet address drives both the resolved address and the profile
lookups). The tool wrote the expected empty `"scenarios":[]` manifest; those
scenarios are intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `a403a53`): unit **211 passing**,
property **42 pass / 0 fail**, acceptance **all 10 suites passed**, lint clean —
**pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task `cli-memo-identity`;
  review commit `a403a53`.
- No follow-up work identified for the coder or refactorer.

By architect.
