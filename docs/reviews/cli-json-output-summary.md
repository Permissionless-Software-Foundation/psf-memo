# Architect review — `cli-json-output`

**Role**: architect
**Task**: `cli-json-output` (AF2, `psf-memo-cli` only)
**Reviewed commits**: `b8b892c` (specifier, `cli-json-output.feature` + docs) →
`8a2df93` (coder, `--json` on wallet/send/signing commands) → `e34d34b` (merge
coder into refactorer) → `27e7bd9` (refactorer, shared command wiring + balance
renderer split)
**Merge**: `f819ebe` `Merge refactorer cli-json-output into architect`
**Review commit**: `8aa7669e80` (dead injection removed, wallet-list hardened,
survivor tests)
**Verification record**: `docs/reviews/cli-json-output-verification.json`
(`git_sha` `8aa7669e802fe34a31e9aa94d14b22646cddae21`)

## Scope

Extends the shared F5 output contract to the wallet, send, and signing commands
(which previously printed human text only and swallowed errors, exiting 0).
After this feature every `psf-memo-cli` command supports `--json`: exactly one
JSON object on stdout, usage errors exit 2, runtime errors exit 1 with
`{ "error": "<message>" }` on stderr in JSON mode; human output is unchanged;
key material is never printed. Only `psf-memo-cli` is touched.

## Architectural findings

- **The refactorer's shared wiring is sound and removes real duplication.** The
  nine touched commands now declare only their collaborators and delegates:
  `initCommand`/`initWalletCommand` (`init-command.js`) own stream capture,
  dependency assignment, and method binding; `runSendCommand` (`send-command.js`)
  owns the validate → wallet → send → explorer-link pipeline for `send-bch` and
  `send-tokens`; `requireFlag`/`validateRequiredFlags` (`flag-validator.js`) own
  the ordered required-flag rules while preserving each command's original
  message and reporting order. Dependency direction stays inward and the
  `runCommand` reporter remains the single output/exit-code boundary.
- **The balance renderer was correctly split out.** `src/lib/wallet-balance.js`
  now holds `summarizeBalance`/`formatBalanceMessage` (with the baton typing),
  leaving the command a thin wiring layer. It reuses the shared
  `getTokenBalances`.
- **Secret hygiene is preserved.** Each command's JSON `data` carries only
  public fields (addresses, balances, txid/explorer link, signature, wallet
  name/description); no mnemonic, WIF, or private key is exposed, and the
  existing secret-hygiene acceptance suite still passes.
- **Two local issues found and fixed.**
  - `WalletBalance` injected a `BchWallet` collaborator that no method ever
    reads — dead dependency wiring that also produced a mutation survivor.
  - `WalletList.parseWallets` used an index loop and a redundant empty-list
    early return; the loop start was only covered by an order-dependent test.
- **Minor, left as-is:** `wallet-list` does not use `initCommand` because it has
  no `validateFlags` and its constructor binding assumes one. Giving it a no-op
  validator to adopt the shared wiring was not worth the churn.

## Fixes applied

- **Removed the dead `BchWallet` injection from `wallet-balance.js`** (and its
  now-unused import). `this.BchWallet` was never referenced, so the default
  `options.BchWallet || BchWallet` branch was unkillable; removing it eliminates
  the dead code and the survivor.
- **Hardened `wallet-list.js`:** replaced the index loop with `for (const …
  of …)` and dropped the redundant empty-list early return (the loop already
  yields `[]`), improving control flow and removing the mutated constant.
- **Added two unit tests:** the `wallet-sweep` default sweep library is wired
  when none is injected, and `wallet-list.parseWallets` parses a controlled
  two-wallet store in order (removing the test's dependence on whatever happens
  to be in `.wallets/`).
- **Recorded the tool-written language and Gherkin manifests.**

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Killed | Survived |
|------|-------|--------|----------|
| `src/lib/init-command.js` | 1 | 1 | 0 |
| `src/lib/wallet-balance.js` | 2 | 2 | 0 |
| `src/lib/flag-validator.js` | 2 | 2 | 0 |
| `src/lib/send-command.js` | 0 | 0 | 0 |
| `src/commands/msg-sign.js` | 0 | 0 | 0 |
| `src/commands/msg-verify.js` | 1 | 1 | 0 |
| `src/commands/send-bch.js` | 1 | 1 | 0 |
| `src/commands/send-tokens.js` | 1 | 1 | 0 |
| `src/commands/wallet-addrs.js` | 1 | 1 | 0 |
| `src/commands/wallet-balance.js` | 3 | 3 | 0 |
| `src/commands/wallet-create.js` | 4 | 4 | 0 |
| `src/commands/wallet-list.js` | 5 | 5 | 0 |
| `src/commands/wallet-sweep.js` | 1 | 1 | 0 |

The first pass had three survivors (the dead `wallet-balance` default, the
`wallet-sweep` default, and the `wallet-list` loop start); the fixes above kill
all three. **22/22 mutation sites killed, 0 survived.**

### DRY (`dry4javascript`, scoped to the changed files)

```
No duplicate candidates found.
```

### Cyclomatic complexity (`crap4javascript`, changed `src/` files)

Every function is 100% covered and below the CRAP threshold of 8.0; the highest
are `SendTokens.sendTokens` and `WalletCreate.createWallet` (CC 4, CRAP 4.0),
then `formatBalanceMessage`/`formatMintBatonLines`/`requireFlag` (CC 3, CRAP
3.0). Exit code 0.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/cli-json-output.feature` | 32 | 21 | 11 | 0 |

All 11 survivors are intrinsic setup/assertion equivalents where one example
cell feeds both the `Given` and the `Then`, so the mutation moves both sides
together:

- **CLI JSON Output - 2** (4): the wallet `name`/`description` cells are used
  both to seed the fake wallet store and to assert the JSON list.
- **CLI JSON Output - 9** (2): the `valid` cell is used both to stub the
  verification and to assert the reported result.
- **CLI JSON Output - 11** (5): the `error` cell is used both to fail the work
  and to assert the JSON error message.

No implementation gap is implied; the tool wrote a manifest listing only the
one clean scenario (CLI JSON Output - 10, 16/16) and leaves the equivalent
scenarios to re-mutate next run, and it is committed as-is.

### Canonical suite (`verify.sh cli`, at `8aa7669e80`)

| Command | Result |
|---------|--------|
| unit | 691 passing |
| property | 154 pass / 0 fail |
| acceptance | all 44 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record:
`docs/reviews/cli-json-output-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `cli-json-output`, review commit `8aa7669e80`.
