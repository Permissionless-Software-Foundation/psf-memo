# Architect review — `set-bio-existing-and-cancel`

**Role**: architect
**Task**: `set-bio-existing-and-cancel` (client-only, `psf-memo-client`)
**Reviewed commits**: `a18907c` (specifier, scenarios) → `83bc238` (coder) →
`f6e4a50` (refactorer)
**Merge**: `f9f364773b` (refactorer `swarmforge-refactorer` → `swarmforge-architect`)
**Review commit**: `9cd5166b72` (test-world extraction + tool-written manifests)
**Verification record**: `docs/reviews/set-bio-existing-and-cancel-verification.json`
(`git_sha` `9cd5166b723e31b0e64ca28c3d20d7e387820517`)

## Scope

Add the existing-bio display and the Cancel path to the Set Bio page. The task
touches only the client: the spec (`specs/set-bio.feature`), the page controller
(`src/services/set-bio-page.js`), the shared base (`src/services/profile-text-page.js`),
the view (`src/components/app-body/set-bio/index.js`), the acceptance handlers,
and the unit/property tests.

## Architectural findings

- **UI/Core separation holds.** The view builds the `MemoSetBio`/`SetBioPage`
  controller once per render and delegates both the existing-bio read and the
  cancel navigation to it. No wallet, profile-store, or address logic remains in
  the JSX beyond passing the injected dependencies; the page behavior is
  exercisable without a browser.
- **Dependency rule holds.** No new outward dependencies were introduced. The
  read path goes through the injected profile store; the view depends on the
  controller, and the controller on the shared `ProfileTextPage` base.
- **`cancel()` belongs in the base.** Adding it to `ProfileTextPage` (rather
  than only `SetBioPage`) keeps the "leave without submitting, return to the
  account page" rule in one place, alongside the existing `successPath`, and is
  available to the sibling Set Name / Set Avatar URL pages without forcing any
  behavior on them. This maximizes cohesion of the profile-text page family.
- **Encapsulation is adequate.** `SetBioPage.getExistingBio()` owns the
  address→bio lookup and the null-when-absent semantics; `hasExistingBio()` /
  `showsNoExistingBio()` expose only the predicate the view and acceptance
  steps need. There is a small conceptual overlap with
  `AccountPage._getProfileField('getBio')`; consolidating those into a shared
  profile-read helper would touch `AccountPage` (a separate, well-covered
  controller with its own `addr` fallback) and is a broader cross-module change
  than this handoff warrants. Accepted as local duplication and noted for a
  future profile-read extraction.
- **Acceptance boundary unchanged.** The shared `I click the cancel button`
  step now dispatches to the like-tip modal or the Set Bio page; this is
  test-glue branching between two existing worlds and does not leak into
  production modules.

## Fixes applied

- **DRY:** the new unit suite duplicated the property suite's wallet/profile
  factories. Extracted `makeWallet`, `makeProfiles`, and `makeMemoSetBio` into
  `test/support/set-bio.js` (the established shared-helper pattern, cf.
  `test/support/address-copy.js`) and imported them from both suites, keeping
  tests separate from test helpers.
- **Manifests:** recorded the `mutate4javascript` manifest for
  `set-bio-page.js` (new file to mutation) and refreshed it for
  `profile-text-page.js` (new `cancel`), and the Gherkin mutation manifest for
  `specs/set-bio.feature`. Tool-written; committed as-is.

## Verification

### Language mutation (`mutate4javascript`, `--mutate-all --max-workers 8`)

| File | Covered | Killed | Survived | Uncovered |
|------|---------|--------|----------|-----------|
| `src/services/set-bio-page.js` | 7 | 7 | 0 | 0 |
| `src/services/profile-text-page.js` | 3 | 3 | 0 | 0 |

`--mutate-all` was used because both files added functions (`getExistingBio` +
helpers, and `cancel`), avoiding differential under-selection.

### DRY (`dry4javascript`, scoped to changed files + helper)

One remaining score-1.00 duplicate: the two `remainingCount` unit tests
(ASCII `hello` vs multi-byte `é`). These assert deliberately different byte
values and are clearer as separate cases; the duplication is intentional
table-like repetition and was not reduced. The extracted helper removes the
prior `makeWallet` duplicate.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`specs/set-bio.feature`: **17 mutations, 11 killed / 6 survived / 0 errors**.
All survivors are intrinsic equivalents — single-character case flips of
example values used consistently on both the setup and assertion sides, or
inside an over-limit bio where the byte length is unchanged:

| ID | Path | Reason |
|----|------|--------|
| m1 | scenario 0 text | input == expected broadcast, self-consistent |
| m2 | scenario 0 text | self-consistent case flip |
| m4 | scenario 2 over-limit text | still over the limit, still rejected |
| m5 | scenario 2 over-limit text | still over the limit, still rejected |
| m9 | scenario 3 byte-counter text `hello` | case flip preserves byte length |
| m13 | scenario 3 over-limit text | still over the limit, still rejected |

The new behavior is covered: scenario 6 existing-bio mutations **m14–m17 were
all killed** (both `stored_bio` and `shown_bio` for both example rows), and the
empty-bio scenario (m3/m7) and byte-counter `count` mutations (m6, m8, m10,
m12) were killed.

### CRAP / cyclomatic complexity (`crap4javascript`)

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `SetBioPage.getExistingBio` | 5 | 100% | 5.0 |
| all others | ≤ 2 | 100% | ≤ 2.0 |

Exit 0 (threshold 8.0). No function exceeds the threshold.

### Canonical suite (`verify.sh client`, at `9cd5166b72`)

| Command | Result |
|---------|--------|
| unit | 778 pass / 0 fail |
| property | 217 pass / 0 fail |
| acceptance | all 48 suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/set-bio-existing-and-cancel-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `set-bio-existing-and-cancel`, commit `9cd5166b72`.
