# post-options-menu — Architect Review

Task: `post-options-menu`
Component: `psf-memo-client`
Base: `5e62d1e` (last merged architect review); inbound refactorer commit `d0882bb`

## What was reviewed

Inbound refactorer batch (priority 10), merged onto `swarmforge-architect` by
fast-forwarding to `d0882bb`. The linear chain reviewed:

- **`091272d`** — specifier: *Record feed-total-cap completion in backlog and briefing*.
- **`bc964fa`** — specifier: *Specify post options menu for all post cards*. Adds
  `psf-memo-client/specs/post-options-menu.feature` (9 scenario outlines across the
  recent/following/topic/thread/profile surfaces) and the backlog entry.
- **`20e67da`** — coder: *Implement post options menu on every post card*. Adds the
  pure `src/services/post-options.js`, the `src/components/post-feed/post-options-menu.js`
  shared React component, the acceptance render adapter, the post-options acceptance
  handlers, and unit tests; wires the menu into `post-feed-item.js` and `profile/index.js`.
- **`d0882bb`** — refactorer: *Refactor post options menu and add property tests*.
  Moves the key-command mapping into `postOptionsKeyCommand` in the pure service so the
  component is a thin adapter, DRYs the duplicated acceptance step bodies behind
  `togglePostOptionsMenu` / `transitionActivePostOptionsMenu`, and adds
  `test/property/post-options.property.test.js`.

**Architect review commit: `07ff61392b`** — the two `mutate4javascript` manifest
footers, the soft `gherkin-mutator` acceptance-mutation manifest stamp on
`post-options-menu.feature`, and the hardening changes described below. The
summary and verification record are committed on top, so
`git diff 07ff61392b HEAD` touches only `docs/`. The record's `git_sha` is
`07ff61392b`, the commit that contains the verified source state.

## Architectural findings and fixes applied

The refactorer's structure is sound: a framework-free core service, a React
adapter, and a separate acceptance render adapter. Two testability gaps found
by language mutation were fixed with a behavior-preserving extraction.

1. **UI/Core separation.** `src/services/post-options.js` is plain CommonJS with
   no React, DOM, or IO; it owns URL construction and the open/close/focus
   transitions. The React component consumes it through `require` and only maps
   state to markup. The acceptance pipeline reaches the same service through
   `acceptance/lib/render-post-options.js`, which server-renders the actual
   component. Core behavior is exercised with no browser.
2. **Dependency rule.** The service depends on nothing; the component and the
   acceptance adapter depend inward on the service. No framework or persistence
   structure leaks across the boundary.
3. **Uncovered mutation / testable boundary.** The outside-click decision was an
   inline `containerRef.current && !containerRef.current.contains(event.target)`
   inside `useEffect`, which the unit (`node --test`) harness never executes, so
   the `&& -> ||` mutation was **uncovered**. Extracted it to the pure
   `isOutsidePostOptions(container, target)` in the service; the effect is now a
   thin adapter and the decision is unit tested. This follows the role rule to
   maximize testable modules and minimize the environmentally unsuitable shell.
4. **Mutation survivors.** Two `-1` default-focus literals survived because no
   unit test rendered an *open* menu with the default (unfocused) state: the
   `initialFocusedIndex = -1` default and the `tabIndex ... : -1` else branch.
   Added a unit test asserting the default open menu makes no item tabbable,
   killing both. (Property tests are a separate suite and are intentionally not
   part of the language-mutation test command.)
5. **Duplication.** The refactorer's acceptance-step DRY is local and clear; the
   new service helper adds no duplication. `dry4javascript` reported 96
   duplicate blocks, all pre-existing `acceptance/lib/handlers.js`
   step-handler boilerplate; none involves the post-options modules.
6. **Test/helper separation.** `render-post-options.js` (acceptance helper) and
   the property-test generators live in their helper libraries, separate from
   the unit and property test files.

## Verification results

### Language mutation (`mutate4javascript`, differential, `--max-workers 8`)

Initial component run before the fix: **3 killed, 2 survived, 1 uncovered**.
After the extraction and unit tests:

- **`src/services/post-options.js`**: 10 covered sites. Differential selected
  1 of 10 after the new function; `mutate-file.sh` auto-reran `--mutate-all`:
  **10 killed, 0 survived, 0 uncovered**.
- **`src/components/post-feed/post-options-menu.js`**: **5 killed, 0 survived,
  0 uncovered**.

### DRY (`dry4javascript`)

Changed source/tests/handlers plus `acceptance/lib/handlers.js`:
**no duplicate candidate involves the new code**. 96 reported blocks are
pre-existing handler step-handler boilerplate, consistent with prior reviews.

### CRAP / cyclomatic complexity (`crap4javascript`)

All changed functions below the 8.0 threshold:
`PostOptionsMenu` (CC 3, 81.8% covered, CRAP 3.1 — the uncovered remainder is the
DOM `useEffect` shell), `postOptionsKeyCommand` (CC 3, CRAP 3.0),
`isOutsidePostOptions` (CC 2, 100%, CRAP 2.0), and the remaining service
accessors (CC 1–2, 100%).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

- **`post-options-menu.feature`**: **20 executed, 20 killed, 0 survived,
  0 errors**. All nine scenario outlines killed every soft mutation, so the tool
  wrote a full-feature acceptance-mutation manifest stamp (no survivors to
  document).

### Suite status

`swarmforge/scripts/verify.sh client --record
docs/reviews/post-options-menu-verification.json --task post-options-menu`
-> **pass (5/5)**:
unit **364 passing**, property **68 passing**, acceptance **all 28 suites
passing**, lint **pass**, build **pass**. Record `git_sha` = `07ff61392b`.

## Handoffs sent
- End-of-chain `git_handoff` to the specifier (task `post-options-menu`) with the
  review commit so it can merge `swarmforge-architect` into `master`.
- No coder/refactorer handoff: the review is test hardening plus a
  behavior-preserving extraction with no follow-up work for them.

By architect.
