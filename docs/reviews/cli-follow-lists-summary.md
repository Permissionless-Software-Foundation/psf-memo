# cli-follow-lists — Architect Review

**Task:** `cli-follow-lists` (R11a/R11b: `memo-following` and `memo-followers`)
**Component:** `psf-memo-cli`
**Architect review commit:** `c67e4ac0be`
**Verification record:** `docs/reviews/cli-follow-lists-verification.json`
(`git_sha` `c67e4ac0be`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's two feature specs, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `702bceb` | specifier | Specify memo-following and memo-followers (R11) read commands (`specs/memo-following.feature`, `specs/memo-followers.feature`, 4 scenarios each) |
| `5f071c5` | coder | Implement both commands (`src/lib/follow-list.js`, `src/commands/memo-following.js`, `src/commands/memo-followers.js`, `MemoDb.getFollowing`/`getFollowers`, acceptance steps, unit + property tests) |
| `9357370` | refactorer | Share the wallet-address acceptance step and add property tests |

The architect branch fast-forwarded `44e1c1e -> 9357370`, then added review
commit `c67e4ac0be` (shared follow-command test scaffolding, shared property
generators, table-driven DB route tests, tool-written manifests and feature
mutation stamps).

## Architectural findings and fixes applied

1. **One pure helper for both commands (good).** `src/lib/follow-list.js` owns
   the follower `-a` flag (reusing the shared `parseAddressFlag`), the following
   wallet-source passthrough, and the shared address-list summary, so
   `memo-following` and `memo-followers` are thin wiring layers over
   `ListReadCommand`.

2. **Wallet resolution stays at the edge (good).** `memo-following` resolves the
   signing wallet through `resolveWalletSource` with an injectable `WalletUtil`,
   keeping the wallet/environment boundary behind the adapter and out of the read
   helpers. `memo-followers` has no wallet dependency.

3. **Adapter stays minimal (good).** `MemoDb.getFollowing` and `getFollowers`
   percent-encode the address and add no query wiring; no new serialization
   duplication.

4. **DRY fixes applied (test-only).** The refactorer's two parallel command test
   suites produced five score-1.00 duplicate pairs. Extracted
   `test/support/follow-command-tests.js` (fake Memo DB factory, captured-stream
   command builder, and the shared read contract: JSON report, request failure,
   endpoint override) so each command file keeps only its command-specific
   cases. Moved the duplicated `randomAddress`/`randomAddresses` generators into
   `test/property/harness.js`, and table-drove the duplicated `getFollowing` /
   `getFollowers` route tests in `test/unit/lib/memo-db.unit.js`. Re-run: **no
   duplicate candidates found.**

5. **No production structural change required.** The shared helper module and
   `ListReadCommand` already give the right boundaries; only test duplication
   remained.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` where differential under-selected). No survivors.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/follow-list.js` | 3 | 0 | 0 |
| `src/commands/memo-following.js` | 1 | 0 | 0 |
| `src/commands/memo-followers.js` | 0 | 0 | 0 |
| `src/lib/memo-db.js` | 13 | 0 | 0 |

`memo-db.js` and `follow-list.js` reran with `--mutate-all` after the test
refactor to confirm the consolidated tests still kill every site. The command
modules with zero sites are structurally clean (no arithmetic/comparison/
boolean/constant sites).

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, the shared test helper, and the changed unit/property
tests): after the consolidation, **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`):
both features report **0 mutations** because neither `specs/memo-following.feature`
nor `specs/memo-followers.feature` uses an `Examples` table — soft mutation only
mutates Gherkin example values, and these scenarios carry their values as
literals. The tool wrote an empty `scenarios:[]` manifest plus a
`# mutation-stamp` to each feature (tool-written, committed as-is). This is a
spec-shape property, not a tool failure; the behavior is covered by the
command unit tests, the property tests, and the acceptance suites.

**Suite status** (`verify.sh cli`, record `c67e4ac0be`): unit **423 passing**,
property **89 pass / 0 fail**, acceptance **all 23 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-follow-lists`, commit `c67e4ac0be`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
