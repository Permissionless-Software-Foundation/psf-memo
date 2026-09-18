# Notification Entry Display — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `notification-entry-display` (refactorer handoff
  `merge_and_process refactorer 7dfc315840`).
- Merged `swarmforge-refactorer` (fast-forward from `a1eb548`). Commits:
  - `f4d9499` Add notification entry display specification (specifier)
  - `521d434` Implement notification entry display (coder)
  - `7dfc315` Refactor notification entry display: share acceptance assertions,
    add property tests (refactorer)
- Architect review commit: `bbbf4adcd7` (SPA link wiring + test hardening +
  tool-written mutation/acceptance manifests).
- Verification record `git_sha`: `bbbf4adcd7` (client).
- Records/summary commit: this commit.

The feature renders each Notifications entry with its actor's resolved Memo
display name and avatar, links both to the actor's profile, shows the full
address as small plain text, and offers a "View Post" link (opening the
referenced post's thread) for like and reply notifications only. It falls back
to the truncated address and an identicon when the actor has no name/avatar or
the profile lookup fails. Client-only. Touches `psf-memo-client` only.

## Architectural findings

- **UI/Core separation (good).** The decision logic lives in a pure view-model
  service (`src/services/notification-entry.js`: `profilePath`, `displayName`,
  `notificationMessage`, `buildNotificationEntry`) and a pure controller
  (`src/services/notifications-page.js`) with injected `memoDb`/`wallet`. The
  React `NotificationEntry` component is presentational plain
  `React.createElement`, so the browser JSX build and the Node acceptance
  adapter (`acceptance/lib/render-notification-entry.js`) share one module and
  the whole feature is testable without a DOM.
- **Dependency direction (good).** Component → service; service → `util`;
  controller → view-model service. `MemoDb` (IO) and the wallet are injected,
  never imported by the controller, so core behavior runs without IO.
- **Information hiding (good).** Profile-lookup failure is contained in
  `NotificationsPage._loadProfile` (returns an empty profile), and
  `_loadProfileField` guards clients that do not expose `getName`/`getProfilePic`,
  so a partial/failing DB cannot abort the page. Only the view fields the page
  needs are exposed; the raw profile records stay inside the controller.
- **Local code quality (one fix).** The `NotificationEntry` component defined an
  optional `onProfileClick` seam and `handleProfileClick`, but the production
  `Notifications` wrapper never passed it. Profile links therefore rendered as
  bare anchors and triggered a full-page navigation, which breaks on the
  `BrowserRouter`/GitHub Pages deployment (no `404.html` fallback) and is
  inconsistent with the `Link`-based profile links used everywhere else. Fixed
  in the wrapper (see below).
- **Mutation coverage gap (fixed).** The new renderer component had 3 mutation
  sites with **0 covered**, because only the acceptance suite rendered it and
  the mutation baseline is `npm test` (unit). No unit test rendered the
  component. Added one so the renderer's sites are covered, matching the
  existing `post-content`/`like-result` component-unit-test convention.
- **Accepted as-is (refactorer changes).** The refactorer's `resolveText`
  now resolves `<placeholder>` values inside quoted step arguments via
  `resolveParam`, and the "thread modal opens" handler resolves its txid
  parameter; both are generic acceptance-harness improvements. The full
  acceptance suite (35 feature suites) passes with them.
- **Observation, not changed — profile-path constant duplication.** The new
  service defines `PROFILE_PATH_PREFIX`/`profilePath`, while
  `src/services/profile-page.js` already exports `PROFILE_PATH_PREFIX` and
  several components inline `` `/profile/${encodeURIComponent(addr)}` ``.
  Consolidating into a shared `profile-path` module is a cross-module refactor
  beyond this handoff; the new helper is a local step toward DRY and
  `dry4javascript` reported no duplicate candidates in the changed set.
  Documented for a future client-consistency task.

## Fixes applied

- **Wired the SPA profile-link seam.** `Notifications` now calls
  `useNavigate()` and passes `onProfileClick={navigate}` to every
  `NotificationEntry`, so the avatar and display-name links navigate via the
  router (`event.preventDefault()` already runs in `handleProfileClick`) instead
  of doing a full page reload. The acceptance adapter still renders the
  component without a router and keeps the `href`, so acceptance assertions are
  unchanged.
- **Covered the renderer's mutation sites.** Added
  `test/unit/notification-entry-component.test.js` (8 tests, `react-dom/server`
  static-render): null entry, display name/address/message, avatar `<img>`,
  identicon fallback, profile links, View Post present/absent, and empty-message
  fallback. This moved the component's 3 sites from uncovered to covered and
  killed all 3.
- **Killed the controller survivor.** Added a fresh-state unit test to
  `test/unit/notifications-page.test.js` asserting the constructor defaults
  (`empty === false`, `pagination === null`, empty `notifications`/`profiles`),
  killing the `this.empty = false -> true` constructor mutant.
- **No other production changes were needed.** Module structure, dependency
  direction, and information hiding were accepted.

## Verification results

Record (pinned to the review commit `bbbf4adcd7`):

| File | Component |
|------|-----------|
| `docs/reviews/notification-entry-display-verification.json` | psf-memo-client |

- **Language mutation** (`mutate4javascript`, `--max-workers 8`; the wrapper
  detected differential under-selection on `notifications-page.js` and the
  component and reran them with `--mutate-all`):
  - `src/services/notification-entry.js`: **3 killed, 0 survived, 0 uncovered.**
  - `src/services/notifications-page.js`: **14 killed, 0 survived, 0 uncovered**
    (first differential run 10 killed / 1 survived / 11 of 14 selected → rerun
    all 14; the survivor was the constructor `empty=false` default, killed by
    the added fresh-state test).
  - `src/components/app-body/notifications/notification-entry.js`: **3 killed,
    0 survived, 0 uncovered** (first run 0 killed / 0 survived / **3 uncovered**
    → all covered and killed after adding the component unit test).
  - Total: **20 killed, 0 survived, 0 uncovered.**
  - `src/services/memo-db.js` was not mutated: the client HTTP adapter is a
    standing mutation exclusion (ESM + `../config` directory import).
- **DRY** (`dry4javascript`, scoped to the changed production files, the
  acceptance adapter, and the new/changed test files): **No duplicate candidates
  found.**
- **Cyclomatic complexity / CRAP** (`crap4javascript`): max **CRAP 6.0**
  (`NotificationsPage.load`, CC 6, 100% coverage); `notificationMessage` CC 5,
  `NotificationEntry` CC 4 at 87% (event-handler bodies are not invoked by
  server rendering), every other changed function CC ≤ 2 at 100%. All functions
  are at or below the threshold; no refactor was warranted.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`), `psf-memo-client/specs/notification-entry-display.feature`:
  **36 total, 11 killed, 25 survived, 0 errors.** All 25 survivors are
  single-character case mutations of example values (`addr`, `name`, `avatar`,
  `my_post`, `reply_text`, `follower`) used consistently on both the Given setup
  and the Then assertion side, so the mutated value still matches — the
  documented intrinsic-equivalent class (specifier gotcha #12). None is an
  implementation gap and none was chased. The structurally independent
  assertions were killed: scenario 2 (avatar/name → independent `profile_path`)
  and the truncated-address-name scenarios 6 and 8 account for all 11 kills, so
  the profile-link encoding and address-truncation behavior are genuinely
  pinned. `gherkin-mutator` wrote a manifest containing only scenario 2 (4
  mutations, 4 killed) because every other scenario has an intrinsic survivor;
  committed as tool-written.

## Suite status

`verify.sh client` **result: pass** at `git_sha bbbf4adcd7`:

- unit: **470 pass / 0 fail**
- property: **101 pass / 0 fail**
- acceptance: **all 35 generated suites passed** (including all 16
  notification-entry-display examples)
- lint: ok
- build: ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- `git_handoff` to `coder` and `refactorer` (priority 00) with the review commit
  for follow-up review: the production change is the small `useNavigate`
  profile-link wiring in the Notifications wrapper; the rest is test hardening
  and tool-written manifests. No further production change.
