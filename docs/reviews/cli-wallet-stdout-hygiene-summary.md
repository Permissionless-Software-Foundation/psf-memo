# Architect review — `cli-wallet-stdout-hygiene`

**Role**: architect
**Task**: `cli-wallet-stdout-hygiene` (F3, `psf-memo-cli` only)
**Reviewed commits**: `c71bfcf` (specifier, feature + docs) → `365695e`
(coder, wallet banner filter + reporter wiring) → `7b8275e` (merge coder
into refactorer) → `1cc814e` (refactorer, shared JSON assertion + console
capture)
**Merge**: fast-forward of `refactorer 1cc814efe5` into `swarmforge-architect`
**Review commit**: `a9d6c475de` (unused seam removed, default-mode tests added,
manifests recorded)
**Verification record**: `docs/reviews/cli-wallet-stdout-hygiene-verification.json`
(`git_sha` `a9d6c475de8dd7105973f4adcc7298a4afbe2025`)

## Scope

`minimal-slp-wallet` logs its router-initialization banner with `console.log`
during wallet construction. That bypasses the reporter and lands on process
stdout ahead of the command result, breaking the one-JSON-object contract
(`--json | jq`). This feature filters exactly that banner at the reporter's
command boundary: JSON mode drops it (stdout stays one JSON object, stderr one
JSON error on failure) and human mode routes it to stderr. Only `psf-memo-cli`
is touched.

## Architectural findings

- **The single-boundary filter at `runCommand` is the right place.** Wallet
  construction is spread across many modules (`send-command.js`,
  `wallet-source.js`, `wallet-balance.js`, `msg-sign.js`, `wallet-sweep.js`,
  `write-command.js`, plus the read commands that resolve a viewer wallet via
  `resolveWalletSource`). Every one of those constructs its wallet inside the
  callback handed to `runCommand`, so a single `withWalletBanner` wrapper at the
  reporter boundary covers every wallet-backed command without duplicating the
  workaround at each construction site.
- **The dependency direction is acceptable.** `reporter.js` (output policy)
  imports `wallet-banner.js` (a small, pure leaf helper for the library quirk);
  the dependency is one-directional and cycle-free, and every function is
  unit-testable with injected streams. Generalizing the seam further (a generic
  console guard injected per command) would spread wallet knowledge across the
  command wiring and add indirection for no current benefit.
- **The refactorer's extractions remove real duplication.**
  `parseSingleJsonObject` now lives in `acceptance/lib/step-support.js` and is
  shared by the output-contract and wallet-stdout-hygiene steps; `withConsoleLog`
  in `test/support/capture.js` shares the `console.log` redirection between the
  acceptance and unit harnesses. Test separation is preserved: the property suite
  is a separate `test/property/` file and the canonical runner executes it as its
  own command.
- **Fidelity note (not a defect).** The filter patches `console.log` only. That
  matches the observed library behavior (the banner is a `console.log` call) and
  the acceptance step models exactly that; a library switch to
  `process.stdout.write` would need a wider guard.

## Fixes applied

- **Removed the unused `log` injection from `withWalletBanner`.** No caller ever
  passed it, so `log || original` had an unkillable mutation survivor and the
  parameter was dead API surface. The wrapper now passes the captured `original`
  console.log to `createWalletLog` directly.
- **Added unit tests for the default human-mode branch** of `createWalletLog`
  and `withWalletBanner`, covering the `json = false` default that the existing
  tests always overrode explicitly. This kills the two remaining `false -> true`
  default survivors.
- **Recorded the tool-written manifests**: the `mutate4javascript` manifests in
  `reporter.js` and `wallet-banner.js`, and the empty `gherkin-mutator` soft
  manifest in the feature file.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Selected | Killed | Survived |
|------|-------|----------|--------|----------|
| `src/lib/wallet-banner.js` | 4 | 4 | 4 | 0 |
| `src/lib/reporter.js` | 4 | 1 | 1 | 0 |

`wallet-banner.js` first ran with 5 sites and 3 survivors; the fixes above
removed one site and killed the other two, leaving 4/4 killed. `reporter.js` only
re-selected its one changed `runCommand` site (differential), which was killed.

### DRY (`dry4javascript`, scoped to the changed files)

```
No duplicate candidates found.
```

### Cyclomatic complexity (`crap4javascript`, changed `src/` files)

All changed functions are 100% covered and well below the threshold of 8.0:
`runCommand` (CC 3, CRAP 3.0), `isWalletBanner` (CC 2, CRAP 2.0),
`createWalletLog`/`withWalletBanner` (CC 1, CRAP 1.0). Exit code 0.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/cli-wallet-stdout-hygiene.feature` | 0 | 0 | 0 | 0 |

Structural zero: this feature uses plain `Scenario`s with inline literal values,
not `Scenario Outline`s with `Examples` tables, so `gherkin-mutator` has no
example values to mutate. The tool wrote a `mutation-stamp` plus an empty
`scenarios: []` manifest, committed as-is.

### Canonical suite (`verify.sh cli`, at `a9d6c475de`)

| Command | Result |
|---------|--------|
| unit | 702 passing |
| property | 158 pass / 0 fail |
| acceptance | all 45 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record:
`docs/reviews/cli-wallet-stdout-hygiene-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `cli-wallet-stdout-hygiene`, review commit `a9d6c475de`.
