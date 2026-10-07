# cli-memo-like — Architect Review

**Task:** `cli-memo-like` (W3: broadcast a 0x6d04 Memo like, with an optional tip)
**Component:** `psf-memo-cli`
**Architect review commit:** `4a7917472f`
**Verification record:** `docs/reviews/cli-memo-like-verification.json`
(`git_sha` `4a7917472f`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `ab2a867` | specifier | Specify the memo-like write command (`specs/memo-like.feature`, 10 scenarios) |
| `26a2994` | coder | Implement the memo-like write command (`src/lib/memo-like.js`, `src/commands/memo-like.js`, acceptance steps, unit + property tests, shared balance step) |
| `5022843` | refactorer | Extract `parseTxidBytesFlag` into `txid-flag.js`, split `parseTip`/`assertTipInRange`, add a no-value-field UTXO case |

The architect branch fast-forwarded `89fe739 -> 5022843`, then added review
commit `4a7917472f` (mutation-killing tests, shared command-test bodies, and
tool-written manifests).

## Architectural findings and fixes applied

1. **Write-command scaffolding reused (good).** `memo-like` is a thin shell over
   `initWriteCommand`/`runWriteCommand`; it supplies only its flag parser,
   0x6d04 prefix, `post` field/tip builder, and message formatter. The pure
   `src/lib/memo-like.js` owns the tip window (600-sat dust floor, 1-BCH
   maximum), the post-txid decode, the spendable-sat math, and the summary, with
   no IO or framework dependency.

2. **Shared txid decode extracted (good).** `parseTxidBytesFlag` in
   `txid-flag.js` now owns the required `-t` resolve-and-decode that
   `memo-reply` and `memo-like` both performed inline, and converts malformed
   txids to `UsageError` before any broadcast. This removes a real duplication
   without changing the error contract.

3. **Parse/range split (good).** `parseTip` (numeric parse) and
   `assertTipInRange` (dust..maximum window) are now separate, lowering the
   `parseTip` CRAP from 9.0 to 6.0 and making each concern independently
   testable.

4. **Dependency direction and information hiding (good).** The command depends
   inward on the pure helper and shared adapters; `walletUtil`, `broadcast`,
   `stdout`, and `stderr` are injected. `memo-like.js` exports only the prefix,
   the three tip constants, `parseLikeFlags`, `spendableSats`, and
   `formatLikeMessage`. The optional tip rides the existing `bchOutput` seam of
   the broadcast scaffolding.

5. **Mutation hardening (fix applied).** The first `--mutate-all` pass left 7
   survivors. Four were real gaps and are now killed:
   - `parseTip` `tipSats < 0 -> <= 0` and `0 -> 1` — needed a numeric-zero /
     empty-string tip test (`tip: '0'`, `0`, `''`, `null`).
   - `assertTipInRange` `tipSats > MAX -> >=` — needed a tip of exactly
     `MAX_TIP_SATS` (accepted) test.
   - `MemoLike.post` `tipSats > spendable -> >=` — needed a tip equal to the
     spendable balance (allowed) test.

6. **DRY fix applied.** `dry4javascript` flagged four score-1.00 duplicates: a
   within-file pair of tip tests and three cross-file blocks between the
   command unit tests (`surfaces the wallet broadcast error`, `prints the txid
   and explorer link in human mode`, `validates the flags without broadcasting`).
   Extracted those three shared test bodies into
   `test/support/write-command-unit.js` (`assertBroadcastErrorSurfaces`,
   `assertHumanMode`, `assertValidatesFlags`, plus the existing
   `assertUsageError`), and table-drove the tip tests. `memo-post` and
   `memo-reply` command tests were routed through the same helpers so the
   duplication is removed at the source. Re-run: no duplicate candidates.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`). New modules and the changed `txid-flag.js` ran with `--mutate-all`;
`memo-reply.js` ran differentially. After the killing tests were added, the
`memo-like` modules were re-run with `--mutate-all`. A final `--scan` confirmed
`Changed mutation sites: 0` and `Manifest exists: true` for all four.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-like.js` | 17 | 2 (equivalent) | 0 |
| `src/commands/memo-like.js` | 4 | 1 (equivalent) | 0 |
| `src/lib/txid-flag.js` | 0 | 0 | 0 |
| `src/lib/memo-reply.js` | 2 | 0 | 0 |

Baseline c8 coverage is 100% for both new `memo-like` modules. The three
remaining survivors are intrinsic equivalents and are documented here:

- `src/lib/memo-like.js` line 63 `tipSats > 0 -> > 1`: `assertTipInRange`
  guarantees `tipSats` is either 0 or at least `DUST_TIP_SATS` (600), so the two
  comparisons are identical for every reachable value.
- `src/commands/memo-like.js` line 60 `tipSats > 0 -> > 1`: the same invariant
  holds after `parseLikeFlags`.
- `src/lib/memo-like.js` line 29 (second `||` -> `&&`): JavaScript precedence
  makes the mutant `A || (B && C3)`; it differs from the original only for a
  literal `null`/`''` tip, where `Number(null)`/`Number('')` is `0` and the
  function still returns 0. No test can distinguish it.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, the support helper, and the unit/property tests):
initially flagged the four duplicate blocks; after extraction the re-run
reports **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-like.feature`): **36 mutations, 10 killed, 26 survived, 0
errors**. The 10 kills are the observable class-boundary and error-value
mutations — `scenario[0]` balance `3000 -> 2992` (drops below the dust floor),
`scenario[2]` tip `100000001 -> 100000000` (crosses to the accepted maximum) and
the five tip/txid error strings, `scenario[6]` balance `2999 -> 3005` (crosses to
a spendable balance), and the two `scenario[5]` malformed-txid error strings.
The 26 survivors are intrinsic equivalents: self-consistent example values used
on both the setup and assertion sides (post txids, return txids, tip amounts,
injected broadcast errors), and values mutated within the same equivalence class
(balances still above the dust floor / below the tip, tips still inside or
outside the dust window, malformed txids still malformed). The tool wrote an
empty `"scenarios":[]` manifest because every scenario retained at least one
survivor; those scenarios are intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `4a7917472f`): unit **274 passing**,
property **48 pass / 0 fail**, acceptance **all 13 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-like`, commit `4a7917472f`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
