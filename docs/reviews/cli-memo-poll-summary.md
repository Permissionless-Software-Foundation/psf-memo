# cli-memo-poll — Architect Review

**Task:** `cli-memo-poll` (R13: poll read command)
**Component:** `psf-memo-cli`
**Architect review commit:** `1838180cc9`
**Verification record:** `docs/reviews/cli-memo-poll-verification.json`
(`git_sha` `1838180cc9`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `e30c896` | specifier | Specify memo-poll (R13) poll read command (`specs/memo-poll.feature`, 6 scenarios) |
| `bd1c9c4` | coder | Implement the command (`src/lib/memo-poll.js`, `src/commands/memo-poll.js`, `MemoDb.getPoll`, acceptance steps, unit + property tests) |
| `c43a0a2` | refactorer | Dedupe the poll step handlers and the txid-path DB tests |

The architect branch fast-forwarded `7367b74 -> c43a0a2`, then added review
commit `1838180cc9` (tool-written manifests and the feature mutation stamp).

## Architectural findings and fixes applied

1. **Single-resource read pattern (good).** `memo-poll` uses the same explicit
   `initReadCommand` -> `runReadCommand` shape as `memo-get-post` and
   `memo-thread`: the pure `src/lib/memo-poll.js` owns the summary, the command
   owns the required `-t` flag and the `null` -> not-found mapping, and
   `MemoDb.getPoll` uses `{ notFoundValue: null }` so a missing poll is a clean
   exit-1 failure rather than an HTTP error. No new scaffolding was needed.

2. **Shared txid flag reused (good).** `parseTxidFlag` is reused for the `-t`
   flag, keeping the usage message and validation in one place.

3. **Refactorer deduplication verified (good).** The acceptance poll step
   handlers and the txid-path DB tests were consolidated, and the scoped DRY
   run reports no duplicate candidates, so no further structural change was
   required.

4. **No production structural fix required.** The only review-commit changes are
   the tool-written mutation manifests and the acceptance-mutation stamp.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` where differential under-selected). No survivors.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-poll.js` | 2 | 0 | 0 |
| `src/commands/memo-poll.js` | 0 | 0 | 0 |
| `src/lib/memo-db.js` | 13 | 0 | 0 |

`memo-db.js` reran with `--mutate-all`; the command module has no mutation sites
(wiring only).

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance modules, and the new/changed unit/property tests): **no duplicate
candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-poll.feature`): **12 mutations, 12 killed, 0 survived, 0 errors**
(the question, option/author, and vote/voter example cells). The tool wrote an
acceptance-mutation manifest recording `scenario[1..3]` (all killed) plus a
`# mutation-stamp`.

**Suite status** (`verify.sh cli`, record `1838180cc9`): unit **442 passing**,
property **94 pass / 0 fail**, acceptance **all 25 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-poll`, commit `1838180cc9`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
