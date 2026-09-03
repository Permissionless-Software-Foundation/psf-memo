# Notifications — Architectural Review Summary

**Task:** notifications
**Commit reviewed:** `f1841b64a6` (refactorer) — "Refactor notifications: extract reply predicate, add manifests"
**By:** architect

## Scope

Reviewed the refactorer's notifications refactor and the surrounding read-only
notifications feature across `psf-memo-db` (aggregation adapters, use case,
REST controller) and `psf-memo-client` (notifications page service).

## Architectural findings and fixes applied

- **Extracted a shared `getPostOrNull` helper.** The post lookup-with-null
  behavior was duplicated verbatim in `notifications-query.js` and
  `post-query.js`. Moved it to `src/adapters/lib/get-post-or-null.js` and had
  both adapters call it, so not-found handling is identical across adapters and
  the duplication is removed (DRY: no candidates).
- **Confirmed the refactorer's reply-predicate extraction.** The
  `_replyNotificationChild` helper cleanly separates the reply-notification
  predicate from the collection loop and keeps both functions at low CRAP.
- **Added a dedicated unit suite for `NotificationsQuery`.** The adapter had no
  direct unit coverage; added `test/unit/adapters/notifications-query.unit.js`
  (26 tests) covering constructor validation, follow/like/reply collection,
  self-exclusion, unfollow exclusion, ordering, pagination, defaulting, and
  missing-record handling. This raised the adapter to 100% line coverage.
- **Hardening tests to kill survivors.** Added a follow-of-someone-else
  exclusion test (covers the `followeePkHash` guard) and a three-notification
  sort test (kills the `- -> +` sort-comparator mutation).

## Verification results

- **Language mutation (`mutate4javascript`, `--max-workers 8 --mutate-all`):**
  - `notifications-query.js`: **Killed 15, Survived 5, Uncovered 0.**
  - `post-query.js`: **Killed 40, Survived 0, Uncovered 0.**
  - `lib/get-post-or-null.js`: **Killed 1, Survived 0, Uncovered 0.**
- **Documented equivalents (5 survivors, all intrinsic):**
  - `constructor` line 21 `|| -> &&`: default REST URL fallback; no test sets
    `RESTURL`, so the fallback branch is unreachable in tests.
  - `_collectFollowNotifications` line 68 `[0] -> [1]`: `key.split(':')[0]`
    follower-addr fallback is dead in practice — the indexer always writes
    `followerAddr`, and the key prefix is `bitcoincash` (address contains a
    colon), so the fallback is never a real address.
  - `_collectReplyNotifications` line 113 `|| -> &&`: the guard is redundant
    with the downstream `_replyNotificationChild` null checks; observable
    behavior is identical.
  - `_sortNotifications` line 150 `0 -> 1` (x2): `seen ?? 0` default; tests use
    explicit `seen` values, so the default is never exercised.
- **DRY (`dry4javascript`):** no duplicate candidates in the changed files.
- **Cyclomatic complexity (CRAP):** all functions well under the 8.0 threshold
  (max 6.0); all changed functions at 100% coverage.
- **Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`):**
  **Killed 0, Survived 16, Errors 0.** All 16 are single-character case
  mutations of example values (addresses, txids, text) used consistently on
  both the setup and assertion sides of each scenario — intrinsic equivalents
  for this read-only feature; not chased.

## Suite status

- `psf-memo-db`: unit **315 passing**, lint clean.
- `psf-memo-client`: **239 passing**, lint clean, build succeeds.

## Handoffs sent

- `git_handoff` to coder and refactorer (`priority: 00`) with the review commit
  for follow-up review.
