# Notifications Query Performance — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `notifications-query-performance` (refactorer handoff
  `merge_and_process refactorer 45a7b34fad`).
- Merged `swarmforge-refactorer` (fast-forward from `1e58b5b`). Commits:
  - `22928d7` Spec notifications query performance
  - `f45d63c` Implement notifications query performance (coder)
  - `45a7b34` Refactor notifications query: cut CRAP, share test double, add
    membership property (refactorer)
- Architect review commit: `c9728cc301` (test hardening + tool-written
  mutation/acceptance manifests).
- Verification records `git_sha`: `c9728cc301`.
- Records/summary commit: this commit.

The feature bounds `GET /posts/notifications/:addr` to the viewer's activity
inside a configurable block window (`NOTIFICATION_BLOCK_WINDOW`, default
25000; cutoff = `status.chainBlockHeight - window`): the viewer's posts come
from `addrPostHeights`, likes/replies are prefix-scanned per viewer post from
`postLikes`/`postChildren`, and follows come from the new followee-keyed,
height-ordered `followeeHeights` index written by the indexer. Touches
`psf-memo-indexer` (index writes) and `psf-memo-db` (read path, config,
backfill utility, `/level/followeeheight` route).

## Architectural findings

- **UI/Core separation (good).** `NotificationsQuery` is a pure adapter with
  injected LevelDB handles and `muteQuery`; it never opens files or touches the
  network, so the whole read path is unit-testable. The only environmental edge
  is the injected `bchjs` address encoder, which is stubbed in tests.
- **Dependency direction (good).** The adapter receives `notificationBlockWindow`
  through `Adapters`, which receives it from `Controllers` (the composition
  root) rather than importing `config` itself, so configuration flows inward and
  the adapter stays independent of the config module.
- **Information hiding (good).** Only `listNotifications` is public;
  `prefixRange`, `txidFromKey`, `firstDefined`, `isSuppressedActor`,
  `isNotFoundError`, `getRecordOrNull`, `_scanPostIndex`, `_followNotifications`
  and the per-store collectors are module-private. The followee index's key
  layout is encapsulated behind `_windowCutoff`/`prefixRange`, and the backfill's
  key builder behind `followeeHeightKey`.
- **Cohesion (good).** The refactorer's extractions and the shared
  `_scanPostIndex` removed the like/reply scan duplication and cut the highest
  cyclomatic complexity from 11 to 6.
- **Test boundaries (good).** `test/property/` stays separate from
  `test/unit/`, and the unit/property suites now share `test/support/level-double.js`
  instead of two local LevelDB doubles. No property tags leak into unit
  coverage, mutation, CRAP, or Gherkin runs.
- **Observation, not changed — cross-component key-format duplication.** The
  `followeeHeights` key format is encoded twice: `psf-memo-indexer`'s
  `helpers.js#followeeHeightKey` (write side) and `psf-memo-db`'s
  `lib/backfill-followee-index.js#followeeHeightKey` (backfill). The components
  are separate npm packages with no shared package, and the indexer already
  mirrors every other Memo key format locally, so this is the established
  boundary/contract rather than a local DRY candidate. Documented for a future
  shared-protocol-package task.
- **Observation, not changed — `padHeight` repetition within psf-memo-db.**
  `HEIGHT_PAD`/height padding appears in `notifications-query.js`,
  `backfill-followee-index.js`, `backfill-topic-indexes.js`, and
  `post-query.js`. `dry4javascript` does not flag the single-line helper (below
  its structural thresholds); consolidating it is a cross-adapter refactor
  beyond this handoff. Documented.

## Fixes applied

- **Killed mutation survivors with targeted unit coverage.** Added to
  `test/unit/adapters/notifications-query.unit.js`: the follow
  `blockHeight`/`seen` defaults; the like/reply `seen` defaults; both
  `_sortNotifications` `seen` tie-break argument defaults; and a zero-cutoff
  case for a status record missing `chainBlockHeight` with
  `notificationBlockWindow: 0`.
- **Covered the new config.** Added `test/unit/config.test.js` asserting the
  `notificationBlockWindow` default and the LevelDB-only flags, which also kills
  the two pre-existing config-constant survivors.
- **Killed the indexer key default survivor.** Added a `follow.unit.js` case
  that calls `handleFollow` with a missing `blockHeight` and asserts the padded
  `000000000000` followee key.
- **No production changes were needed.** The refactorer's module structure,
  dependency direction, and information hiding were accepted as-is.

## Verification results

Records (both pinned to the review commit `c9728cc301`):

| File | Component |
|------|-----------|
| `docs/reviews/notifications-query-performance-verification.json` | psf-memo-db (primary) |
| `docs/reviews/notifications-query-performance-indexer-verification.json` | psf-memo-indexer |

- **Language mutation** (`mutate4javascript`, `--max-workers 8`; the wrapper
  detected differential under-selection on the first run and reran with
  `--mutate-all`):
  - `psf-memo-db/src/adapters/notifications-query.js`: **23 killed, 3 survived,
    0 uncovered.**
  - `psf-memo-db/src/lib/backfill-followee-index.js`: **10 killed, 0 survived,
    0 uncovered.**
  - `psf-memo-db/config/env/common.js`: **2 killed, 0 survived, 0 uncovered**
    (after adding the config unit test).
  - `psf-memo-db/src/adapters/level-db.js`: **6 killed, 0 survived, 0 uncovered.**
  - `psf-memo-db/src/controllers/rest-api/level/crud-handlers.js`: **1 killed,
    0 survived, 2 uncovered** (pre-existing `{ success: true }` update/delete
    response sites, not part of this task).
  - `psf-memo-db/src/adapters/index.js`: 0 killed/0 survived, **2 uncovered**
    (composition-root wiring).
  - `psf-memo-db/src/controllers/index.js`: 0 killed/0 survived, **1 uncovered**
    (composition-root wiring).
  - `psf-memo-indexer/src/use-cases/action-types/follow.js`: **4 killed,
    0 survived, 0 uncovered.**
  - `psf-memo-indexer/src/use-cases/action-types/helpers.js`: **24 killed,
    0 survived, 0 uncovered** (after adding the missing-height key test).
- **Documented intrinsic equivalents (3):**
  - `notifications-query.js` `padHeight` line 33 `?? 0 -> ?? 1`: dead defensive
    default — the only caller (`prefixRange`) guards `null` and always passes a
    number.
  - `notifications-query.js` `_sortNotifications` line 280 `?? 0 -> ?? 1` (x2):
    dead — every collector normalizes `seen` to a number (`?? 0`) before the
    sort, so the comparator never sees `undefined`. Confirmed by the two added
    tie-break tests, which cannot distinguish the mutants for this reason.
  - The uncovered composition-root/wiring sites are recorded by the refreshed
    manifests and do not affect the tested behavior of this task.
- **DRY** (`dry4javascript`, scoped to the changed production files):
  `No duplicate candidates found` for both `psf-memo-db` and `psf-memo-indexer`.
- **Cyclomatic complexity / CRAP** (`crap4javascript`): `psf-memo-db` max
  CRAP 6.0 (`backfillFolloweeIndex` and `_collectReplyNotifications`, CC 6,
  100% coverage); `psf-memo-indexer` max CRAP 5.0 (`normalizeTwoPushMemoDatas`,
  CC 5, 100%). All changed functions are at or below the 8.0 threshold;
  `handleFollow` and `followeeHeightKey` are CC 3 and CC 1 at 100% coverage.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`):
  - `psf-memo-db/specs/notifications-query-performance.feature`: 49 total,
    **32 killed, 17 survived, 0 errors**. All 17 are intrinsic equivalents:
    `limit`/`offset` values that do not cross the fixture's actual result count
    (the query scans the full in-window set before slicing), `window` shifts of
    a few blocks that leave every fixture height on the same side of the cutoff,
    `at most <max>` upper bounds where a larger bound can never fail, and
    single-character case changes of `excluded_actor` used only on the assertion
    side. Not chased; tool wrote the (empty) scenario manifest.
  - `psf-memo-db/specs/backfill-followee-index.feature`: 20 total, **20 killed,
    0 survived, 0 errors** → tool wrote the `# mutation-stamp` plus the
    per-scenario manifest (committed as-is).
  - `psf-memo-indexer/specs/followee-heights-indexing.feature`: 17 total,
    **4 killed, 13 survived, 0 errors**. All 13 are consistent-value intrinsic
    equivalents: `follower`/`followee` single-character case changes and
    `height`/`unfollowHeight` shifts where the same example cell drives both the
    indexed action and the asserted `followeeHeights` key. Not chased; tool wrote
    the (empty) scenario manifest.

## Suite status

All records `result: pass` at `git_sha c9728cc301`.

- **psf-memo-db**: unit **396 passing**, property **58 pass / 0 fail**,
  acceptance **all 18 suites passed**, lint ok.
- **psf-memo-indexer**: unit **120 passing**, property **12 pass / 0 fail**,
  acceptance **all 8 suites passed**, lint ok.

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using the records/summary commit.
- `git_handoff` to `coder` and `refactorer` (priority 00) with the review commit
  for follow-up review (test hardening and refreshed manifests only; no
  production change).
