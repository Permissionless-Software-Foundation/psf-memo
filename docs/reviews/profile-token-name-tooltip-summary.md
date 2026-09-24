# Profile Token Name Tooltip — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `profile-token-name-tooltip` (refactorer handoff
  `merge_and_process refactorer b14501ee03`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `97067aa`). Commits:
  - `c3784b7` Record profile-token-icons-fetch completion in backlog and
    briefing (specifier/master)
  - `3164d18` Specify profile token name tooltip (specifier/master)
  - `4e65bbc` Show the token name tooltip after profile token data loads
    (coder)
  - `b14501e` Extend property tests for token name tooltips and token data
    (refactorer)
- Architect review commit: `79cf58455b` — four mutation-killing unit tests plus
  the tool-written `mutate4javascript` / `gherkin-mutator` manifests. No
  production behavior changed.
- Records/summary commit: this commit.

The `/profile/:addr` token icons now load in two phases. Phase one lists the
profile's SLP tokens and renders an icon per token immediately, with the token
ID as the native tooltip and a jdenticon placeholder. Phase two retrieves each
token's token data (its genesis record and its IPFS mutable-data record) in one
`getTokenData` call, then rebuilds the icons: the tooltip becomes the genesis
name and the mutable-data image resolves. A token whose genesis record has no
name, or whose token data cannot be retrieved, keeps the token-ID tooltip and
its placeholder jdenticon. The controller notifies an injected
`onTokenIconsChange` listener so the React shell updates the sidebar, and a
destroyed page does not notify. Read-only: no Memo broadcast, no DB change.

## Architectural review

- **UI/Core separation (good).** The controller owns the two-phase load and
  exposes `loadTokenIcons()` / `loadTokenData()` / `getTokenIcons()`; the
  token source and the change listener are injected. The React shell only
  wires them (`onTokenIconsChange: setTokenIcons`) and triggers phase two after
  `load()`. Core behavior runs under plain `node --test` with no browser.
- **Dependency rule (good).** The controller depends inward on the pure view
  model and the shared `token-mutable-data` service; the shell depends on the
  controller. No IO/framework dependency crosses inward.
- **Information hiding and encapsulation (good).** `_setTokenIcons` keeps the
  notify/destroy guard private; the per-token failure isolation and the
  no-refetch guard stay private. `resolveTokenData` returns exactly the two
  facts the controller needs (`name`, `mutableData`), and
  `resolveTokenMutableData` now wraps it instead of duplicating the
  `getTokenData` call.
- **Local code quality (good).** The tooltip decision is a single pure line in
  `buildTokenIcon` (`token.genesisName || token.tokenId`); the two-phase split
  keeps phase one free of wallet round-trips. Max CC 6 / CRAP 6.0.
- **Stale-notification safety (good).** `destroy()` sets a `destroyed` flag and
  `_setTokenIcons` suppresses the listener after destruction, so a late async
  token-data load cannot overwrite a newer page's icons.
- **Accepted observation — the no-refetch guard treats either resolved fact as
  "done" (documented, not changed).** `loadTokenData` skips a token when it
  already has a `genesisName` **or** `mutableData`. If a real `listTokens` ever
  returned a resolved `mutableData` without a genesis name, that token would
  keep the token-ID tooltip. The wallet's `listTokens` does not return mutable
  data today (the `/slp-tokens` page loads icons lazily and stores `icon`
  separately), and the unit/property tests pin the current contract, so this is
  not reachable in the shipped path.
- **Accepted observation — `resolveTokenMutableData` is now a convenience
  export with no production consumer (documented, not changed).** It remains a
  small, tested part of the shared service's public surface (resolve only the
  mutable-data record) and wraps `resolveTokenData`; removing it would reduce
  the service API but churn its tests for no behavior change.

## Fixes applied

Four language-mutation survivors in `profile-page.js` were killed with focused
unit tests (all in `test/unit/profile-page-tokens.test.js`):

- **Empty second phase (`loadTokenData` line 117 `|| -> &&`).** With no tokens,
  `loadTokenData` must return the existing icons without rebuilding/notifying.
  Added a unit test that loads an empty list and asserts the icon array identity
  is unchanged and the change listener fired once (phase one only).
- **Genesis-name-only prefetch (`line 121` first `||`).** Added a unit test
  that a token carrying only `genesisName` is not re-fetched and keeps its name
  tooltip.
- **Mutable-data-only prefetch (`line 121` second `||`).** Added a unit test
  that a token carrying only `mutableData` is not re-fetched and keeps its
  image and token-ID tooltip.
- **Destroyed-page guard (`destroy` line 263 `true -> false`).** Added a unit
  test that `destroy()` then `loadTokenData()` does not fire the change
  listener.

Re-run: **50 killed / 0 survived / 0 uncovered** (first run 46 killed / 4
survived). Tool-written manifests were refreshed for
`src/services/token-mutable-data.js`, `src/services/profile-token-icons.js`,
`src/services/profile-page.js`, and `specs/profile-token-icons.feature`.

## Verification results

Record (pinned to the review commit `79cf58455b`):

| File | Component |
|------|-----------|
| `docs/reviews/profile-token-name-tooltip-verification.json` | psf-memo-client |

- **Language mutation** (`swarmforge/scripts/mutate-file.sh <file>
  --max-workers 8`, one file at a time, differential with automatic
  `--mutate-all` re-run on under-selection):
  - `src/services/token-mutable-data.js`: **8 killed, 0 survived, 0
    uncovered**.
  - `src/services/profile-token-icons.js`: **3 killed, 0 survived, 0
    uncovered**.
  - `src/services/profile-page.js`: **50 killed, 0 survived, 0 uncovered**
    (after the hardening tests; the first run was 46 killed / 4 survived / 0
    uncovered).
  - The JSX shells (`src/components/app-body/profile/index.js`,
    `src/components/app-body/slp-tokens/index.js`) remain excluded:
    `mutate4javascript` cannot parse JSX (no plugin), as in prior reviews; their
    behavior is exercised end-to-end through acceptance.
- **DRY** (`dry4javascript`, scoped):
  - production (`token-mutable-data.js`, `profile-token-icons.js`,
    `profile-page.js`, `src/components/app-body/profile/index.js`): **"No
    duplicate candidates found."**
  - tests (`test/unit/profile-page-tokens.test.js`,
    `test/unit/token-mutable-data.test.js`,
    `test/unit/profile-token-icons.test.js`,
    `test/property/token-mutable-data.property.test.js`,
    `test/property/profile-token-icons.property.test.js`): **"No duplicate
    candidates found."**
  - `acceptance/lib/handlers.js`: 102 pre-existing boilerplate duplicates
    (unchanged); none of the changed regions (wallet fake, token fixture, the
    new token-data/tooltip handlers) participates in a candidate.
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the three changed
  production files, 100% coverage): max **CC 6 / CRAP 6.0**
  (`ProfilePage.loadTokenIcons`, `resolveMutableDataRecord`,
  `tokenIconFromMutableData`); `ProfilePage.loadTokenData` and
  `resolveTokenData` CC 5; the rest ≤ 4. Exit 0 (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the client runner worker and `--json`):
  - `psf-memo-client/specs/profile-token-icons.feature`: **28 total, 28 killed,
    0 survived, 0 errors.** The scenario set changed (12 scenarios), so no
    manifest entries were reusable and every mutation ran fresh.
- **Suite status**: `verify.sh client` **result: pass (5/5)** at `git_sha
  79cf58455b`:
  - unit **629 pass / 0 fail** (625 delivered; +4 hardening tests)
  - property **172 pass / 0 fail**
  - acceptance **all 41 generated suites passed** (the `profile-token-icons`
    suite now covers 12 scenarios)
  - lint ok
  - build ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit
  `79cf58455b`.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only hardening tests and tool-written mutation/acceptance
  metadata.
