# Review: page-size-50

**By architect.**

## Task and commits reviewed
- Task: `page-size-50` — reduce the client page size from 100 to 50 across all paginated
  pages (recent feed, following feed, topic feed, notifications, search, profile, recent
  profiles) to cut payload size and reduce page load times, plus add pagination controls and
  full acceptance coverage.
- Inbound handoff: refactorer `a9488d9ae2` (fast-forward merge onto `swarmforge-architect`).
- Reviewed commits: `81cedab` (spec), `59cce442`/merge `38f7a42` (implementation by coder),
  `a9488d9` (refactorer — PaginatedPage base + property coverage), and `0dba837` (briefing/
  backlog update after the youtube-embed merge).
- Scope note: the fast-forward also carried the prior `0dba837` specifier/backlog update;
  it is informational only, no code.

## Architectural findings and fixes applied
- **Good UI/Core separation:** page services remain pure, testable controllers with the MemoDb
  client injected. The coder's change was a one-line default (`limit = 100` → `limit = 50`)
  in each `load`/`submit` plus new `canLoadMore()` methods on the four pages that lacked them.
- **Refactorer DRY extraction:** extracted a shared `PaginatedPage` base (new
  `src/services/paginated-page.js`) and subclassed `RecentFeedPage` and `RecentProfilesPage`
  onto it, removing the duplicated load/canLoadMore pattern. Dependency direction is correct:
  the concrete pages depend on the pure base; the base has no IO. Each subclass keeps a thin
  custom item-finder (`getPost`/`getProfile`). Clean, cohesive, well-hidden. No structural
  changes required.
- **Hardening (this review):** killed the surviving `canLoadMore` mutation in the base and the
  three pages that added `canLoadMore` without tests (profile, search, topic-feed), plus
  `notifications-page`, all of which had the same uncovered `?? false` default-on-null edge:
  - Added new `test/unit/paginated-page.test.js` (6 tests) covering load storage, the
    missing-client guard, the 50/0 defaults, and `canLoadMore` under null / missing-`hasMore`
    pagination.
  - Added `canLoadMore` null-pagination tests to `notifications`, `profile`, `search`, and
    `topic-feed` unit test files.
- **Documented equivalent (not chased):** the `notifications-page.js` constructor
  `this.empty = false → true` mutation survives because `load()` always overwrites `empty`
  before it is read (component and acceptance both read it after `load`). Genuine equivalent.
- **Noted, not refactored:** the pagination Previous/Next UI is duplicated across the profile,
  recent-profiles, and search components. Extracting a shared pagination component is a broad
  cross-module UI refactor beyond this handoff; the controller-side dedup via `PaginatedPage`
  is the appropriate scope here.

## Verification results
- **Language mutation** (`mutate4javascript <file> --max-workers 8 --mutate-all`, sequential):
  - `paginated-page.js` Killed 5 / 0 survived / 0 uncovered
  - `recent-feed-page.js` Killed 1 / 0 / 0
  - `recent-profiles-page.js` Killed 1 / 0 / 0
  - `following-feed-page.js` Killed 12 / 0 / 0
  - `notifications-page.js` Killed 11 / 1 survived / 0 uncovered (the constructor `empty`
    equivalent documented above)
  - `profile-page.js` Killed 22 / 0 / 0
  - `search-page.js` Killed 9 / 0 / 0
  - `topic-feed-page.js` Killed 15 / 0 / 0
  - `memo-db.js` is excluded from mutation testing (ESM + `../config` directory import,
    standing precedent).
- **DRY** (`dry4javascript`) on all touched services: no duplicate candidates.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft` on `page-size.feature`):
  0 killed, 24 survived. All 24 are single-character case/value mutations of setup example
  values — counts that stay above 50 and addresses/topics/queries/txids used consistently on
  both sides of their scenario. Intrinsic equivalents for a read-only feature; not chased.
- **Unit tests** (`npm test`): 280 passing (267 prior + 13 hardening), 0 fail.
- **Property tests** (`npm run test:property`): 40 passing (37 prior + 3 new
  `paginated-page` properties), 0 fail.
- **Acceptance** (`npm run test:acceptance`): all 22 generated suites PASS, including the new
  `page-size` scenarios.
- **Lint:** clean. **Build:** OK.

## Suite status
- psf-memo-client: 280 unit, 40 property, acceptance PASS, lint clean, build OK.

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the review commit for follow-up
  review.
- No functional commit for the specifier (the task produced a functional client change, but
  the specifier-authored spec `81cedab` is already merged and there is no new feature to
  specify; the handoff chain ends at architect + coder/refactorer review).
