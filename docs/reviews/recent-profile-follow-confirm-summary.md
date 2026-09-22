# Recent Profile Follow Confirmation — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `recent-profile-follow-confirm` (refactorer handoff
  `merge_and_process refactorer b9dbafe9bf`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `c37cf61`). Commits:
  - `960374b` Record recent-profile-follow completion in backlog and briefing
    (specifier/master; the prior task's completion record, carried in by the
    fast-forward and outside this task)
  - `6f3f515` Specify follow confirmation before broadcast (specifier)
  - `0eb45ff` Add follow confirmation before broadcast (coder)
  - `b9dbafe` Add property tests for recent-profile-follow confirmation
    (refactorer)
- Architect review commit: `20b13f2` — DRY test-helper extraction so the
  language DRY tool reports no duplicate candidates, plus the tool-written
  `mutate4javascript`/`gherkin-mutator` manifests. No production behavior
  changed.
- Records/summary commit: this commit.

Clicking a Recent Profiles Follow/Unfollow button now opens a confirmation
modal first: "Are you sure you want to follow <display name>?" (or "unfollow")
with Yes and No buttons. Nothing is broadcast until Yes is clicked; No closes
the modal without broadcasting and leaves the row unchanged. Yes continues to
the existing broadcast result flow (loading, then success message/txid/explorer
link, or the red failure message with the row unchanged). The display name is
the profile's name, or the truncated address when it has none, matching the
Account column. Client-only feature.

## Architectural review

- **UI/Core separation (good).** The confirmation state machine lives in the
  pure page controller (`requestFollow`/`getFollowConfirmMessage`/
  `confirmFollow`/`cancelFollow` and `pendingFollow`); the confirmation body
  (`recent-profile-follow-confirm.js`) is a pure `createElement` component
  rendered under Node by both the unit tests and the acceptance adapter, and
  the React page shell only wires its own state to the controller. Nothing is
  broadcast from the shell.
- **Dependency rule (good).** `recent-profiles-page.js` now imports
  `accountDisplayName` from `recent-profiles-table.js` so the confirmation
  prompt and the Account column derive the display name from one rule. Both are
  high-level service modules with no IO and no cycle; the confirmation
  component is a leaf. No low-level or framework dependency crossed inward.
- **Information hiding and encapsulation (good).** The controller hides how
  the pending action is derived from the row's follow state and how it maps
  back to the broadcast's next state; the React/acceptance layers see only the
  prompt accessor and the pending record. The confirm component takes a message
  and two handlers, nothing more.
- **Local code quality (good).** The confirmation flow reuses the single
  `_broadcastFollow` path, so loading/modal/error invariants stay in one place.
  CRAP/CC is at 100% coverage with max CC 4 / CRAP 4.0; no dead code or unused
  imports.
- **Accepted tradeoffs (documented, not changed).** Importing
  `accountDisplayName` from the table view-model couples the page controller to
  the table module; this is intentional (the spec requires the confirmation to
  match the Account column) and would only move the helper, not remove the
  coupling. The React shell mirrors `pendingFollow` alongside the controller,
  consistent with the existing shell pattern; the confirmation and result
  bodies are separate pure components switched by that state.

## Fixes applied

No production structural fix was needed: module boundaries, dependency
direction, and information hiding were accepted as delivered. The delivered
confirmation tests already kill every language mutation, so there were no
survivors to harden. The architect's substantive change is the task-local DRY
cleanup plus tool-written metadata:

- **DRY cleanup (task-local).** `dry4javascript` reported six duplicate
  candidates in the delivered tests/support:
  - extracted the seeded `randomString`/`randomWords` generators to
    `test/support/random.js`;
  - added `randomRecentProfileAddr` and `makeRecordingFollow` (the counting
    follow stub) to `test/support/recent-profiles.js`, removing the duplicate
    generators and the duplicated recording handler between the two property
    tests;
  - added `makeLoadedFollowPage` to the confirmation unit tests (shared page
    setup) and `confirmButtons` to the confirm-component unit tests, and merged
    the structurally identical Yes/No click tests into one.
  Both the production and the test/support scopes now report **"No duplicate
  candidates found."**
- Tool-written `mutate4javascript` manifest refreshed for
  `recent-profiles-page.js` and `gherkin-mutator` soft-mutation metadata written
  into `recent-profile-follow.feature`.

## Verification results

Record (pinned to the review commit `20b13f2e3f`):

| File | Component |
|------|-----------|
| `docs/reviews/recent-profile-follow-confirm-verification.json` | psf-memo-client |

- **Language mutation** (`mutate4javascript <file> --max-workers 8` via
  `swarmforge/scripts/mutate-file.sh`, one file at a time; the differential run
  under-selected 6 of 18, so it was rerun with `--mutate-all`):
  - `src/services/recent-profiles-page.js`: **18 killed, 0 survived, 0
    uncovered.**
  - `src/components/app-body/recent-profiles/recent-profile-follow-confirm.js`:
    0 mutation sites (structural: `!` guards, ternaries, arrow handlers only).
  - The JSX shell (`app-body/recent-profiles/index.js`) remains excluded:
    `mutate4javascript` cannot parse JSX (no plugin), as in prior reviews.
- **DRY** (`dry4javascript`, scoped to the changed production files and then to
  the changed tests/support/acceptance adapter):
  - production: **"No duplicate candidates found."**
  - tests + support: **"No duplicate candidates found."** (was 6 candidates
    before the helper extraction).
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the two changed
  production files, 100% coverage): max **CC 4 / CRAP 4.0**
  (`RecentProfilesPage._broadcastFollow`); `requestFollow`/`_canLoadFollowState`/
  `_loadFollowState`/`_loadProfileFollowState` CC 3, `confirmFollow`/
  `getFollowConfirmMessage` CC 2, `RecentProfileFollowConfirm` and the rest
  ≤ 1. Exit 0 (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the client runner worker):
  - `psf-memo-client/specs/recent-profile-follow.feature`: **13 total, 11
    killed, 2 survived, 0 errors**, with 2 clean scenarios (4 mutations) skipped
    from the prior manifest. Both survivors are intrinsic case changes of a
    value used consistently on both sides of their scenario:
    - `scenarios[8].examples[0].broadcast_error` `Insufficient balance ->
      insufficient balance` — the scenario makes the wallet fail with the
      example value and asserts the modal contains that same value;
    - `scenarios[10].examples[0].addr` case change — the address passes through
      setup and assertion consistently.
    The tool wrote a manifest listing the seven clean scenarios (5-8, 10, 2, 3).
- **Suite status**: `verify.sh client` **result: pass (5/5)** at `git_sha
  20b13f2e3f`:
  - unit **563 pass / 0 fail** (the two Yes/No click tests were merged into
    one, so the delivered 564 becomes 563)
  - property **146 pass / 0 fail**
  - acceptance **all 39 generated suites passed**
  - lint ok
  - build ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only a test-helper DRY cleanup and tool-written
  mutation/acceptance metadata.
