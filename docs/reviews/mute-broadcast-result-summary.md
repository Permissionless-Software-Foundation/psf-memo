# Mute Broadcast Result — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `mute-broadcast-result` (refactorer handoff
  `merge_and_process refactorer 722c486ef6`).
- Merged `swarmforge-refactorer` (fast-forward from `a1e4a4f`). Commits:
  - `c0e18d8` Add mute broadcast result specification (specifier)
  - `24d7f0f` Implement mute broadcast result (coder)
  - `722c486` Refactor mute broadcast result: share result handlers, add
    property tests (refactorer)
- Architect review commit: `a7d9ca6299` (dead-store removal + error-getter
  test hardening + tool-written mutation/acceptance manifests).
- Verification record `git_sha`: `a7d9ca6299` (client).
- Records/summary commit: this commit.

The feature shows a broadcast result modal on the profile page after a
mute/unmute (Memor `0x6d16`/`0x6d17`): on success the success message, the mute
txid, and a link to that transaction on the block explorer (new tab); on failure
the broadcast error message. A successful mute flips the button to Unmute and a
successful unmute flips it back to Mute; a failed broadcast leaves the button in
its previous state. The modal stays open until dismissed and dismissing closes
it without navigating. Client-only, mirrors the like/tip and New Post result
modals. Touches `psf-memo-client` only.

## Architectural findings

- **UI/Core separation (good).** The mute result state machine lives in the pure
  controller `src/services/profile-page.js` (`_broadcastMute`,
  `getMuteBroadcastMessage`, `getMuteResultError`, `dismissMuteResult`) with the
  `memoDb`/`memoFollow`/`memoMute`/viewer-address dependencies injected by the
  React page. `src/components/app-body/profile/mute-result.js` and the extracted
  `src/components/explorer-tx-link.js` are presentational plain
  `React.createElement` components shared by the browser JSX build and the Node
  acceptance adapter (`acceptance/lib/render-mute-result.js`). The whole feature
  is testable without a DOM or network.
- **Dependency rule (good).** `profile-page.js` depends only on the pure
  `block-explorer` util. `MemoMute`/`MemoDb` (IO) and the wallet are constructed
  in the React adapter shell (`profile/index.js`) and injected inward. No core
  module imports a component, service, or IO module; dependency direction runs
  from the adapter shell inward to the controller.
- **Information hiding (good, one simplification).** `_broadcastMute` records
  the outcome in `lastMuteResult` and exposes only getters; the reflected button
  state is updated inside `_setState` *after* the injected handler succeeds, so
  a failed broadcast cannot change the button. The reset of
  `showMuteResultModal` at the start of `_broadcastMute` was a dead store — the
  flag is set true unconditionally after the awaited broadcast, so no observer
  can read the reset value. Removed (see Fixes).
- **DRY / acceptance structure (good).** The refactorer generalized the
  like/tip and mute broadcast-result acceptance assertions behind
  `BROADCAST_RESULTS` + `renderBroadcastResult`, the follow/unfollow/mute/unmute
  broadcast checks behind `assertMemoBroadcastPrefix`, and extracted the shared
  `ExplorerTxLink` used by both `LikeResult` and `MuteResult`. Behavior is
  unchanged; the broad DRY run now reports only the pre-existing `handlers.js`
  step-handler boilerplate (untouched lines), and the changed production/test set
  reports no duplicate candidates.
- **Mutation surface.** `explorer-tx-link.js`, `mute-result.js`, and
  `like-result.js` each scan as **0 mutation sites** (structural, like
  `block-explorer.js`): they are built from `!`/ternary/template-literal markup
  with no arithmetic, comparison, or boolean operators the tool targets. Their
  behavior is pinned by unit and property tests instead. The only mutated module
  with sites is `profile-page.js`.
- **Observation, not changed — merge included two earlier master commits.**
  The fast-forward from `a1e4a4f` to `722c486` also brought in `ea67979`
  (remove redundant author name from posts) and `8eab46d` (notifications CSS +
  entry tweaks), both committed to `master` before the mute spec and outside the
  refactorer handoff. They were not the subject of this review; the full client
  suite (unit/property/acceptance/lint/build) passes with them.
- **Observation, not changed — `render-like-result`/`render-mute-result`
  adapters are near-identical.** They render different components and DRY
  reports no candidate at its thresholds, so they are left as separate test
  helpers (test helpers stay separate from the modules under test).

## Fixes applied

- **Removed the dead `showMuteResultModal` reset.** `ProfilePage._broadcastMute`
  set the modal hidden, then set it visible unconditionally after the awaited
  broadcast. The reset was unobservable and left a surviving equivalent mutant
  (`false -> true`); deleting it removes the site and the dead state write.
- **Pinned `getMuteResultError`'s empty-string contract.** Added two unit tests:
  no result (constructor default `null`) and a failure result with no message.
  These kill both `|| -> &&` mutants in the getter (the null case exercises the
  short-circuit guard, the no-message case exercises the trailing `|| ''`).
- **No further production changes were needed.** Module structure, dependency
  direction, and information hiding were accepted.

## Verification results

Record (pinned to the review commit `a7d9ca6299`):

| File | Component |
|------|-----------|
| `docs/reviews/mute-broadcast-result-verification.json` | psf-memo-client |

- **Language mutation** (`mutate4javascript`, `--max-workers 8`,
  `--mutate-all`; wrapper confirmed all sites selected):
  - `src/services/profile-page.js`: **31 killed, 0 survived, 0 uncovered.**
    First differential run selected all 32 sites (30 killed / 2 survived:
    the dead modal reset and the `getMuteResultError` guard) → after the fixes,
    31 sites, all killed.
  - `src/components/explorer-tx-link.js`, `src/components/app-body/profile/mute-result.js`,
    `src/components/post-feed/like-result.js`: 0 mutation sites (structural).
  - Total: **31 killed, 0 survived, 0 uncovered.**
  - `src/services/memo-db.js` was not mutated: the client HTTP adapter is a
    standing mutation exclusion (ESM + `../config` directory import).
- **DRY** (`dry4javascript`, scoped to the changed production files, the
  acceptance adapters, and the new/changed tests): **No duplicate candidates
  found.** The broad run over `acceptance/lib/handlers.js` reports only
  pre-existing step-handler boilerplate on lines untouched by this task.
- **Cyclomatic complexity / CRAP** (`crap4javascript`): max **CRAP 4.0**
  (`ProfilePage._broadcastMute` CC 4, `getMuteBroadcastMessage` CC 4,
  `getMuteResultError` CC 4, all 100% covered); `ExplorerTxLink` and
  `MuteResult` CC 2, `LikeResult` CC 1, every other changed function CC ≤ 3 at
  100%. All functions are below the 8.0 threshold; no refactor was warranted.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`), `psf-memo-client/specs/mute-broadcast-result.feature`:
  **5 total, 0 killed, 5 survived, 0 errors.** All 5 are single-character case
  mutations of example values (`addr` in scenarios 1–4, `broadcast_error` in
  scenario 4) used consistently on both the Given setup and the Then assertion
  side, so the mutated value still matches — the documented intrinsic-equivalent
  class. None is an implementation gap and none was chased. `gherkin-mutator`
  wrote a manifest with `"scenarios":[]` because every scenario has an intrinsic
  survivor; committed as tool-written.

## Suite status

`verify.sh client` **result: pass** at `git_sha a7d9ca6299`:

- unit: **484 pass / 0 fail**
- property: **111 pass / 0 fail**
- acceptance: **all 36 generated suites passed** (including all 4
  mute-broadcast-result scenarios)
- lint: ok
- build: ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- `git_handoff` to `coder` and `refactorer` (priority 00) with the review commit
  `a7d9ca6299` for follow-up review: the only production change is the removal
  of the dead `showMuteResultModal` reset in `ProfilePage._broadcastMute`; the
  rest is two edge-case unit tests and tool-written manifests.
