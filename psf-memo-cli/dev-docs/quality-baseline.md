# psf-memo-cli Quality Baseline

**Task name:** `cli-quality-hardening`
**Owner:** specifier (routing); refactorer + architect (execution).
**Status:** in progress.

`psf-memo-cli` is a newly added monorepo component forked from
`psf-bch-wallet`. The language quality tooling (CRAP, mutation, DRY) is installed
and wired through npm scripts, and a baseline has been recorded. The component
predates any hardening, so the baseline is red. This task removes that debt
before feature work starts.

## Tooling already in place

Installed fresh from upstream and pinned in `package.json`:
`crap4javascript` (`32a11e7`), `mutate4javascript` (`553998e`),
`dry4javascript` (`8ba1585`).

```bash
cd psf-memo-cli
npm test                                   # 72 passing, 100% coverage
npm run crap                               # CRAP analyzer (exits 2 on threshold)
npm run dry                                # duplicate analyzer
npm run mutate -- src/<file>.js            # mutation testing (one file)
```

`target/` is git-ignored. `swarmforge/scripts/verify.mjs` now supports the
`cli` component; use `swarmforge/scripts/verify.sh cli --record ...`.

## Baseline (recorded 2026-10-06)

- Unit: 72 passing, 100% statements/branches/functions/lines.
- CRAP: **exit 2** — `SendTokens.validateFlags` CRAP 9.0 (> 8.0 gate).
  Also above the refactorer's <= 6 target: `MsgVerify.validateFlags` 7.0,
  `SendBch.validateFlags` 7.0.
- DRY: 4 exact structural duplicates (score 1.00): the `validateFlags` shape
  and the `run()` error shells.
- Mutation: **50 killed / 23 survived / 0 uncovered** across 11 files:
  `wallet-balance.js` 12, `wallet-list.js` 3, `config/index.js` 2,
  `wallet-create.js` 2, and one each in `send-bch.js`, `send-tokens.js`,
  `wallet-addrs.js`, `wallet-util.js`. No file exceeds 100 mutation sites
  (max 21), so no split is required.

## Refactorer work

- Run `npm run crap`; reduce CRAP to <= 6 for every `psf-memo-cli` source file.
- Run `npm run dry`; reduce the duplicate code where reasonable.
- Use `npm run mutate -- <file> --scan` only; do not run mutation tests.
- No behavior change. Verify with `npm test` and `npm run lint`.
- Commit and hand off to the architect (with the `-verification.json` record
  from `verify.sh cli`).

## Architect work

- Run language mutation one file at a time (from `psf-memo-cli/`, prefer
  `../swarmforge/scripts/mutate-file.sh src/<file>.js --max-workers 8`) and kill
  the survivors; document intrinsic equivalents in the review summary.
- There are no Gherkin specs for `psf-memo-cli`; note that soft Gherkin mutation
  is not applicable yet.
- Run `npm run dry` and the standard per-component verification.
- Emit `docs/reviews/cli-quality-hardening-verification.json` and
  `docs/reviews/cli-quality-hardening-summary.md`, then hand off to the
  specifier for merge.

## Known quirk

`mutate4javascript` runs `npm test`, which itself wraps mocha in `c8`; the
nested `c8` invocation is harmless (verified during setup).
