# cli-quality-hardening — Architect Review

**Task:** `cli-quality-hardening`
**Component:** `psf-memo-cli` (the fourth monorepo component)
**Architect review commit:** `7997339`
**Verification record:** `docs/reviews/cli-quality-hardening-verification.json` (`git_sha` `7997339`)

## Commits reviewed

The `swarmforge-refactorer` branch carried the specifier's onboarding commits
plus the refactorer's hardening:

| Commit | Author | Summary |
|--------|--------|---------|
| `ec43ab7` | user | UML (`examples/psf-memo.edn`, `examples/psf-memo.policy.edn`) |
| `c74c8b7` | specifier | Added psf-memo-cli (forked from psf-bch-wallet) |
| `83c75c8` | specifier | Rename to psf-memo-cli and add CRAP/mutation/DRY tooling |
| `63aa2b8` | specifier | Add `cli` to swarm verification; scope quality hardening |
| `eee2a29` | refactorer | Harden psf-memo-cli: reduce CRAP and shared duplication |
| `1631bac` | refactorer | Make psf-memo-cli unit tests self-provision `.wallets` |

## Architectural findings and fixes applied

1. **Command-to-command coupling (fixed).** `SendTokens` imported the
   `WalletBalance` *command* solely to reuse the pure `getTokenBalances`
   method, which also dragged `WalletBalance`'s whole dependency graph
   (`BchWallet`, `WalletUtil`, `fs`, `collect`, `config`) into every
   `SendTokens` construction. Extracted the pure function to the leaf module
   `src/lib/token-balances.js`; `SendTokens` now injects it
   (`this.getTokenBalances`) so tests can still stub it, and `WalletBalance`
   calls the helper directly. Removed the now-dead `this.collect` field.

2. **Fresh-checkout failure (fixed at both layers).** `.wallets/` is
   gitignored and untracked, so a fresh worktree failed `npm test` with
   `ENOENT` before any test ran, and a real `wallet-create` would fail on a
   clean checkout for the same reason. Complementary fixes:
   - refactorer `1631bac`: `pretest: mkdir -p .wallets` makes the unit-test
     baseline reproducible.
   - architect: `WalletUtil.saveWallet` now `mkdir -p`s its parent directory,
     fixing the production path as well. The two overlap deliberately
     (test-harness setup vs. production robustness).

3. **Misleading error labels (fixed).** `send-tokens` logged
   `Error in send-bch`, `msg-verify` logged `Error in msg-sign`, and
   `wallet-sweep` logged `Error in send-bch`. Corrected to the command names.

4. **Canonical runner omitted property tests (fixed).** The specifier's `cli`
   entry in `verify.mjs` ran only unit + lint. Added `npm run property` so the
   canonical verification and its record cover the refactorer's new property
   suite, consistent with the `client`/`db`/`indexer` entries.

5. **Test boundary (improved).** The `getTokenBalances` property test moved
   from the command to the extracted helper
   (`test/property/token-balances.property.test.js`), and a focused unit test
   for the helper was added (`test/unit/lib/token-balances.unit.js`).

Structure reviewed: `src/commands/*` are thin delivery adapters over
`src/lib/*` leaf modules; the entry point wires commander to command instances;
there is no persistence, framework, or core-rules layer to separate further.
No Gherkin specs exist for `psf-memo-cli`, so soft Gherkin acceptance mutation
is not applicable yet.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, differential
with automatic `--mutate-all` re-run on under-selection, `--max-workers 8`):
first pass selected **49** sites with **21 survived**; after adding targeted
unit tests the second pass is **49 killed / 0 survived / 0 uncovered**.
Per file: `config/index.js` 2, `src/lib/token-balances.js` 7,
`flag-validator.js` 2, `send-command.js` 2, `wallet-util.js` 3,
`wallet-balance.js` 12, `send-tokens.js` 1, `msg-verify.js` 2,
`wallet-sweep.js` 2, `msg-sign.js` 2, `send-bch.js` 1, `wallet-addrs.js` 1,
`wallet-create.js` 3, `wallet-list.js` 9. `psf-memo-cli.js` (commander wiring)
and `src/lib/bind-methods.js` are structurally pure and report 0 mutation
sites. **No intrinsic-equivalent survivors remain.**

**DRY** (`dry4javascript src`): no duplicate candidates.
**CRAP** (`crap4javascript`): exit 0; max CRAP 6.0
(`WalletBalance.displayBalance`, CC 6), within the refactorer's ≤ 6 target.

**Suite status** (`verify.sh cli`, record `7997339`):
unit 84 passing / 100% statements-branches-functions-lines, property 4/4,
lint clean — pass 3/3.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task
  `cli-quality-hardening`; review commit `7997339`.
- No follow-up work was identified for the coder or refactorer.

By architect.
