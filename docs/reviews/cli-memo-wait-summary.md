# cli-memo-wait — Architect Review

**Task:** `cli-memo-wait` (R16: poll until a broadcast Memo post is indexed)
**Component:** `psf-memo-cli`
**Architect review commit:** `e8dfe42aa0`
**Verification record:** `docs/reviews/cli-memo-wait-verification.json`
(`git_sha` `e8dfe42aa0`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `eb713ad` | specifier | Specify the memo-wait read command (`specs/memo-wait.feature`, 6 scenarios) |
| `c0687ab` | coder | Implement the memo-wait read command (`src/lib/memo-wait.js`, `src/commands/memo-wait.js`, acceptance steps, unit + property tests) |
| `d35a24e` | refactorer | Extract `assertReportedPost` into `read-command.js`, add a real-clock unit case |

The architect branch fast-forwarded `aa617ed -> d35a24e`, then added review
commit `e8dfe42aa0` (mutation-killing tests, shared wait-clock helper, and
tool-written manifests).

## Architectural findings and fixes applied

1. **Read-command composition (good).** `memo-wait` is a thin shell over the
   shared `initReadCommand`/`runReadCommand` scaffolding; the pure
   `src/lib/memo-wait.js` owns the timing-flag validation and the poll loop. The
   clock (`sleep`/`now`) is injected, so the loop is exercisable without real
   time passing, and `readPost` maps a missing document to `null` for a retry
   while letting a transport failure propagate immediately.

2. **Shared reported-post assertion (good).** `assertReportedPost` was extracted
   into `acceptance/lib/read-command.js` and is reused by `memo-get-post` and
   `memo-wait`, removing the identical stored-post step body. The
   command-specific poll/timing steps stay in `memo-wait.js`.

3. **Dependency direction and information hiding (good).** The command depends
   inward on the pure helper and the shared read-command/DB client, with
   `MemoDbClass`, `sleep`, `now`, `stdout`, and `stderr` injected. The helper
   exports only the two default constants, `parseWaitFlags`, and `pollForPost`;
   no IO or framework detail leaks across the boundary.

4. **Mutation hardening (fix applied).** The mutation suite runs `npm test`
   (unit only), so the property test does not contribute kills. The first
   `--mutate-all` pass left 3 survivors, all now killed by unit tests:
   - `parsePositiveInteger` second `|| -> &&` — needed a unit case for `null` /
     empty timing flags falling back to the defaults (the property test covered
     it, but mutation only sees `test/unit`).
   - `pollForPost` `+ -> -` and `> -> >=` — the timeout tests only asserted the
     error message, so a mutant that threw one poll late (`+ -> -`) or one poll
     early (`> -> >=`) still passed. Asserting the exact delay sequence at the
     timeout (`[1000, 1000, 1000]`) and adding a post that appears exactly at the
     timeout boundary (poll 4 with `timeout 3000, interval 1000`) pins both.

5. **DRY fix applied.** `dry4javascript` flagged the `fakeClock` helper as a
   score-1.00 duplicate across the lib, command, and property tests, plus two
   within-file pairs (the timeout/interval rejection tests and the two polling
   tests). Extracted `fakeClock` into `test/support/clock.js` and table-drove the
   two test pairs. Re-run: no duplicate candidates.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` for the new modules). After the killing tests, the lib was
re-run and all sites are killed; a follow-up `--scan` confirmed
`Changed mutation sites: 0` and `Manifest exists: true` for both.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-wait.js` | 10 | 0 | 0 |
| `src/commands/memo-wait.js` | 2 | 0 | 0 |

The source diffs in the review commit are the tool-written refreshed manifests.
Baseline c8 coverage is 100% for both `memo-wait` modules.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
read-command/step modules, the new `clock.js` support helper, and the
unit/property tests): initially flagged the duplicated clock and the two
within-file pairs; after consolidation the re-run reports **no duplicate
candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-wait.feature`): **12 mutations, 6 killed, 6 survived, 0 errors**.
The 6 kills are the observable timing-class and error-value mutations — the four
`--timeout`/`--interval` error strings, `timeout 0 -> 1` and `interval 0 -> 6`
(both cross into the accepted positive integers). The 6 survivors are intrinsic
equivalents in the invalid-flag outline: mutating the `interval` when the
`timeout` is the flag that fails first (or vice versa), and case-only mutations
of an already-non-numeric value (`abc -> abC`), neither of which changes the
reported error. The tool wrote an empty `"scenarios":[]` manifest because every
scenario retained at least one survivor; those scenarios are intentionally
re-mutated next run.

**Suite status** (`verify.sh cli`, record `e8dfe42aa0`): unit **293 passing**,
property **50 pass / 0 fail**, acceptance **all 14 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-wait`, commit `e8dfe42aa0`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
