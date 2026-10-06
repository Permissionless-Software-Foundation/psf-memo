# cli-memo-db-client — Architect Review

**Task:** `cli-memo-db-client` (F1: the read-only Memo DB REST client)
**Component:** `psf-memo-cli`
**Architect review commit:** `c881811`
**Verification record:** `docs/reviews/cli-memo-db-client-verification.json` (`git_sha` `c881811`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's F1 spec plus the
coder's implementation and the refactorer's property work:

| Commit | Author | Summary |
|--------|--------|---------|
| `301ddcf` | specifier | Specify the Memo DB client (F1) — `specs/memo-db-client.feature` |
| `863b514` | specifier | Add the psf-memo-cli Memo protocol feature backlog |
| `ae22418` | coder | Add `src/lib/memo-db.js`, `MEMO_DB_URL` config, and the CLI Gherkin acceptance harness |
| `a229c83` | refactorer | Extend memo-db property tests: encoding, 404, and error contract |

`301ddcf`/`863b514` were already on `master`; the architect branch fast-forwarded
`e1fc6f0 -> a229c83` to pick up the coder + refactorer commits.

## Architectural findings and fixes applied

1. **Duplicated acceptance pipeline (fixed).** The new
   `psf-memo-cli/acceptance/acceptance.js` re-implemented the shared
   generation/run orchestration that already lives in
   `swarmforge/scripts/lib/acceptance-runner.cjs` (`ensureAps` → `generateTests`
   → `runTestsSequentially`), even though the exported
   `runComponentAcceptance({ root, acceptanceDir, repoRoot })` wrapper exists
   precisely for the standard component layout used by `client` and `indexer`.
   Replaced the ~45-line copy with the same thin adapter the other components
   use. This removes a second place to maintain the pipeline and makes the cli
   runner consistent with its siblings.

2. **DRY duplicate in the new unit tests (fixed).** `dry4javascript` reported a
   score-1.00 duplicate for the identical `let err / try / catch / assert`
   blocks in the three `#memo-db` error tests. Introduced a `captureError`
   helper and converted the cases to a table-driven loop; the second run is
   clean. Coverage and assertion strength are unchanged.

3. **Tool-written manifests recorded.** Committed the `mutate4javascript`
   manifests the tool embedded in `src/lib/memo-db.js` and `config/index.js`,
   and the `acceptance-mutation-manifest` the soft Gherkin run wrote into
   `specs/memo-db-client.feature`. No manifest was hand-edited.

Structure reviewed: `src/lib/memo-db.js` is a pure, injectable HTTP client
(`fetch` injected, endpoint resolution pure) with no framework/IO leakage;
`config/index.js` depends inward on the pure resolver. The acceptance
generator/runtime/handlers/runner-worker mirror the established per-component
pattern and the runner-worker applies the DB-proven `narrowToChanged` scoping.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, differential with
automatic `--mutate-all` re-run on under-selection, `--max-workers 8`):
`src/lib/memo-db.js` **4 killed / 0 survived / 0 uncovered**;
`config/index.js` **2 killed / 0 survived / 0 uncovered**. No intrinsic
equivalents.

**DRY** (`dry4javascript`, scoped to the changed production files, adapters, and
tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`):
**23 mutations considered, 12 killed, 11 survived, 0 errors** (4 mutations for
the already-covered Scenario 2 were skipped by the manifest). The 11 survivors
are all the documented intrinsic-equivalent class for read-only features — the
example value is used consistently on both the setup and assertion sides, so a
per-value mutation passes both:
- `env_url` in Scenario 3 (`m6`, `m9`): the `--db-url` flag overrides it, so the
  cell is decorative in that outline.
- `limit`/`offset` in Scenario 4 (`m12`, `m17`, `m20`): substituted into both the
  request and the "service received" assertion.
- `count` in Scenarios 4–5 (`m15`, `m23`, `m25`): the example's `limit` makes the
  served count over-determined (the `count` mutations on rows where it *does*
  bind are killed).
- `viewer`/`addr` case flips (`m24`, `m26`, `m27`): used consistently on both
  sides, as in prior read-only features.
These are test-input equivalences, not implementation gaps; documented rather
than chased, per the standing precedent.

**Suite status** (`verify.sh cli`, record `c881811`): unit **99 passing / 100%
statements-branches-functions-lines**, property **10 pass / 0 fail**,
acceptance **1 suite (12 scenarios) passed**, lint clean — **pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task
  `cli-memo-db-client`; review commit `c881811`.
- No follow-up work identified for the coder or refactorer.

By architect.
