# cli-quality-audit — Architect Review

**By architect.**

**Task:** `cli-quality-audit` (X5: quality and verification)
**Component:** `psf-memo-cli`
**Merged refactorer tip:** `41db13593c`
**Architect review commit:** `4688e628e1` (tool-written mutation manifests)
**Verification record:** `docs/reviews/cli-quality-audit-verification.json`
(`git_sha` `4688e628e1`)

## Commits reviewed

The `swarmforge-refactorer` one-item `BATCH` carried the X4 completion record,
the X5 specification, the coder's coverage tests, and the refactorer's
consolidation. The architect branch merged `41db135` (and `master` through
`93edbec`) into a review base at `52f7e9f`.

| Commit | Role | Summary |
|--------|------|---------|
| `93edbec` | specifier | Record `cli-read-only-safety` (X4) completion and merge |
| `9570662` | specifier | Specify quality audit (X5) — `psf-memo-cli/dev-docs/quality-audit.md` (whole-component baseline checklist) |
| `d04b61c` | coder | Close the two uncovered CLI coverage branches: `memo-profiles` `(unset)` avatar/bio, and the `wallet-list-command` missing-list-field fallback |
| `ad932a2` | refactorer | Merge coder `cli-quality-audit` into refactorer |
| `41db135` | refactorer | Share the paginated list-read pipeline (`defineListReadCommand`); remove the last `npm run dry` candidate |
| `52f7e9f` | architect | Merge refactorer `cli-quality-audit` into architect |
| `4688e62` | architect | Tool-written mutation manifests (review commit) |

The architect review commit `4688e628e1` carries only the tool-written
`mutate4javascript` manifests (a full-`src/` sweep refreshed `tested_at` in all
86 files and added empty manifests to the two previously manifest-less files);
no production behavior changed during review.

## Architectural findings and fixes applied

1. **The last command-class duplication is gone (good, refactorer).**
   `defineListReadCommand` in `src/lib/list-command.js` owns the
   validate -> read -> report pipeline and the read-only client wiring, while
   `memo-profiles` and `memo-topics` now declare only
   `{ readMethod, clientMethod, listField, parseFlags, format }`. This removes
   the score-1.00 command-class pair that prior reviews had accepted as an
   intrinsic DRY candidate. It also makes the two list commands match the
   existing `defineWalletListCommand` factory pattern
   (`src/lib/wallet-list-command.js`), so there is now a single idiom for
   declarative command modules.

2. **The factory is a thin, information-hiding boundary (good).** `listField`
   and `clientMethod` are instance configuration; `format` normalizes the raw
   service result to `{ message, data }` and preserves the service pagination
   unchanged, so the command modules cannot drift in their response shape. The
   base `ListReadCommand` still owns the shared pipeline; the factory only
   specializes it.

3. **Coverage tests stay at the testable boundary (good, coder).** The two new
   tests pin the fallback branches without touching production behavior:
   `memo-profiles` `(unset)` avatar/bio in the pure formatter unit test, and the
   `wallet-list-command` missing-list-field fallback via the shared
   `test/support/capture.js`. Coverage reaches **100% statements, branches,
   functions, and lines** (579 passing).

4. **No production fixes were needed.** The full-component CRAP, DRY, coverage,
   and mutation measurements all meet the X5 targets. The only review churn was
   tool-written manifests.

5. **Intrinsic mutation survivors are a documented class, not a gap.** The
   three survivors are all dust-floor/short-circuit equivalents (see
   Verification); the spec permits documenting them with a rationale rather
   than chasing indistinguishable mutants.

## Verification

### Language mutation — full `src/` sweep

`mutate4javascript` run one file at a time with `--mutate-all --max-workers 8`
(the X5 spec directs a full sweep; a differential run would select nothing
because no production behavior changed). **183 sites across 47 files; 180 killed,
3 survived, 0 uncovered.** The other 39 `src/` files (including
`psf-memo-cli.js`, `bind-methods.js`, `list-command.js`, `post-page-command.js`,
and the formatter-only `memo-*` libs) report 0 mutation sites and were scanned
structurally.

| File | Sites | Killed | Survived | Uncovered |
|------|------:|-------:|---------:|----------:|
| `config/index.js` | 2 | 2 | 0 | 0 |
| `src/commands/memo-identity.js` | 5 | 5 | 0 | 0 |
| `src/commands/memo-like.js` | 5 | 4 | 1 | 0 |
| `src/commands/memo-notifications.js` | 1 | 1 | 0 | 0 |
| `src/commands/memo-profile.js` | 5 | 5 | 0 | 0 |
| `src/commands/memo-status.js` | 1 | 1 | 0 | 0 |
| `src/commands/memo-wait.js` | 2 | 2 | 0 | 0 |
| `src/commands/msg-sign.js` | 2 | 2 | 0 | 0 |
| `src/commands/msg-verify.js` | 2 | 2 | 0 | 0 |
| `src/commands/send-bch.js` | 1 | 1 | 0 | 0 |
| `src/commands/send-tokens.js` | 1 | 1 | 0 | 0 |
| `src/commands/wallet-addrs.js` | 1 | 1 | 0 | 0 |
| `src/commands/wallet-balance.js` | 12 | 12 | 0 | 0 |
| `src/commands/wallet-create.js` | 3 | 3 | 0 | 0 |
| `src/commands/wallet-list.js` | 9 | 9 | 0 | 0 |
| `src/commands/wallet-sweep.js` | 2 | 2 | 0 | 0 |
| `src/lib/flag-validator.js` | 2 | 2 | 0 | 0 |
| `src/lib/follow-list.js` | 3 | 3 | 0 | 0 |
| `src/lib/memo-broadcast.js` | 6 | 6 | 0 | 0 |
| `src/lib/memo-db.js` | 13 | 13 | 0 | 0 |
| `src/lib/memo-feed.js` | 2 | 2 | 0 | 0 |
| `src/lib/memo-identity.js` | 10 | 10 | 0 | 0 |
| `src/lib/memo-like.js` | 19 | 17 | 2 | 0 |
| `src/lib/memo-notifications.js` | 1 | 1 | 0 | 0 |
| `src/lib/memo-poll.js` | 2 | 2 | 0 | 0 |
| `src/lib/memo-posts.js` | 1 | 1 | 0 | 0 |
| `src/lib/memo-profile.js` | 5 | 5 | 0 | 0 |
| `src/lib/memo-profiles.js` | 4 | 4 | 0 | 0 |
| `src/lib/memo-reply.js` | 2 | 2 | 0 | 0 |
| `src/lib/memo-search.js` | 5 | 5 | 0 | 0 |
| `src/lib/memo-text-flag.js` | 2 | 2 | 0 | 0 |
| `src/lib/memo-thread.js` | 4 | 4 | 0 | 0 |
| `src/lib/memo-topic.js` | 2 | 2 | 0 | 0 |
| `src/lib/memo-topic-post.js` | 3 | 3 | 0 | 0 |
| `src/lib/memo-topics.js` | 1 | 1 | 0 | 0 |
| `src/lib/memo-wait.js` | 10 | 10 | 0 | 0 |
| `src/lib/page-flags.js` | 5 | 5 | 0 | 0 |
| `src/lib/page-summary.js` | 1 | 1 | 0 | 0 |
| `src/lib/read-command.js` | 1 | 1 | 0 | 0 |
| `src/lib/reporter.js` | 4 | 4 | 0 | 0 |
| `src/lib/send-command.js` | 2 | 2 | 0 | 0 |
| `src/lib/token-balances.js` | 7 | 7 | 0 | 0 |
| `src/lib/wallet-list-command.js` | 2 | 2 | 0 | 0 |
| `src/lib/wallet-source.js` | 2 | 2 | 0 | 0 |
| `src/lib/wallet-util.js` | 4 | 4 | 0 | 0 |
| `src/lib/wire-encoding.js` | 1 | 1 | 0 | 0 |
| `src/lib/write-command.js` | 3 | 3 | 0 | 0 |
| **Total** | **183** | **180** | **3** | **0** |

**The 3 survivors are intrinsic equivalents, not gaps:**

- `src/lib/memo-like.js:29` (`parseTip`) — one of the two `||` operators. A
  targeted `--lines 29` run confirmed the other `||` and the `return 0`
  constant are both killed; the surviving `||` joins the `null` and empty-string
  clauses, and `Number(null) === Number('') === 0`, so every input that reaches
  it returns the same result. No test can distinguish it.
- `src/lib/memo-like.js:63` (`parseLikeFlags`) — `tipSats > 0` mutated to
  `> 1`. `assertTipInRange` rejects `tipSats = 1` at the 600-sat dust floor
  before this check, so the only distinguishing input is unreachable.
- `src/commands/memo-like.js:60` (`MemoLike.post`) — the same `tipSats > 0`
  threshold, reached only with the already-validated `tipSats` (0 or ≥600), so
  `> 1` is behaviorally identical.

### Other quality gates

- **Coverage** (`npm test`, `c8`): **100% statements / 100% branches / 100%
  functions / 100% lines; 579 passing.**
- **CRAP** (`npm run crap`): **exit 0, max CRAP 6.0**
  (`parseNonNegativeInteger`, `src/lib/page-flags.js`) — within the ≤ 6.0
  target.
- **DRY** (`npm run dry`, `dry4javascript src`): **no duplicate candidates
  found** (the refactorer's `defineListReadCommand` removed the last
  score-1.00 pair).
- **Property** (`npm run property`): **110 pass / 0 fail.**
- **Lint** (`npm run lint`): **clean.**

### Suite status

`verify.sh cli`, record `4688e628e1`: unit **579 passing**, property
**110/0**, acceptance **all 37 suites passed**, lint **ok** — result
**pass (4/4)**.

**Soft Gherkin acceptance mutation is not applicable to this task** (X5 has no
Gherkin feature; `cli-quality-audit.md` explicitly scopes it out).

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-quality-audit`, final tip below
  (end-of-chain merge notification; no coder or refactorer follow-up work was
  required).
