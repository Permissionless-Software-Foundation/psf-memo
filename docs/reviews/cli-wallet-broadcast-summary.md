# cli-wallet-broadcast — Architect Review

**Task:** `cli-wallet-broadcast` (F2a wallet source + F2b/F3 Memo broadcast scaffolding)
**Component:** `psf-memo-cli`
**Architect review commit:** `c2ab84a`
**Verification record:** `docs/reviews/cli-wallet-broadcast-verification.json` (`git_sha` `c2ab84a`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's F2/F3 specs plus the
coder implementation and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `90f1e3c` | specifier | Specify the CLI wallet source and Memo broadcast scaffolding (F2/F3) |
| `e867bd0` | coder | Add `src/lib/wallet-source.js`, `src/lib/memo-broadcast.js`, the `wallet-util` WIF constructor, and the acceptance steps |
| `11c40a1` | refactorer | Consolidate acceptance assertions (`assertEqual`) and strengthen F2/F3 property tests |

`3cbcbbd` (specifier, records the previous task) was already on `master`. The
architect branch fast-forwarded `6f5c5ba -> 11c40a1`.

## Architectural findings and fixes applied

1. **Acceptance double re-implemented production encoding (fixed).** The Memo
   Broadcast recording wallet built its recorded pushes with an inline
   `[Buffer.from(prefix, 'hex'), ...fields.map(toPushBuffer)]`, a second copy of
   the wire format already owned by `buildMemoPushes`. Switched the double to
   the exported pure helper so the test double and production share one builder;
   the scenario assertions still check concrete hex/UTF-8 values, so a bug in
   the builder would still be caught.

2. **Boundaries reviewed (sound).** `wallet-source.js` is a pure, injectable
   resolver that surfaces both zero-source and two-source conditions as
   `UsageError`, with no wallet or IO coupling. `memo-broadcast.js` extracts the
   pure encoding (`toPushBuffer`, `buildMemoPushes`) and confines the
   minimal-slp-wallet `Script.encode2` monkey-patch to
   `broadcastMultiPush`/`attachMultiPushOpReturn`; the patch self-restores and
   the wallet is not mutated when it lacks OP_RETURN support. The two additions
   to `wallet-util.js` share only trivial config boilerplate while taking
   different inputs, so they were left as the simplest design rather than
   forced behind a helper.

3. **Step-handler cohesion (good).** The two new features landed under
   `acceptance/lib/steps/` and were registered in `handlers.js`; the refactorer
   also introduced a shared `assertEqual` helper in `step-support.js` and
   reused it in `memo-db.js`.

## Verification

**Language mutation** (`mutate4javascript`, differential with `--mutate-all`
fallback, `--max-workers 8`), one file at a time:

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/wallet-source.js` | 2 | 0 | 0 |
| `src/lib/memo-broadcast.js` | 6 | 0 | 0 |
| `src/lib/wallet-util.js` | 4 | 0 | 0 |

**DRY** (`dry4javascript`, scoped to the changed production modules, step
modules, and unit/property tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`):
- `specs/memo-broadcast.feature`: **22 mutations, 9 killed, 13 survived,
  0 errors**. The 9 kills are genuine (hex-case normalization, invalid-hex
  truncation, negative byte fields, and an over-length txid rejected by
  `txidToWireBytes`). The 13 survivors are intrinsic equivalents — each
  `text`/`txid`/`poll_type`/`option_count`/`question`/`error` cell is used on
  both the setup and assertion sides of its scenario.
- `specs/wallet-source.feature`: **8 mutations, 0 killed, 8 survived,
  0 errors**, all intrinsic equivalents (`name`/`wif`/`addr` passed through
  from the Given to the Then).

Both are the documented read-only/round-trip equivalent class, recorded in the
tool-written manifests and not chased.

**Suite status** (`verify.sh cli`, record `c2ab84a`): unit **139 passing / 100%
statements-branches-functions-lines**, property **20 pass / 0 fail**,
acceptance **5 suites (memo-db-client, cli-output-contract, memo-wire-encoding,
memo-broadcast, wallet-source) passed**, lint clean — **pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task
  `cli-wallet-broadcast`; review commit `c2ab84a`.
- No follow-up work identified for the coder or refactorer.

By architect.
