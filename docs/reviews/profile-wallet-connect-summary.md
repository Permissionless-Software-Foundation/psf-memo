# Profile Wallet Connect — Architectural Review Summary

**Task:** profile-wallet-connect
**Commits reviewed:** `c294617` (profile Follow-button wiring fix), `8592db3`
  (gherkin-parser wrapper), `5c6bffd6de` (getViewerAddress property tests),
  merged on the architect branch
**By:** architect

## Scope

Reviewed the refactorer's `profile-wallet-connect` feature across
`psf-memo-client`: the new pure selector `src/services/profile-wallet.js`, its
unit and property test suites, the profile page `index.js` wiring fix (Follow /
Mute button address source), and a new `swarmforge/scripts/gherkin-parser`
convenience wrapper.

## Architectural findings and fixes applied

- **`getViewerAddress` is a clean single-responsibility selector.** It prefers
  the reactive `bchWalletState.cashAddress`, falls back to
  `wallet.walletInfo.cashAddress`, and returns `null` when neither is present.
  Pure, dependency-free, trivially testable. The property-test oracle
  (`expectedGet`) and the four unit tests trace exactly to the source's
  precedence rule — traced line-by-line and consistent.
- **`index.js` wiring fix is sound.** The Follow/Mute button address now comes
  from `getViewerAddress` (reactive-then-wallet) instead of only
  `wallet.walletInfo.cashAddress`, so the button appears once the reactive
  wallet state loads. `myAddr`, `wallet`, and `appProfiles` were extracted as
  locals and added to the effect dependency array, so the profile re-loads when
  the address becomes available. Component delegates address selection to the
  pure helper; dependency direction is correct (core helper ← component, no
  reverse coupling).
- **Fixed a broken convenience script.** `swarmforge/scripts/gherkin-parser`
  delegated to `.swarmforge/tools/aps`, a path that did not exist anywhere in
  the monorepo (the established APS checkout is `./tmp/aps-spec`, per
  `docs/architect-startup.md` and `architect-startup.sh`). Corrected it to
  `tmp/aps-spec` and verified it now emits valid parser JSON.
- **Mutation manifest added for the new module.** The language mutation tool
  recorded a differential-mutation baseline for `profile-wallet.js`
  (getViewerAddress fully covered, 2/2 mutants killed). Preserved so future
  runs can detect source drift.
- Test/property separation respected: property tests live in
  `test/property/`, reuse the shared client `harness.js`, and are run via the
  dedicated `test:property` command.

## Verification results

- **Client unit tests:** **243 passing**, lint clean.
- **Client property tests** (`test:property`): **33 passing** (incl. 3 new
  `getViewerAddress` precedence/fallback/absence properties).
- **Language mutation** (`mutate4javascript`, `--max-workers 8`,
  `src/services/profile-wallet.js`): **Killed 2, Survived 0, Uncovered 0.**
- **DRY (`dry4javascript`):** `No duplicate candidates found`.
- **Soft Gherkin acceptance mutation** (`follow-user.feature --level soft`):
  **Total 6, Killed 0, Survived 6, Errors 0.** All six are single-character
  case mutations of the example `addr` (a cash address used identically on the
  setup and assertion sides of each scenario) — intrinsic equivalents, not
  chased.

## Suite status

- `psf-memo-client`: unit **243 passing**, property **33 passing**, lint clean.
- The standalone React smoke test (`src/App.test.js`) is not part of the
  project's `npm test` glob and requires react-scripts/jsdom; it is unrelated to
  this change (same as the memo-db.js/adapter exclusion precedent).

## Handoffs sent

- `git_handoff` to coder and refactorer (`priority: 00`) with the merge/review
  commit for follow-up review.
