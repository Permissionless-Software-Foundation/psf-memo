# Profile Address Copy — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `profile-address-copy` (refactorer handoff
  `merge_and_process refactorer 725f92d506`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `bd86490`). Commits:
  - `3045520` Clarify follow confirmation uses the profile display name
    (specifier)
  - `2483741` Record recent-profile-follow-confirm completion in backlog and
    briefing (specifier/master)
  - `4cb702d` Specify profile address copy (specifier/master)
  - `9cad9f7` Implement profile address copy (coder)
  - `725f92d` Cover the address-copy confirmation and add property tests
    (refactorer)
- Architect review commit: `3bccb41479` — tool-written
  `mutate4javascript`/`gherkin-mutator` manifests plus an architect process
  note. No production behavior changed.
- Records/summary commit: this commit.

The `/profile/:addr` sidebar now shows the profile's BCH cash address as a
button. Clicking it writes the address to the system clipboard and shows a
transient `Copied to clipboard` confirmation that disappears after 1.5s. It is
client-only: it reads existing profile data and writes only to the clipboard,
broadcasting no Memo action and changing no DB data. It mirrors the
copy-confirmation UX already used by the post txid on feed cards.

## Architectural review

- **UI/Core separation (good).** The confirmation state machine lives in the
  pure page controller (`copyAddress`, `isShowingAddressCopyConfirmation`,
  `addressCopyTimeoutElapsed`, `destroy`), with the clipboard write and the
  timer injected (`copyToClipboard`, `setTimer`, `clearTimer`,
  `onAddressCopyChange`). `profile-address.js` is a presentational
  `createElement` component with no browser or IO API; the React shell only
  wires its state to the controller and to `AppUtil.copyToClipboard`. Core
  behavior is exercised under plain `node --test` with no browser.
- **Dependency rule (good).** Both new modules are leaves:
  `profile-address.js` depends on React only, and `profile-page.js` continues
  to depend inward on the pure `block-explorer`/`broadcast-result` services.
  The shell depends on the controller and component; no low-level or framework
  dependency crosses inward.
- **Information hiding and encapsulation (good).** The shell and the
  acceptance adapter see only the confirmation accessor, the elapse hook, and
  the `copied` prop; the controller hides the timer lifecycle, the
  reschedule-on-recopy clear, and the change-notification. The
  `mutate4javascript`-covered timer clear/reschedule branch is private.
- **Local code quality (good).** `destroy()` is the single cleanup path and is
  called from the shell effect; the confirmation is a sibling status node
  (`role=status`, `aria-live=polite`) rather than nested in the button.
  Coverage is 100% with max CC 4 / CRAP 4.0.
- **Accepted tradeoff (documented, not changed).** There are now two
  copy-confirmation implementations: this controller-based one and the
  hook/`useRef` one in `post-feed-item.js`. They share the same UX contract
  (1.5s, `Copied to clipboard`, `role=status`) but not code, and the language
  DRY tool does not flag them because the structures differ. Unifying them
  would couple the feed component to the profile controller's injected-adapter
  abstraction or introduce a new abstraction with only two call sites and
  different testability stories; it is out of scope for this task. Left as-is
  consistent with prior reviews' treatment of cross-module pattern
  boilerplate.

## Fixes applied

No production structural fix was needed: module boundaries, dependency
direction, and information hiding were accepted as delivered, and the
delivered tests already kill every language mutation, so there were no
survivors or uncovered sites to harden. The architect's changes are
tool-written metadata plus one process note:

- **Stale delivered mutation manifest (repaired by the tool).** The refactorer
  delivered `src/services/profile-page.js` with the address-copy functions in
  the source but an embedded `mutate4javascript` manifest that listed only the
  pre-existing functions (`tested_at` predating the feature). The differential
  run still selected and ran all 36 covered sites because the module hash
  changed, and the tool rewrote the manifest to include the new functions.
  Recorded as a process note in `docs/architect-process-notes.md`.
- Tool-written `mutate4javascript` manifests for
  `src/services/profile-page.js` and
  `src/components/app-body/profile/profile-address.js`, and the
  `gherkin-mutator` soft-mutation manifest on
  `specs/profile-address-copy.feature`.

## Verification results

Record (pinned to the review commit `3bccb41479`):

| File | Component |
|------|-----------|
| `docs/reviews/profile-address-copy-verification.json` | psf-memo-client |

- **Language mutation** (`mutate4javascript <file> --max-workers 8` via
  `swarmforge/scripts/mutate-file.sh`, one file at a time; all covered sites
  were selected — no differential under-selection):
  - `src/services/profile-page.js`: **36 killed, 0 survived, 0 uncovered**.
  - `src/components/app-body/profile/profile-address.js`: **1 killed, 0
    survived, 0 uncovered**.
  - The JSX shell (`src/components/app-body/profile/index.js`) remains
    excluded: `mutate4javascript` cannot parse JSX (no plugin), as in prior
    reviews; its behavior is exercised end-to-end through acceptance.
- **DRY** (`dry4javascript`, scoped):
  - production (`profile-page.js`, `profile-address.js`): **"No duplicate
    candidates found."**
  - tests/support/acceptance adapter (`test/support/address-copy.js`, the two
    unit tests, the property test, `acceptance/lib/render-profile-address.js`):
    **"No duplicate candidates found."**
  - `acceptance/lib/handlers.js`: only pre-existing follow/mute
    step-handler boilerplate duplicates; none of the new address-copy
    handlers (lines 2086–2175) participates in a candidate.
- **Cyclomatic complexity / CRAP** (`crap4javascript` on both changed
  production files, 100% coverage): max **CC 4 / CRAP 4.0**
  (`ProfilePage._broadcastMute`); `copyAddress`/`_assertReady`/`_loadState`/
  `load` CC 3; `ProfileAddress` CC 2; everything else ≤ 2. Exit 0
  (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the client runner worker and `--json`):
  - `psf-memo-client/specs/profile-address-copy.feature`: **4 total, 0 killed,
    4 survived, 0 errors.** All four are intrinsic single-character case
    changes of an example address that each scenario uses consistently on both
    the setup side (`I open the profile page for the address <addr>`) and the
    assertion side (`the profile page shows the profile address <addr>` /
    `the clipboard contains <addr>`). They are intrinsic equivalents, so the
    tool wrote an empty `scenarios` manifest, consistent with the documented
    precedent.
- **Suite status**: `verify.sh client` **result: pass (5/5)** at `git_sha
  3bccb41479`:
  - unit **579 pass / 0 fail**
  - property **153 pass / 0 fail**
  - acceptance **all 40 generated suites passed** (39 before; the new
    `profile-address-copy` suite adds 6 scenarios)
  - lint ok
  - build ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only tool-written mutation/acceptance metadata and a
  process note.
