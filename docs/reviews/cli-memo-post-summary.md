# cli-memo-post — Architect Review

**Task:** `cli-memo-post` (W1: broadcast a 0x6d02 Memo post)
**Component:** `psf-memo-cli`
**Architect review commit:** `4675901a11`
**Verification record:** `docs/reviews/cli-memo-post-verification.json`
(`git_sha` `4675901a11`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `de1ba2f` | specifier | Specify the memo-post write command (`specs/memo-post.feature`, 7 scenarios) |
| `70e326c` | coder | Implement the memo-post write command (`src/lib/memo-post.js`, `src/commands/memo-post.js`, registration in `psf-memo-cli.js`/`handlers.js`, unit + property tests, acceptance steps) |
| `d789f2b` | refactorer | Share the recording-wallet fake and URL-template helper, route the usage-error step through `assertUsageError`, cover the default wiring |

The architect branch fast-forwarded `df32bc0 -> d789f2b`, then added review
commit `4675901a11` (DRY test consolidation + tool-written manifests).

## Architectural findings and fixes applied

1. **Composition over a new abstraction (good, accepted).** The first write
   command is wired from existing shared parts — `runCommand` (F5 output
   contract), `resolveWalletSource` (F2 wallet source), `broadcastMemo` (F3
   broadcast scaffolding) — plus the new pure `src/lib/memo-post.js`. It does
   not grow `read-command.js` with write concerns and does not fork the
   reporter. This keeps the write path aligned with the read path and leaves
   room for later memo-* write commands.

2. **Pure core / thin command boundary (good).** `src/lib/memo-post.js` owns
   the protocol prefix, the 217-UTF-16-code-unit limit, flag validation, and
   the human summary; `src/commands/memo-post.js` is a thin wiring layer. Core
   rules are fully testable with no HTTP, wallet, or terminal dependency.

3. **Dependency direction and testability (good).** The command depends inward
   on the pure helper and the shared adapters; `walletUtil`, `broadcast`,
   `stdout`, and `stderr` are constructor-injected, so unit and acceptance
   tests exercise the real validation/limit logic with fakes and never touch
   the network or a wallet file. No framework or persistence structure leaks
   across the boundary.

4. **Information hiding (good).** The module exports only
   `MEMO_POST_PREFIX`, `MAX_MEMO_CHARS`, `parseMemoPostFlags`, and
   `formatMemoPostMessage`; `parseMemoPostFlags` returns a normalized
   `{ memo }` and preserves the exact usage-error text.

5. **Refactorer consolidations (good, accepted).** The duplicated
   recording-wallet fake moved to `acceptance/lib/wallet-support.js` with an
   optional `cashAddress`; the duplicated `<param>` URL substitution moved to
   `resolveUrlTemplate` in `step-support.js`; the memo-post usage-error step
   now reuses `assertUsageError`. The shared wallet's extra `walletInfo` /
   `broadcastCount` bookkeeping is exercised by the command-level steps and
   harmless to the library-level steps.

6. **DRY fix applied.** `dry4javascript` flagged the four usage-error unit
   tests in `test/unit/commands/memo-post.unit.js` as structurally identical
   (two blocks at score 1.00). Extracted a local `assertUsageError(flags,
   expected)` helper that runs the command in JSON mode and asserts exit 2,
   the error payload, and zero broadcasts; the four tests now call it.
   Re-run: no duplicate candidates.

7. **Observation, not changed — reporter plumbing is repeated, not shared.**
   `MemoPost.run` repeats the `runCommand(...)` + `process.exitCode` shell that
   `runReadCommand` already provides. Extracting a generic reporter runner for
   write commands would be premature with a single write command and would
   couple the write path to a module documented as read-only. Left as-is per
   "simplest design that supports current behavior".

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`). The new modules carried empty manifests, so they were run with
`--mutate-all` to avoid silent differential under-selection; a follow-up
`--scan` confirmed `Changed mutation sites: 0` and `Manifest exists: true` for
both.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/commands/memo-post.js` | 3 | 0 | 0 |
| `src/lib/memo-post.js` | 2 | 0 | 0 |

The source diffs in the review commit are the tool-written refreshed manifests.
Baseline c8 coverage is 100% statements/branches/functions/lines for both
modules.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, and the new unit/property tests): initially flagged
the duplicated usage-error test pair; after consolidation the re-run reports
**no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers
8` on `specs/memo-post.feature`): **15 mutations, 6 killed, 9 survived, 0
errors**. The 6 kills are the observable boundary/limit mutations —
`scenario[1]` byte and length cells (a 217-char multibyte memo and a 5-char
memo change both push-byte and length assertions), `scenario[2]` length
`218 -> 210` (crosses under the 217 limit and broadcasts instead of erroring),
and `scenario[4]` empty text `-> x` (becomes valid). The 9 survivors are
intrinsic equivalents, each a case/character mutation of an example value used
consistently on both the setup and assertion sides of its scenario:

- `scenario[0]` text/txid (4): the memo text and txid drive both the broadcast
  and the reported txid/explorer link.
- `scenario[1]` txid (2): same self-consistent report.
- `scenario[2]` length `300 -> 302` (1): both are over the 217 limit and yield
  the identical fixed usage error; the scenario does not assert the value.
- `scenario[6]` injected error strings (2): the wallet error is echoed and
  asserted verbatim.

The tool wrote the expected `acceptance-mutation-manifest` block into the
feature file, recording only `scenario[4]` (the sole scenario with all
mutations killed); the survivor scenarios are intentionally re-mutated next
run.

**Suite status** (`verify.sh cli`, record `4675901a11`): unit **228 passing**,
property **44 pass / 0 fail**, acceptance **all 11 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-post`, commit `4675901a11`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
