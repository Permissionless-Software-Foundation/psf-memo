# Architect review — `cli-wallet-list-empty-store`

**Role**: architect
**Task**: `cli-wallet-list-empty-store` (F5, `psf-memo-cli` only)
**Batch**: CLI hygiene batch `20261012T235120Z_000001` (item 2 of 3)
**Reviewed commits**: `cc48de8` (specifier, feature) → `6f50937` (coder, list
without a shell error on an absent/empty store) → `f854a0e` (merge coder into
refactorer) → `261ce11` (refactorer, property coverage for the store parse)
**Merge**: `2dce5c8` (merge `261ce111d1` into `swarmforge-architect`)
**Review commit**: `fcaa333` (shared batch review)
**Verification record**: `docs/reviews/cli-wallet-list-empty-store-verification.json`
(`git_sha` `fcaa333eb72a4a8a87746e140ee765e757e236dd`)

## Scope

`wallet-list` listed the wallet store with `shelljs.ls` over a glob path. On a
first run, when `.wallets/` had no `*.json`, that printed
`ls: no such file or directory: .../.wallets/*.json` to stderr before reporting
"No wallets found." The leak was cosmetic (stderr, so JSON parsing still
worked) but exposed an implementation detail. The command no longer shells
out.

## Architectural findings

- **The coder's change improves the boundary.** `parseWallets` now uses
  `fs/promises.readdir`, treats `ENOENT` as an empty store, filters to `*.json`,
  sorts for a stable order, and strips the extension — replacing shell-glob
  output parsing and index-based string slicing. The store is an injected
  adapter (`readdir` plus `walletDir`), so `parseWallets` is fully unit- and
  property-testable without touching the real directory or a shell. Errors
  other than `ENOENT` still propagate.
- **Fix applied — removed the now-unused `shelljs` dependency.** With the last
  `shelljs` usage gone, the declared dependency was dead weight. I removed it
  from `package.json` and regenerated `package-lock.json`
  (`npm uninstall shelljs --package-lock-only --offline`): 1 insertion, 56
  deletions, no transitive churn to packages other dependencies still use.
  Removing it also drops its public-registry entries from the lockfile checked
  by the `cli-lockfile-registry-hygiene` install contract, which still passes.
- **No other structural changes needed.** `WALLETS_DIR` is a module constant
  derived from the command directory and is overridable for tests; the table
  renderer stays a pure function returned to the reporter.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)
| File | Total | Selected | Killed | Survived |
|------|-------|----------|--------|----------|
| `src/commands/wallet-list.js` | 4 | 4 | 4 | 0 |

The differential pass selected 1 changed site; `mutate-file.sh` detected the
under-selection and re-ran all 4 with `--mutate-all`. All killed.

### DRY (`dry4javascript`, scoped to the changed files)
```
No duplicate candidates found.
```

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)
| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/cli-wallet-list-empty-store.feature` | 0 | 0 | 0 | 0 |

Structural zero: plain `Scenario`s with inline literal values, no `Examples`
tables. The tool wrote a `mutation-stamp` plus an empty `scenarios: []`
manifest, committed as-is.

### Canonical suite (`verify.sh cli`, at `fcaa333`)
| Command | Result |
|---------|--------|
| unit | 705 passing |
| property | 162 pass / 0 fail |
| acceptance | all 47 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record:
`docs/reviews/cli-wallet-list-empty-store-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `cli-wallet-list-empty-store`, batch commit `fcaa333`.
