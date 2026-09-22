# Recent Profile Follow Controls — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `recent-profile-follow` (refactorer handoff
  `merge_and_process refactorer 98b5ea5142`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `79bb918`). Commits:
  - `698a732` Record profile-last-post completion in backlog and briefing
    (specifier/master; the prior task's completion record, carried in by the
    fast-forward and outside this task)
  - `f7809d0` Styling buttons on feed page
  - `477c1c1` Adding some info to the recent profiles page
  - `fc962fc` Specify recent profile follow controls (specifier)
  - `76d0e1a` Implement recent profile follow controls (coder)
  - `98b5ea5` Refactor recent-profile-follow: share broadcast-result accessors
    (refactorer)
- Architect review commit: `c247680` — mutation-killing unit tests, a shared
  test-support `MemoDb` stub, a `randomString` helper in the property test, and
  the tool-written `mutate4javascript`/`gherkin-mutator` manifests. No
  production behavior changed.
- Records/summary commit: this commit.

The `/profile/recent` table's last column is now Follow instead of TXID. Each
row shows a Follow or Unfollow button (Unfollow when the viewer already follows
that profile; a disabled Follow button on the viewer's own row). Clicking it
opens a result modal that shows a loading indicator while the Memo follow
(`0x6d06`) or unfollow (`0x6d07`) transaction is prepared and broadcast, then
the success message plus txid and block-explorer link, or the red failure
message with the row label unchanged. This is a client-only feature: it
broadcasts a Memo action and reads follow state through the existing DB REST
API.

## Architectural review

- **UI/Core separation (good).** The result-record shape lives in the pure leaf
  `src/services/broadcast-result.js` (`broadcastSuccessMessage`/
  `broadcastErrorMessage`), now shared by `ProfilePage` and
  `RecentProfilesPage` instead of each controller re-deriving the
  success/failure message. The table view model
  (`recent-profiles-table.js`) and the page controller (`recent-profiles-page.js`)
  are pure and fully testable under `node --test`; the React page
  (`components/app-body/recent-profiles/index.js`) is only the delivery shell,
  and the acceptance suite renders the same pure components under Node through
  the `acceptance/lib/render-recent-profile-follow*.js` adapter shells.
- **Dependency rule (good).** `broadcast-result.js` is a leaf with no upward or
  IO dependency; `recent-profiles-page.js` depends only on `paginated-page`,
  `block-explorer`, and `broadcast-result`; the components depend on the shared
  `explorer-tx-link` renderer. No framework or persistence structure crosses
  into the core.
- **Information hiding and encapsulation (good).** `broadcast-result` exposes
  only the two accessors; the result record's representation stays behind
  them. `RecentProfilesPage` hides the `getFollowState` call mechanics behind
  `_canLoadFollowState`/`_loadProfileFollowState`, and the single
  `_broadcastFollow` path owns the modal, row-state, and error-recording
  invariants.
- **Local code quality (good).** The `_loadFollowState` split and the
  `_broadcastFollow` extraction lowered the delivered CRAP/CC: every analyzed
  function is at 100% coverage, max CC 4 / CRAP 4.0. No dead code or unused
  imports.
- **Accepted tradeoffs (documented, not changed).** The React shell mirrors a
  few controller fields (`busy`, `followLoading`, `showFollowResultModal`) as
  its own `useState`; it is a thin render mirror of the controller-owned
  result, consistent with the other page shells. The JSX shells
  (`app-body/index.js`, `app-body/recent-profiles/index.js`) cannot be parsed
  by `mutate4javascript` (no JSX plugin) and are therefore excluded from
  language mutation, like `memo-db.js`; their behavior is covered end-to-end by
  the acceptance suite.

## Fixes applied

No production structural fix was needed: module boundaries, dependency
direction, and information hiding were accepted as delivered. The architect's
substantive changes are mutation hardening, a task-local DRY cleanup, and
tool-written metadata:

- **Mutation-killing unit tests** for the two survivors on
  `recent-profiles-page.js` and the one on `recent-profiles-table.js`:
  - `test/unit/recent-profiles-follow.test.js`: a new page starts with
    `showFollowResultModal === false`, `lastFollowResult === null`,
    `followBusyAddr === null`, and empty `followState` (kills the constructor
    `false -> true`); `load` ignores a null profile and a profile without an
    address and never queries follow state for an empty address (kills the
    `_loadProfileFollowState` `|| -> &&` guard).
  - `test/unit/recent-profiles-table.test.js`: `buildRecentProfileFollow`
    defaults to a non-disabled "Follow" when called with no options (kills the
    default `following = false -> true`).
- **DRY cleanup (task-local).** `dry4javascript` reported two new duplicates in
  the delivered tests: `randomAddr`/`randomTxid` in the property test, and the
  `MemoDb` stub duplicated between the property and unit tests. Extracted the
  stub to `test/support/recent-profiles.js` (the existing unit/property support
  convention) and the property generator to a `randomString(chars, min, max)`
  helper, so both scopes now report "No duplicate candidates found."
- Tool-written `mutate4javascript` manifests refreshed (including the stale
  `recent-profiles-page` and `recent-profiles-table` manifests, which the
  differential run under-selected until rerun with `--mutate-all`) and
  `gherkin-mutator` soft-mutation metadata written into the changed features.

## Verification results

Record (pinned to the review commit `c247680e54`):

| File | Component |
|------|-----------|
| `docs/reviews/recent-profile-follow-verification.json` | psf-memo-client |

- **Language mutation** (`mutate4javascript <file> --max-workers 8` via
  `swarmforge/scripts/mutate-file.sh`, one file at a time; differential runs
  that under-selected were rerun with `--mutate-all`): **55 killed, 0 survived,
  0 uncovered.** Per file (final):
  - `src/services/profile-page.js`: 28 killed, 0 survived, 0 uncovered
  - `src/services/recent-profiles-page.js`: **16 killed, 0 survived**, 0
    uncovered (was 14 killed / 2 survived before hardening)
  - `src/services/recent-profiles-table.js`: **6 killed, 0 survived**, 0
    uncovered (was 5 killed / 1 survived)
  - `src/services/broadcast-result.js`: 4 killed, 0 survived, 0 uncovered
  - `src/components/app-body/recent-profiles/recent-profile-follow-result.js`:
    1 killed, 0 survived, 0 uncovered
  - `src/components/app-body/recent-profiles/recent-profile-follow-button.js`:
    0 mutation sites (structural: `!` guard/ternary/template only)
  - JSX shells excluded: `mutate4javascript` cannot parse JSX (no plugin).
- **DRY** (`dry4javascript`, scoped to the changed production files and then
  to the changed tests/support/acceptance adapters):
  - production: **"No duplicate candidates found."**
  - tests + new support helper: **"No duplicate candidates found."** (was 2
    duplicates before the helper refactor: the `randomAddr`/`randomTxid` pair
    and the cross-suite `MemoDb` stub).
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the changed source
  files, all at 100% coverage): max **CC 4 / CRAP 4.0**
  (`broadcastErrorMessage`, `broadcastSuccessMessage`,
  `ProfilePage._broadcastMute`, `RecentProfilesPage._broadcastFollow`);
  `buildRecentProfileFollow` and `RecentProfileFollowResult` CC 3 / CRAP 3.0;
  all others ≤ 2. Exit 0 (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the client runner worker):
  - `psf-memo-client/specs/recent-profile-follow.feature`: **10 total, 7
    killed, 3 survived, 0 errors.** The survivors are intrinsic
    single-character case changes of a value used consistently on both sides of
    its scenario:
    - `scenarios[6].examples[0].broadcast_error` `Insufficient balance ->
      Insufficient balanCe` — the scenario makes the wallet fail with the
      example value and then asserts the modal contains that same value, so the
      case change cancels;
    - `scenarios[7].examples[0].addr` and `scenarios[8].examples[0].addr` case
      changes — each address is passed through setup and assertion
      consistently (`scenarios 8` and `9` do not branch on the address).
    The tool wrote a manifest listing only the clean scenarios (1, 2, 4, 5).
  - `psf-memo-client/specs/recent-profile-display.feature`: **0 total
    mutations** (2 clean scenarios / 10 mutations skipped from the prior
    manifest); 0 errors. The only change was the scenario-5 header assertion
    TXID -> Follow, which has no example values to mutate; the
    `# mutation-stamp` was refreshed.
  Both changed features' tool-written metadata is committed as-is.

## Suite status

`verify.sh client` **result: pass (5/5 commands)** at `git_sha c247680e54`:

- unit **549 pass / 0 fail** (3 hardening tests added over the delivered 546)
- property **138 pass / 0 fail**
- acceptance **all 39 generated suites passed**
- lint ok
- build ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only hardening tests, a test-support DRY helper, and
  tool-written mutation/acceptance metadata.
