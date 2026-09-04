# Review: topics-most-recent-order

**By architect.**

## Task and commits reviewed
- Task: `topics-most-recent-order` — order `GET /topics` by most recent post.
- Inbound handoff: refactorer `57915081c6` (merged fast-forward onto `swarmforge-architect`).
- Reviewed commits: `bc07eda` (spec), `f45f2f9` (implementation), `5791508` (property-test comment), plus the merged `f7647c7`/`5bc61c7` history.

## Architectural findings and fixes applied
- **Finding (information hiding):** the refactorer's `TopicQuery.listTopics()` returned
  `{ room, postCount, lastHeight }`, and that shape flowed unchanged through the
  `ListTopics` use case to the REST controller, so `lastHeight` leaked into the public
  `/topics` API response. The client does not use it, the spec does not require it, and
  the controller's documented contract only exposes `room` and `postCount`.
- **Fix:** `listTopics()` now sorts by `lastHeight` internally and then strips it from the
  returned objects, so the adapter's public contract stays `{ room, postCount }` and the
  ordering key is hidden at the adapter boundary. No use-case/controller change needed.
- **Hardening:** added two unit tests pinning the block-height-0 edge cases
  (a post at height 0, and a post with no height field) so the ordering key's default
  handling is covered.

## Verification results
- **Language mutation** (`mutate4javascript src/adapters/topic-query.js --max-workers 8 --mutate-all`):
  Killed 21, Survived 1, Uncovered 0.
  - Survivor `line 56 > -> >=` in `listTopics` is a **genuine equivalent**: the max of a
    set of equal heights is unchanged regardless of which equal element is kept, so `>`
    and `>=` produce identical ordering. Documented, not chased.
- **DRY** (`dry4javascript src/adapters/topic-query.js`): no duplicate candidates.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft` on `topic-read.feature`):
  new scenario Topic Read - 5 has 1 mutation, 1 killed, 0 survived. Two survivors in the
  pre-existing pagination scenario (Topic Read - 3) are intrinsic `limit`-value equivalents
  (mutating a limit that exceeds available posts does not change the result); pre-existing,
  not introduced by this task.
- **Cyclomatic complexity:** no new branches beyond the existing sort comparator; no concern.

## Suite status
- psf-memo-db: 317 unit passing, 39 property passing, lint clean, topic-read acceptance
  scenarios 1-5 all PASS (including the new ordering scenario).
- psf-memo-client: build OK, 243 tests passing, lint clean (verified because the merged
  commit also carried the `app-body/index.js` Profile `appData` change from prior work).

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the review commit for
  follow-up review.
