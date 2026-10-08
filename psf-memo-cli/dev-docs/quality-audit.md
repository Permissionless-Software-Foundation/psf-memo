# psf-memo-cli Quality Audit (X5)

**Task name:** `cli-quality-audit`
**Owner:** specifier (specification); coder (tests/fixes); refactorer (CRAP/DRY);
architect (full mutation audit, verification, record).
**Status:** DRAFT — awaiting user approval to hand off.
**Backlog item:** X5 in `psf-memo-cli/dev-docs/feature-backlog.md`.

X5 is a quality/verification deliverable, not runtime behavior. There is **no
Gherkin feature and no Gherkin acceptance mutation** for this task; the
architect verifies against the checklist below. `verify.sh cli` must pass
unchanged.

## Goal

Re-establish and lock the full-component `cli-quality-hardening` baseline across
the complete `psf-memo-cli` command set, and close any quality gap that appeared
while the command set grew.

The `cli-quality-hardening` baseline (`docs/reviews/cli-quality-hardening-summary.md`)
was recorded when the component had ~14 `src/` files. The CLI now has 39
commands and 45 `src/lib` modules. Each feature's architect review verified only
the files that feature changed, so no whole-component audit has run since. Every
`memo-*` command ships unit tests, property tests where an invariant exists
(encoding, pagination, limit math), and Gherkin acceptance; X5 confirms the
whole component still meets the bar and fixes what does not.

## Current evidence (specifier, 2026-10-08, `master` `93edbec`)

Measured with `npm test` (the permitted test run, not a quality tool):

- Unit: **577 passing**.
- Coverage: statements/functions/lines **100%**; branches **99.69%** — two
  uncovered defensive branches:
  - `src/lib/memo-profiles.js:37` — `const avatar = profile.profilePicUrl || '(unset)'` (the falsy-`profilePicUrl` path).
  - `src/lib/wallet-list-command.js:38` — `const addresses = result[this.listField] || []` (the missing-list-field path).
- Property: `npm run property` **110 pass / 0 fail**.
- Gherkin acceptance: all generated suites pass (37 feature files).
- Lint: clean.

The two uncovered branches are the only known gap. The whole-component CRAP,
DRY, and mutation state has not been re-measured since the early baseline and is
in scope.

## Required final state (acceptance criteria)

1. `npm test` — every unit test passes with **100% statements, branches,
   functions, and lines** (no uncovered line in the coverage table).
2. `npm run property` — every property test passes.
3. `npm run acceptance` — every generated Gherkin acceptance suite passes.
4. `npm run crap` — **exit 0**, and every file's CRAP ≤ 6.0.
5. `npm run dry` — no duplicate candidates (accepted, documented exceptions are
   allowed only with a written rationale in the summary).
6. Language mutation (`../swarmforge/scripts/mutate-file.sh src/<file>.js
   --max-workers 8`, one file at a time) — across **every** `src/` file: **0
   survived / 0 uncovered**; intrinsic-equivalent survivors must be documented
   in the review summary, not silently accepted.
7. `npm run lint` — clean.
8. `swarmforge/scripts/verify.sh cli` — pass 4/4 (unit, property, acceptance,
   lint).

## Scope

- Every file under `psf-memo-cli/src/` (including the wallet/crypto commands
  carried over from `psf-bch-wallet`, `config/`, and `psf-memo-cli.js`).
- The full property suite (`test/property/`) and unit suite (`test/unit/`).
- The Gherkin acceptance pipeline (`acceptance/`) as run by `verify.sh cli`.

Out of scope: new behavior, new commands, and Gherkin acceptance mutation
(there is no feature for X5).

## Work breakdown

### Coder

- Add the missing unit/property coverage for the two uncovered branches:
  - `memo-profiles.js`: `formatProfilesMessage` with a profile whose
    `profilePicUrl` is missing/empty reports `(unset)` for the avatar while
    keeping the other fields.
  - `wallet-list-command.js`: the address-list `format` of a result whose list
    field is absent reports an empty list and its empty-list summary.
- Add a property test only where a genuine invariant lacks one; do not add
  property tests that duplicate an existing one.
- No production behavior change. If a branch is unreachable, document it for the
  refactorer rather than forcing a test.

### Refactorer

- Run `npm run crap`; reduce any file above CRAP 6.0 without behavior change.
- Run `npm run dry`; remove or justify duplicate candidates.
- Confirm the two coverage branches now have tests; if either default is dead,
  simplify it (removing the branch is an acceptable outcome) and re-run coverage.

### Architect

- Run the full language-mutation sweep, one `src/` file at a time, and kill the
  survivors; document intrinsic equivalents in the review summary.
- Run `npm run dry` and the standard per-component verification.
- Emit `docs/reviews/cli-quality-audit-verification.json` and
  `docs/reviews/cli-quality-audit-summary.md`, then hand off to the specifier
  for merge.

## Verification checklist (architect)

1. Unit suite green with a 100% branch coverage table (no uncovered line).
2. Property suite green.
3. Gherkin acceptance suite green.
4. CRAP exit 0, max ≤ 6.0.
5. DRY clean (or exceptions documented with rationale).
6. Language mutation 0 survived / 0 uncovered across `src/`; intrinsic
   equivalents listed.
7. Lint clean.
8. `verify.sh cli` pass 4/4, record committed.
9. Note in the review summary that soft Gherkin mutation is not applicable
   (no feature file for this task).

## Process

- Coder: add the tests, commit with `By coder.`, hand off to the refactorer.
- Refactorer: CRAP/DRY pass, commit with `By refactorer.`, hand off to the
  architect.
- Architect: full mutation audit + verification, commit records/summary with
  `By architect.`, hand off to the specifier for merge.

## Related

- Original baseline: `psf-memo-cli/dev-docs/quality-baseline.md` (historical;
  its "in progress" status is superseded by this audit).
- Baseline review: `docs/reviews/cli-quality-hardening-summary.md`.
