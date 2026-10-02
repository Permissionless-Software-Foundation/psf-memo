# feed-pagination-scroll — Architect Review

Task: `feed-pagination-scroll`
Component: `psf-memo-client`
Base: `cf6310e` (account-page-layout architect record); inbound refactorer
batch (priority 10, one item) merged by fast-forward to `c4fbca1`.

## What was reviewed

The linear chain reviewed:

- **`e4134a3`** — specifier: *Record account-page-layout completion*.
  Non-task churn carried by the specifier branch (`specifier-prompt.md`,
  `specs/feature-backlog.md`).
- **`14a5ecf`** — specifier: *Changeing site title*. Non-task churn: the page
  title in `psf-memo-client/public/index.html` and the account page heading.
- **`d067d8e`** — specifier: *Specify feed pagination scroll to top*. Adds
  `psf-memo-client/specs/feed-pagination-scroll.feature` (three outlines plus
  one scenario covering Next/Previous pagination and Recent/Following tab
  change scrolling the feed to the top).
- **`43e5684`** — coder: *Reset posts feed scroll to top on page load and tab
  change*. Adds the injected `scrollToTop` adapter to `FeedTabsPage`, wires the
  browser `window.scrollTo` shell in the posts view, and adds the Previous-page
  and scrolled-to-top acceptance handlers.
- **`c4fbca1`** — refactorer: *Refactor feed pagination scroll: cover scroll
  reset with properties*. Extracts the duplicated failed-load state reset in
  the posts view into one `resetFeedState` helper, and adds the scroll-reset
  property suite (one scroll per completed load, none for no-op actions,
  conservation across random action sequences).

**Architect review commit: `181709a7e0`** — consolidates the seven per-action
scroll-reset unit tests into one table-driven test over a shared page builder
(the DRY fix), and carries the tool-written `mutate4javascript` manifest for
`feed-tabs-page.js` and the soft acceptance-mutation manifest for
`feed-pagination-scroll.feature`. The verification record and this summary are
committed on top, so `git diff 181709a7e0 HEAD` touches only `docs/`. The
record's `git_sha` is `181709a7e0`, the commit that contains the verified source
state.

## Architectural findings and fixes applied

1. **UI/Core separation (good).** `FeedTabsPage` stays a pure coordinator: it
   has no React, DOM, or network import and reaches the viewport only through
   the injected `scrollToTop` adapter (default no-op). The React posts page
   supplies `() => window.scrollTo({ top: 0, left: 0 })`. The controller decides
   *when* to reset; the view owns *how*.
2. **Dependency rule (good).** The view depends inward on the coordinator and
   the recent/following page controllers; the coordinator depends on the page
   controllers and the injected adapter. No high-level module depends on a
   browser API.
3. **Information hiding (good).** The reset is a single call in `_loadMode`
   after the page state is set; no-op paths (`selectTab` on the active tab,
   `nextPage`/`previousPage` off their bounds) return before reaching it, so the
   reset cannot drift from the load. `getState` remains the only snapshot the
   view consumes.
4. **Testable boundary (good).** The acceptance world injects a fake
   scroll adapter that records `feedScrollTop`, so the scroll assertion runs
   under Node without a browser. The same pattern is reusable for future
   viewport behavior.
5. **DRY (fix applied).** `dry4javascript` scoped to the changed production
   files, tests, and adapter reported two duplicate test blocks in
   `test/unit/feed-tabs-page.test.js` (the seven scroll-reset tests repeated the
   same page construction and, in two cases, the same action sequence). Replaced
   them with a `makeScrollPage` helper and one table-driven test enumerating the
   seven action cases. Re-run reports **zero non-handler candidates**; the
   remaining 103 candidates are all pre-existing `acceptance/lib/handlers.js`
   step-handler boilerplate left as-is per the established noise floor.
6. **Noted, not changed.** The new property conservation test wraps each random
   action in `try/catch` that swallows all errors (to ignore the wallet-less
   Following failure). That is broad but deliberate: the property compares the
   scroll-request count to the successful-load count, so an action that fails
   before completing a load must leave both unchanged. `posts/index.js` is a JSX
   page and, like the other `app-body/*/index.js` pages, is not
   language-mutation-analyzed; its `resetFeedState` extraction is covered by the
   unit/property/acceptance suites.

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`, differential)

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/services/feed-tabs-page.js` | 22 | 0 | 0 |
| **Total** | **22** | **0** | **0** |

The differential pass selected 9 changed sites; the `mutate-file.sh` wrapper
detected `Selected 9 < Covered 22` and reran with `--mutate-all`, killing all
22. The tool rewrote the embedded manifest, which is committed.
`src/components/app-body/posts/index.js` is JSX and cannot be parsed by the
mutation tool (standing precedent); its behavior is exercised by acceptance.

### DRY (`dry4javascript`, scoped)

`src/services/feed-tabs-page.js`, `test/unit/feed-tabs-page.test.js`,
`test/property/feed-tabs-page.property.test.js`, and
`acceptance/lib/handlers.js`: **zero non-handler duplicate candidates** (was two
before the test consolidation). The 103 `handlers.js` candidates are the
pre-existing step-handler boilerplate pattern.

### Cyclomatic complexity (`crap4javascript`)

Changed non-JSX file `src/services/feed-tabs-page.js`: every function at 100%
coverage; highest **CRAP 5.0** (`FeedTabsPage.open`), remaining functions 1.0–3.0,
well under the 8.0 threshold.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`feed-pagination-scroll.feature`: **14 total, 9 killed, 5 survived, 0 errors.**
Every survivor is an intrinsic equivalent, not an implementation gap:

- `m3` (`scenarios[1].examples[0].count` `4 -> 5`): the fixture is
  over-provisioned and the scenario asserts a 2-post page plus scroll-to-top, so
  a larger served count cannot change the assertion (upper-bound fixture).
- `m5`/`m8`/`m11`/`m14` (`scenarios[1]`/`[2]` `followee` address case flips,
  e.g. `Qr95… -> qr95…`): the address is used to seed the follow relationship
  and the served posts through the same example value, so a case-insensitive
  address stays self-consistent on setup and assertion.

The mutated `count` values (`4 -> 0`, `5 -> 0`, `5 -> 9`, `4 -> -4`, `5 -> 2`)
and the `expected_post` text changes were all **killed**, confirming the
pagination offset, the Next/Previous assertions, and the scroll assertion are
tied to real behavior. The manifest records the one fully-killed scenario (0);
the intrinsic-survivor scenarios are intentionally re-mutated next run.

### Suite status

Canonical record against review commit `181709a7e0`:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/feed-pagination-scroll-verification.json --task feed-pagination-scroll`
  -> **pass (5/5)**: unit **759 pass / 0 fail**, property **212 pass / 0 fail**,
  acceptance **all 47 suites passed**, lint **ok**, build **ok**.

Property tests run as their own explicit command by `verify.mjs`, separate from
unit coverage and language mutation. Only `psf-memo-client` was touched, so one
component record is sufficient (`docs/reviews/feed-pagination-scroll-verification.json`).

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `feed-pagination-scroll`)
  with the review commit `181709a7e0` so it can merge `swarmforge-architect`
  into `master`.
- No coder/refactorer handoff: this review consolidates unit tests and commits
  tool-written manifests, with no follow-up work for those roles.

By architect.
