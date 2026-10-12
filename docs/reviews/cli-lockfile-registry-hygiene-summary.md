# Architect review — `cli-lockfile-registry-hygiene`

**Role**: architect
**Task**: `cli-lockfile-registry-hygiene` (F4, `psf-memo-cli` only)
**Batch**: CLI hygiene batch `20261012T235120Z_000001` (item 1 of 3)
**Reviewed commits**: `a63a6ec` (specifier, feature) → `6456879` (coder,
repoint the lockfile to public npm) → `2acbc0d` (merge coder into refactorer)
→ `a7120a3` (refactorer, extract the pure lockfile rules)
**Merge**: `2fc914f` (merge `a7120a3b5e` into `swarmforge-architect`)
**Review commit**: `fcaa333` (shared batch review)
**Verification record**: `docs/reviews/cli-lockfile-registry-hygiene-verification.json`
(`git_sha` `fcaa333eb72a4a8a87746e140ee765e757e236dd`)

## Scope

`psf-memo-cli/package-lock.json` pinned `bch-token-sweep@2.2.1` to a private
registry (`http://94.130.170.209:4873/...`) that is unreachable off the PSF
network, so `npm install`/`npm ci` failed on a fresh machine although the same
tarball and integrity hash are published on public npm. The coder repointed the
`resolved` URL to `https://registry.npmjs.org/` and left the `integrity` hash
unchanged, so this is a registry correction, not a content change. The feature
pins the install contract with a Gherkin scenario plus a property suite.

## Architectural findings

- **The fix is correctly scoped and safe.** Only the `resolved` field changed;
  the existing `integrity` hash is retained, proving the tarball is identical.
  `bch-token-sweep` is the only package that pointed off-registry; the
  acceptance rule enforces that for every http(s)-resolved entry going
  forward.
- **The refactorer's extraction is sound.** `acceptance/lib/lockfile.js` now
  holds the pure classifier `nonPublicRegistryResolves` and the
  `lockedPackage` lookup with no IO. The acceptance step reads the real
  lockfile once and injects it into the pure rules; the property test drives
  synthetic lockfiles. That is a clean testable boundary with information
  hiding preserved.
- **No production JS changed.** Language mutation applies to testable
  production modules; this task changes only the lockfile and the acceptance
  layer, so there is no `src/` mutation target. The new rules are covered by
  the new property suite and the acceptance scenarios.
- **Cross-task cleanup.** Removing the now-unused `shelljs` dependency (see the
  `cli-wallet-list-empty-store` review) also deletes several public-registry
  entries from this lockfile; the install-contract rule still passes.

## Verification

### Language mutation
No `src/` production module changed, so `mutate4javascript` had no target.

### DRY (`dry4javascript`, scoped to the changed files)
```
No duplicate candidates found.
```

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)
| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/cli-lockfile-registry-hygiene.feature` | 0 | 0 | 0 | 0 |

Structural zero: the feature uses plain `Scenario`s with inline literal values,
not `Scenario Outline`s with `Examples` tables, so there are no example values
to mutate. The tool wrote a `mutation-stamp` plus an empty `scenarios: []`
manifest, committed as-is. (Specifier owns the feature; flagged for the
next feature.)

### Canonical suite (`verify.sh cli`, at `fcaa333`)
| Command | Result |
|---------|--------|
| unit | 705 passing |
| property | 162 pass / 0 fail |
| acceptance | all 47 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record:
`docs/reviews/cli-lockfile-registry-hygiene-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `cli-lockfile-registry-hygiene`, batch commit `fcaa333`.
