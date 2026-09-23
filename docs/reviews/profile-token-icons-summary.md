# Profile Token Icons — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `profile-token-icons` (refactorer handoff
  `merge_and_process refactorer d2a8f2047a`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `d9a6371`). Commits:
  - `37d0258` Record profile-address-copy completion in backlog and briefing
    (specifier/master)
  - `199af1d` Add profile token icons specification (specifier/master)
  - `4acb8a3` Implement profile token icons (coder)
  - `d2a8f20` Add property tests for profile token icons (refactorer)
- Architect review commit: `6e76766228` — a mutation-killing unit test, a DRY
  refactor of the new acceptance assertions, and the tool-written
  `mutate4javascript` / `gherkin-mutator` manifests. No production behavior
  changed.
- Records/summary commit: this commit.

The `/profile/:addr` sidebar now shows a row of small (30 px) SLP token icons
for the SLP tokens held by the profile address. Each icon prefers the token's
mutable-data image (an http `fullSizedUrl` wins over the `tokenIcon`) and falls
back to a jdenticon derived from the token id. Icons carry the token id as a
native tooltip, expose the token label as an accessible label, link to the
Tokentiger explorer in a new tab, and wrap to multiple rows. A profile with no
tokens, or a token lookup that fails, shows no icons and does not error. This
is a read-only rendering feature in `psf-memo-client`: it broadcasts no Memo
action and changes no DB data.

## Architectural review

- **UI/Core separation (good).** The image/label/explorer decisions live in the
  pure `src/services/profile-token-icons.js` view model (no imports, no IO).
  The `ProfilePage` controller loads tokens through an injected `tokenSource`,
  preferring `getTokenData2` over `getTokenData`, and enrichment is injected so
  the controller stays free of wallet/network concerns.
  `src/components/app-body/profile/profile-token-icons.js` is a presentational
  plain-`createElement` component with no IO, shared by the browser shell and
  the Node acceptance adapter `acceptance/lib/render-profile-token-icons.js`.
  Core behavior is exercised under plain `node --test` with no browser.
- **Dependency rule (good).** The view model is a leaf; the controller depends
  inward on the pure `profile-token-icons`/`block-explorer`/`broadcast-result`
  services; the component depends only on React and jdenticon; the shell and
  the acceptance adapter depend on the controller/component. No low-level or
  framework dependency crosses inward.
- **Information hiding and encapsulation (good).** The controller exposes only
  `loadTokenIcons()`/`getTokenIcons()` and returns the loaded icons from
  `load()`; the fetching/enrichment fallbacks and the per-token failure
  isolation are private. The component sees only the view-model fields. A
  token-list failure is swallowed at the controller boundary so a missing
  token source or a failed lookup degrades to "no icons" rather than an error.
- **Local code quality (good).** `_withMutableData` isolates a per-token
  metadata failure to that token; `_tokenDataFetcher` keeps the
  `getTokenData2`/`getTokenData` fallback in one place; the empty/
  non-array/non-function guards are explicit. Max CC 5 / CRAP 5.0.
- **Accepted tradeoff (documented, not changed).** Token loading lives in
  `ProfilePage` rather than a separate token service. It is a cohesive part of
  the page's `load()` orchestration and is injected/testable; extracting it
  would add an indirection with a single consumer and split the page's load
  sequence. Left as delivered.

## Fixes applied

- **Mutation survivor killed (test hardening).** `ProfilePage.loadTokenIcons`
  guards `!this.tokenSource || typeof this.tokenSource.listTokens !==
  'function' || !this.addr`. The first language-mutation run left one survivor
  on the second `||`: the `!this.addr` branch was never exercised with a valid
  token source, so a mutated `|| -> &&` that proceeds to `listTokens(null)`
  was not detected. Added a unit test in
  `test/unit/profile-page-tokens.test.js` that supplies a valid `listTokens`
  but a null address and asserts no listing happens and no icons are built.
  Re-run: 42 killed / 0 survived / 0 uncovered.
- **DRY local to the task (acceptance handlers).** `dry4javascript` flagged the
  three new token-icon acceptance `run` bodies (image/tooltip/label) as
  score-1.00 duplicates. Extracted one `assertTokenIconField` helper in
  `acceptance/lib/handlers.js` that checks the view-model field and the
  rendered HTML attribute; the three handlers are now one call each. The
  remaining 102 duplicate blocks in `handlers.js` are pre-existing
  follow/mute/poll step-handler boilerplate and are left as-is (documented
  precedent).
- **Tool-written metadata.** `mutate4javascript` manifests for the three
  changed production files and the `gherkin-mutator` soft-mutation manifest on
  `specs/profile-token-icons.feature`.

## Verification results

Record (pinned to the review commit `6e76766228`):

| File | Component |
|------|-----------|
| `docs/reviews/profile-token-icons-verification.json` | psf-memo-client |

- **Language mutation** (`swarmforge/scripts/mutate-file.sh <file>
  --max-workers 8`, one file at a time, differential with automatic
  `--mutate-all` re-run on under-selection; no differential under-selection):
  - `src/services/profile-token-icons.js`: **5 killed, 0 survived, 0
    uncovered**.
  - `src/components/app-body/profile/profile-token-icons.js`: **3 killed, 0
    survived, 0 uncovered**.
  - `src/services/profile-page.js`: **42 killed, 0 survived, 0 uncovered**
    (after the hardening test; the first run was 41 killed / 1 survived / 0
    uncovered).
  - The JSX shell (`src/components/app-body/profile/index.js`) remains
    excluded: `mutate4javascript` cannot parse JSX (no plugin), as in prior
    reviews; its behavior is exercised end-to-end through acceptance.
- **DRY** (`dry4javascript`, scoped):
  - production (`profile-token-icons.js` service and component,
    `profile-page.js`): **"No duplicate candidates found."**
  - tests/adapter (`test/unit/profile-token-icons.test.js`,
    `test/unit/profile-page-tokens.test.js`,
    `test/unit/profile-token-icons-component.test.js`,
    `test/property/profile-token-icons.property.test.js`,
    `acceptance/lib/render-profile-token-icons.js`): **"No duplicate
    candidates found."**
  - `acceptance/lib/handlers.js`: the three new token-icon handlers no longer
    participate in a duplicate block (102 pre-existing boilerplate duplicates
    remain; none reference the new handler range).
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the three changed
  production files, 100% coverage): max **CC 5 / CRAP 5.0**
  (`ProfilePage.loadTokenIcons`); `tokenIconUrl`/`_broadcastMute` CC 4;
  `_assertReady`/`_loadState`/`_tokenDataFetcher`/`_withMutableData`/
  `copyAddress`/`load`/`ProfileTokenIcon`/`ProfileTokenIcons`/`tokenLabel`
  CC 3; everything else ≤ 2. Exit 0 (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the client runner worker and `--json`):
  - `psf-memo-client/specs/profile-token-icons.feature`: **18 total, 18 killed,
    0 survived, 0 errors.** The tool wrote a per-scenario `killed` manifest
    (no equivalents).
- **Suite status**: `verify.sh client` **result: pass (5/5)** at `git_sha
  6e76766228`:
  - unit **605 pass / 0 fail** (604 delivered; +1 hardening test)
  - property **161 pass / 0 fail** (153 before; the refactorer added the token
    icon property suite)
  - acceptance **all 41 generated suites passed** (40 before; the new
    `profile-token-icons` suite adds 9 scenarios)
  - lint ok
  - build ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit
  `6e76766228`.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only a hardening test, an acceptance test-support refactor,
  and tool-written mutation/acceptance metadata.
