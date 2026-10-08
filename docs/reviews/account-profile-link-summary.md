# Architect review — `account-profile-link`

**Role**: architect
**Task**: `account-profile-link` (client-only, `psf-memo-client`)
**Reviewed commits**: `51c0ab0` (specifier, spec) → `c4bb154` (coder) → `71caa69d2e`
(refactorer)
**Merge**: `431d7feb90` (refactorer `swarmforge-refactorer` → `swarmforge-architect`)
**Review commit**: `6b910aeb74` (sidebar click coverage + tool-written manifests)
**Verification record**: `docs/reviews/account-profile-link-verification.json`
(`git_sha` `6b910aeb7483543ef1212ec78459245859dff1c3`)

## Scope

Add a Profile link to the account sidebar that navigates to the account's own
`/profile/:addr` page, and share the profile-route path builder. The task adds
`services/profile-path.js`, uses it from the account sidebar, replaces the two
duplicated `profilePath` implementations in `notification-entry.js` and
`recent-profiles-table.js`, extends the account page controller and spec, and
adds unit/property/acceptance coverage. Client-only rendering feature; no Memo
action and no DB write.

## Architectural findings

- **The shared route builder is the right extraction.** `profilePath` and
  `PROFILE_PATH_PREFIX` were duplicated verbatim in
  `services/notification-entry.js` and `services/recent-profiles-table.js`. The
  task moved the single implementation into the pure `services/profile-path.js`
  and had both modules import it. This removes two copies and gives one
  canonical, URL-encoded profile-route format shared by the sidebar, the recent
  profiles table, and notification entries.
- **Dependency direction holds.** `profile-path.js` is pure (no imports, no IO).
  The account page controller, the sidebar component, and the acceptance
  adapter all depend inward on it.
- **Controller owns navigation.** The sidebar renders a
  `data-section="profile"` anchor between the bio and address sections, with
  `href={profilePath(addr)}` and an `onClick` that calls `event.preventDefault()`
  and the injected `onProfileClick`. The account page wires that to
  `accountPage.clickProfileLink()`, so the route decision lives in the testable
  controller rather than in the view. The sidebar section order is updated to
  `avatar, bio, profile, address, tokens` consistently in the controller, the
  component, the spec, and the acceptance step.
- **Backward compatibility preserved.** `notification-entry.js` and
  `recent-profiles-table.js` re-export `profilePath`/`PROFILE_PATH_PREFIX` from
  the shared module, so existing imports and acceptance assertions keep working.
- **Accepted, not changed.** `profile-page.js` still defines its own
  `PROFILE_PATH_PREFIX = '/profile'`, so the prefix now has two owners
  (`profile-path.js` and `profile-page.js`). It is a trivial literal, and
  consolidating `profile-page.js` would touch the profile page controller and
  its acceptance usages beyond this handoff; noted for a future cleanup.
  `dry4javascript`'s only duplicate is a pre-existing `randomAddr` helper shared
  by the two untouched property tests for notification-entry and
  recent-profiles-table — not task-local.

## Fixes applied

- **Covered a new-code gap.** The sidebar Profile link's `onClick` path
  (`preventDefault` + `onProfileClick`, and the no-handler no-op) was untested:
  the acceptance step invokes `accountPage.clickProfileLink()` directly rather
  than the DOM handler. Added unit tests using the repo's direct-tree pattern
  (invoke the component and call the element's `onClick`). `AccountSidebar`
  coverage rose from 90.7% to 100%.
- **Manifests.** Recorded `mutate4javascript` manifests for `account-sidebar.js`,
  `account-page.js`, `notification-entry.js`, and `recent-profiles-table.js`,
  and refreshed the `gherkin-mutator` manifest for
  `specs/account-page-layout.feature`.

## Verification

### Language mutation (`mutate4javascript`, one file at a time, `--mutate-all --max-workers 8`)

| File | Covered | Killed | Survived | Uncovered |
|------|---------|--------|----------|-----------|
| `src/components/app-body/account/account-sidebar.js` | 1 | 1 | 0 | 0 |
| `src/services/notification-entry.js` | 3 | 3 | 0 | 0 |
| `src/services/recent-profiles-table.js` | 6 | 6 | 0 | 0 |
| `src/services/account-page.js` | 39 | 39 | 0 | 0 |

Total **49 killed, 0 survived, 0 uncovered**. `profile-path.js` is a structural
0-site module (`--scan`: `Total mutation sites: 0`) — a template literal plus
`encodeURIComponent`, with no arithmetic/comparison/boolean/`0<->1` sites. The
JSX shell `account/index.js` is not mutation-testable and is covered by the
acceptance suite.

### DRY (`dry4javascript`, scoped to changed modules and tests)

One score-1.00 candidate: the `randomAddr` helper duplicated in
`test/property/notification-entry.property.test.js` and
`test/property/recent-profiles-table.property.test.js`. Both files predate this
task and were not modified by it; the duplicate is not task-local.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`specs/account-page-layout.feature`: **4 selected (10 skipped as already killed,
2 scenarios skipped), 0 killed / 4 survived / 0 errors**. Survivors are
intrinsic equivalents — single-character case flips of the `bio` (scenario 4)
and `name` (scenario 6) example values, used consistently on both the setup and
assertion sides. The new Profile-link scenario (16) carries no example values,
so it has no mutation candidates; its behavior is covered by the language
mutation of `account-page.js`/`account-sidebar.js` (all killed) and by the new
unit/property tests.

### CRAP / cyclomatic complexity (`crap4javascript`)

All changed functions are 100% covered. Highest: `AccountPage.loadPosts` and
`notificationMessage` (CC 5, CRAP 5.0); `AccountSidebar` and
`AccountPage.getProfilePath`/`clickProfileLink` (CC 2, CRAP 2.0); `profilePath`
(CC 1, CRAP 1.0). Exit 0 (threshold 8.0).

### Canonical suite (`verify.sh client`, at `6b910aeb74`)

| Command | Result |
|---------|--------|
| unit | 819 pass / 0 fail |
| property | 224 pass / 0 fail |
| acceptance | all 49 acceptance suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/account-profile-link-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `account-profile-link`, commit `6b910aeb74`.
