# cli-follow-mute — Architect Review

**Task:** `cli-follow-mute` (W7/W8: `memo-follow`, `memo-unfollow`, `memo-mute`, `memo-unmute`)
**Component:** `psf-memo-cli`
**Architect review commit:** `a53d471595`
**Verification record:** `docs/reviews/cli-follow-mute-verification.json`
(`git_sha` `a53d471595`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's four feature specs,
the coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `8ca7316` | specifier | Specify memo-follow, memo-unfollow, memo-mute, memo-unmute (W7/W8) (`specs/memo-{follow,unfollow,mute,unmute}.feature`, 5 scenarios each) |
| `8455a05` | coder | Implement the four commands (`src/lib/address-write-command.js`, `addressHash160FlagParser`, four command declarations, acceptance steps, unit/property tests) |
| `7615def` | refactorer | Add the address write-command property tests |

The architect branch fast-forwarded `b7686b1 -> 7615def`, then added review
commit `a53d471595` (table-driven address-command unit tests, DRY fix,
tool-written manifests and feature mutation manifests).

## Architectural findings and fixes applied

1. **Single address-write factory (good).** `defineAddressWriteCommand`
   composes `defineFieldWriteCommand` with an `-a` hash160 parser, so
   `memo-follow`, `memo-unfollow`, `memo-mute`, and `memo-unmute` declare only
   `prefix`, `missingMessage`, and `verb`. The whole validate -> resolve wallet
   -> decode address -> broadcast -> report pipeline stays in one place.

2. **Address decoding at the boundary (good).** `addressHash160FlagParser` in
   `address-flag.js` reuses `parseAddressFlag` and decodes through the shared
   `addressToHash160` (display order, never byte-reversed), wrapping decoder
   errors as `UsageError` so a malformed address is a clean exit-2 usage error
   with no broadcast.

3. **Mutation sites are all in covered helpers.** The four command modules and
   `address-write-command.js` have zero mutation sites; the only logic is the
   already-covered `wire-encoding.js` / `address-flag.js` path. The
   cross-checked `addr`/`hash160` acceptance fixtures and the random-address
   property test exercise the decode.

4. **DRY fix applied.** The four per-command unit-test files were identical
   parallel wrappers (six score-1.00 pairs), and `address-flag.unit.js` repeated
   its try/catch error block. Replaced them with one table-driven
   `test/unit/commands/address-commands.unit.js` over the shared
   `defineAddressCommandTests`, and rewrote the flag test to use the shared
   `captureUsageError`. Scoped DRY re-run: **no duplicate candidates found.**

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`). No survivors; every changed file reports `Total mutation sites: 0` (the
address-write logic lives in already-covered helpers).

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/address-write-command.js` | 0 | 0 | 0 |
| `src/lib/address-flag.js` | 0 | 0 | 0 |
| `src/commands/memo-follow.js` | 0 | 0 | 0 |
| `src/commands/memo-unfollow.js` | 0 | 0 | 0 |
| `src/commands/memo-mute.js` | 0 | 0 | 0 |
| `src/commands/memo-unmute.js` | 0 | 0 | 0 |

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance modules, the shared test helper, and the consolidated unit/property
tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on each of the four features): each feature reports **8 mutations, 4 killed, 4
survived, 0 errors**. The 4 kills per feature are the `addr` and `hash160`
example mutations (the mutated value no longer matches the real decode on the
other side). The 4 survivors are intrinsic equivalents: `txid` and `error`
single-character case changes are used on both the setup and assertion side. The
tool wrote an acceptance-mutation manifest to each feature recording the killed
scenarios.

**Suite status** (`verify.sh cli`, record `a53d471595`): unit **530 passing**,
property **105 pass / 0 fail**, acceptance **all 32 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-follow-mute`, commit `a53d471595`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
