# cli-memo-reply — Architect Review

**Task:** `cli-memo-reply` (W2: broadcast a 0x6d03 Memo reply)
**Component:** `psf-memo-cli`
**Architect review commit:** `30fdddf0c2`
**Verification record:** `docs/reviews/cli-memo-reply-verification.json`
(`git_sha` `30fdddf0c2`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's shared-scaffolding consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `08fd627` | specifier | Specify the memo-reply write command (`specs/memo-reply.feature`, 9 scenarios) |
| `75e550a` | coder | Implement the memo-reply write command (`src/lib/memo-reply.js`, `src/commands/memo-reply.js`, shared `acceptance/lib/steps/broadcast-command.js`, registration, unit + property tests) |
| `8ffe2ea` | refactorer | Extract the shared `src/lib/write-command.js` (`initWriteCommand`/`runWriteCommand`), route both write commands through it, and move the shared usage/error Gherkin assertions into `broadcast-command.js` |

The architect branch fast-forwarded `756747e -> 8ffe2ea`, then added review
commit `30fdddf0c2` (shared write-command unit-test helpers + tool-written
manifests).

## Architectural findings and fixes applied

1. **Shared write-command scaffolding (good, accepted — resolves my prior
   observation).** `src/lib/write-command.js` now owns the dependency wiring
   (`initWriteCommand`) and the validate -> resolve wallet -> broadcast ->
   report pipeline (`runWriteCommand`), mirroring `read-command.js` on the read
   path. `memo-post` and `memo-reply` are now thin shells that supply only their
   flag parser, action prefix, `post` field builder, and message formatter. This
   removes exactly the reporter/exit-code duplication I noted in the
   `cli-memo-post` review, and gives later memo-* write commands a stable seam.

2. **Pure core / thin command boundary (good).** `src/lib/memo-reply.js` owns the
   0x6d03 prefix, the 184-UTF-8-byte limit (after the 32-byte parent txid), the
   parent-txid presence/format validation, the little-endian wire encoding, and
   the human summary. It has no IO, wallet, or framework dependency, so the
   protocol rules are unit- and property-testable in isolation.

3. **Dependency rule and testability (good).** The command depends inward on the
   pure helper and the shared adapters; `walletUtil`, `broadcast`, `stdout`, and
   `stderr` are constructor-injected through `initWriteCommand`, so tests and
   acceptance inject fakes and never touch the network or a wallet file. The
   `write-command` contract passes `{ wallet, ...fields }` to the command's
   `post`, keeping the field shape owned by each command's pure parser.

4. **Information hiding (good).** `memo-reply.js` exports only
   `MEMO_REPLY_PREFIX`, `MAX_REPLY_BYTES`, `parseReplyFlags`, and
   `formatReplyMessage`. `parseReplyFlags` returns the decoded
   `{ parentBytes, text }` and converts `parseTxidFlag`/`txidToWireBytes`
   failures into `UsageError`, so a malformed txid exits 2 before any broadcast.

5. **Acceptance boundary (good).** `acceptance/lib/steps/broadcast-command.js`
   holds the shared write-command world and steps (wallet source, recording
   wallet, txid/explorer reporting, no-broadcast, usage-error, exit-1 error),
   with a `(memo-post|memo-reply)` alternation for the command-named error
   steps. `memo-reply.js` keeps only its parent-txid and byte-limit steps. The
   acceptance fake and step helpers stay separate from production.

6. **DRY fix applied.** `dry4javascript` flagged `makeCommand` and the
   `assertUsageError` helper as score-1.00 duplicates across
   `test/unit/commands/memo-post.unit.js` and
   `test/unit/commands/memo-reply.unit.js` (the new command test copied the
   previous one). Extracted the fake wallet factory, recording `makeCommand`,
   and `assertUsageError` into `test/support/write-command-unit.js`, parameterized
   by the command class; both test files now import them. Kept under
   `test/support` so helpers stay separate from tests. Re-run: no duplicate
   candidates.

7. **Observation, not changed — the write-command method contract.** 
   `initWriteCommand` binds a fixed method set including `post`; every write
   command must expose `post({ wallet, ...fields })`. This is a reasonable,
   documented seam for the memo-* family and was left as-is.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`). New modules ran with `--mutate-all` (empty manifests); `memo-post.js`,
whose body changed under the shared-scaffolding refactor, ran differentially —
it under-selected (0 of 1 covered sites), so the `mutate-file.sh` wrapper
escalated it to `--mutate-all`. A follow-up `--scan` confirmed
`Changed mutation sites: 0` and `Manifest exists: true` for all four.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/write-command.js` | 2 | 0 | 0 |
| `src/lib/memo-reply.js` | 2 | 0 | 0 |
| `src/commands/memo-reply.js` | 1 | 0 | 0 |
| `src/commands/memo-post.js` | 1 | 0 | 0 |

The source diffs in the review commit are the tool-written refreshed manifests.
Baseline c8 coverage is 100% for the write-command modules.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, the new support helper, and the unit/property tests):
initially flagged the duplicated command-test helpers; after extraction the
re-run reports **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-reply.feature`): **21 mutations, 7 killed, 14 survived, 0
errors**. The 7 kills are the observable boundary/limit and error-value
mutations — `scenario[1]` push-3 byte and reply-length cells for both example
rows (a 184-byte multibyte reply and a 5-byte reply), `scenario[4]` empty text
`-> x` (becomes valid), and `scenario[6]` the two expected malformed-txid error
strings. The 14 survivors are intrinsic equivalents:

- `scenario[0]` parent/text/txid (6): each example value drives both the
  broadcast (wire-order parent push, text push) and the reported txid/explorer
  link, so a consistent case/character mutation is unobservable.
- `scenario[1]` txid (2): same self-consistent report.
- `scenario[2]` reply length `93 -> 99` and `200 -> 195` (2): both values are
  over the 184-byte limit and yield the identical fixed usage error; the
  scenario does not assert the value.
- `scenario[6]` parent txid `1234 -> 1243` / `zzz... -> zzzZ...` (2): both remain
  malformed and produce the same fixed error strings.
- `scenario[8]` injected error strings (2): the wallet error is echoed and
  asserted verbatim.

The tool wrote the expected `acceptance-mutation-manifest` block into the
feature file, recording only `scenario[4]` (the sole scenario with all
mutations killed); the survivor scenarios are intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `30fdddf0c2`): unit **248 passing**,
property **46 pass / 0 fail**, acceptance **all 12 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-reply`, commit `30fdddf0c2`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
