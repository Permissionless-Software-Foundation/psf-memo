# account-page-layout — Architect Review

Task: `account-page-layout`
Component: `psf-memo-client`
Base: `ec0235f` (profile-post-like backlog record); inbound refactorer batch
commit `9f07cb0d6c`

## What was reviewed

Inbound refactorer batch (priority 10, one item), merged onto
`swarmforge-architect` by fast-forward to `9f07cb0`. The linear chain reviewed:

- **`f96a182`** — specifier: *Specify account page layout*. Adds
  `psf-memo-client/specs/account-page-layout.feature` (15 scenarios: sidebar
  address + copy confirmation, bio/name display and fallbacks, SLP token icons,
  control descriptions, sidebar order). Replaces the account assertion in
  `account-avatar-display.feature` (jdenticon fallback) and the tautological
  account assertion in `set-avatar-url.feature` (now the rendered avatar image).
- **`30c00ae`** — specifier: *Moving profiles link up on the nav menu*. Swaps
  the Profiles and New Post nav links (nav ordering change, no behavior).
- **`3aebb4f`** — coder: *Implement account page sidebar and controls*. Gives
  `/account` the same sidebar as `/profile/:addr` (avatar with jdenticon
  fallback, bio/no-bio message, copyable BCH address with a transient
  confirmation, SLP token icons) and moves the Set Name / Set Bio / Set Avatar
  URL controls into the right column behind short descriptions. Adds the pure
  `AccountAvatar`, `AccountControls`, and `AccountSidebar` components, the
  `render-account-*` acceptance adapters and account step handlers, and unit
  tests.
- **`9f07cb0`** — refactorer: *Refactor account page: share token-icon and
  address-copy logic*. Extracts the two-phase SLP token-icon loading
  (`services/token-icon-loader.js`) and the transient address-copy confirmation
  (`services/address-copy.js`) used by both `AccountPage` and `ProfilePage`,
  removing the copied implementations. Adds shared setup helpers and the missing
  `copyAddress` error/destroy tests to `account-page.test.js`.

**Architect review commit: `8836f4c634`** — trims `token-icon-loader` to its two
public phase entry points, adds the account-sidebar default-state unit test that
closes the one language-mutation survivor, and carries the tool-written
mutation manifests for the changed production files and features. The
verification record and this summary are committed on top, so
`git diff 8836f4c634 HEAD` touches only `docs/`. The record's `git_sha` is
`8836f4c634`, the commit that contains the verified source state.

## Architectural findings and fixes applied

1. **UI/Core separation (good).** `AccountPage` is a pure controller: wallet,
   profile store, navigation, token source, clipboard, and timers are all
   injected; it imports no React, DOM, or network code. The sidebar, avatar, and
   controls are presentational and render under Node.
2. **Dependency rule (good).** The JSX page depends inward on the controller and
   the presentational components; `token-icon-loader`/`address-copy` depend only
   on pure services (`profile-token-icons`, `token-mutable-data`). No high-level
   module imports a low-level adapter.
3. **DRY (verified).** The refactorer's extraction removes the token-icon and
   address-copy duplication that the coder had copied between the two page
   controllers. `dry4javascript` scoped to the changed production files, tests,
   adapters, and the shared test helper reports **No duplicate candidates
   found.**
4. **Information hiding (fix applied).** `token-icon-loader.js` exported the
   internal steps `listTokens`, `resolveTokens`, and `applyTokenIcons`, but no
   module imported them. Trimmed `module.exports` to the two phase entry points
   (`loadTokenIcons`, `loadTokenData`); the list/resolve/apply steps remain
   implementation details, exercised through the public API and language
   mutation.
5. **Testable boundary (good).** The new `render-account-avatar`,
   `render-account-controls`, and `render-account-sidebar` adapters render the
   same components the browser uses. The components follow the established
   CommonJS `React.createElement` convention so they load under `node --test`.
   `components/app-body/account/index.js` is a JSX page and, like the other
   `app-body/*/index.js` pages, is not language-mutation-analyzed; its behavior
   is covered by acceptance.
6. **Mutation coverage (fix applied).** The account sidebar's `copied = false`
   default parameter survived (`false -> true`) because no test asserted that
   the copy confirmation is absent by default. Added that negative unit test;
   the re-run kills the site. All changed production files now report zero
   survivors.
7. **Noted, not changed.** `account-sidebar.js` reuses `profile-address` and
   `profile-token-icons` (cross-feature presentational reuse), and the profile
   page still has an inline `ProfileAvatar` that duplicates the account
   avatar/jdenticon rendering. Extracting a neutral shared avatar/sidebar
   component is a broad cross-module change beyond this handoff; the acceptance
   adapters already give stable boundaries. The `page`-passing helper style in
   `token-icon-loader`/`address-copy` couples the helpers to a small duck-typed
   page shape; it is a deliberate trade-off that removed duplicated page logic,
   and both controllers expose the same fields. Revisit only if a third consumer
   appears.

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`, differential)

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/services/account-page.js` | 32 | 0 | 0 |
| `src/services/profile-page.js` | 39 | 0 | 0 |
| `src/services/token-icon-loader.js` | 13 | 0 | 0 |
| `src/services/address-copy.js` | 1 | 0 | 0 |
| `src/components/account/account-avatar.js` | 1 | 0 | 0 |
| `src/components/account/account-controls.js` | 2 | 0 | 0 |
| `src/components/app-body/account/account-sidebar.js` | 1 | 0 | 0 |
| **Total** | **89** | **0** | **0** |

`account-page.js` and `profile-page.js` carried stale manifests from before the
feature; their differential runs selected the changed sites and the tool
rewrote the manifests to the current function set. `account-sidebar.js` required
the added default-state test described above. The wrapper's `--mutate-all`
fallback ran the account-sidebar site when the differential pass under-selected.

### DRY (`dry4javascript`, scoped)

`src/services/account-page.js`, `profile-page.js`, `address-copy.js`,
`token-icon-loader.js`, `src/components/account/{account-avatar,account-controls}.js`,
`src/components/app-body/account/account-sidebar.js`, the four account unit
tests, `test/support/address-copy.js`, and the three `render-account-*`
adapters: **No duplicate candidates found.**

### Cyclomatic complexity (`crap4javascript`, changed non-JSX files)

All functions are at 100% coverage. The highest CC values are `listTokens` (6),
`resolveTokens`/`loadTokenData` (5), and `AccountPage._getProfileField` /
`getTruncatedAddress` / `ProfilePage._broadcastMute` (4). Every CRAP value is
≤ 6.0, well under the 8.0 threshold.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

- `account-page-layout.feature`: **14 total, 10 killed, 4 survived, 0 errors.**
  The manifest records the two fully-killed outlines (scenarios 10 and 14). The
  four survivors (`m1`–`m4`) are single-character case changes to the bio and
  name outline example values, which are seeded into the profile store and
  asserted with the same value — self-consistent intrinsic equivalents.
- `account-avatar-display.feature`: **2 total, 0 killed, 2 survived, 0 errors.**
  Both are URL host-case changes, set and asserted with the same value —
  intrinsic equivalents; the tool wrote the expected empty manifest.
- `set-avatar-url.feature`: **13 total, 7 killed, 6 survived, 0 errors.**
  Survivors are case changes and one same-length `.`→`x` substitution in
  URL example values used consistently on setup and assertion sides; the
  byte-count scenario's `https://a.io/p.png -> https://a.io/pxpng` substitution
  preserves byte length, so the expected count is unchanged. Killed mutations
  include the validation-rejection examples. All survivors are intrinsic
  equivalents, not implementation gaps.

### Suite status

Canonical record against review commit `8836f4c634`:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/account-page-layout-verification.json --task account-page-layout`
  -> **pass (5/5)**: unit **758 pass / 0 fail**, property **207 pass / 0 fail**,
  acceptance **all 46 suites passed**, lint **ok**, build **ok**.

Property tests run as their own explicit command by `verify.mjs`, separate from
unit coverage and language mutation. Only `psf-memo-client` was touched, so one
component record is sufficient (`docs/reviews/account-page-layout-verification.json`).

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `account-page-layout`) with
  the review commit `8836f4c634` so it can merge `swarmforge-architect` into
  `master`.
- No coder/refactorer handoff: this review adds tool-written manifests, hides
  loader internals, and adds one unit test, with no follow-up work for those
  roles.

By architect.
