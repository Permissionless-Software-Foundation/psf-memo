# Profile Ordering by Last Post — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `profile-last-post` (refactorer handoff
  `merge_and_process refactorer 6b8da07981`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `5fce140`). Commits:
  - `915971a` Record recent profile identity completion in backlog and briefing
    (specifier/master; the prior task's completion record, carried in by the
    fast-forward and outside this task)
  - `1119988` Specify profile ordering by last post (specifier)
  - `bdf2c30` Implement profile ordering by last post (coder)
  - `6b8da07` Refactor profile-last-post: split recency logic, add property
    tests (refactorer)
- Architect review commit: `ace7038` — mutation-killing unit tests plus the
  tool-written `mutate4javascript` manifests and `gherkin-mutator` acceptance
  mutation metadata. No production behavior changed.
- Records/summary commit: this commit.

`GET /profile/recent` now lists one row per profile that has at least one
confirmed qualifying post (top-level post `0x6d02` or topic message `0x6d0c`;
replies `0x6d03` and poll creations `0x6d10` do not qualify), ordered by the
most recent qualifying post's block height descending, then seen descending,
then address ascending, considering confirmed blocks only. The Block and Seen
columns report the post's values rather than the set-profile transaction's. The
indexer maintains a `profileRecency` store (one `{ addr, blockHeight, seen }`
record per profile address) and a backfill rebuilds it from existing data.
Touches `psf-memo-db` and `psf-memo-indexer` (the client renders the returned
block/seen unchanged).

## Architectural review

- **UI/Core separation (good).** On the DB side `ProfileQuery` owns all LevelDB
  access and the recency ordering, `ListRecentProfiles` orchestrates only the
  page-scoped identity join, and the REST controller maps HTTP. The backfill
  rules live in the pure, store-injected `src/lib/backfill-profile-recency.js`;
  the environment-bound CLI wrapper (`util/profiles/backfill-profile-recency.js`)
  only opens LevelDB and reads env, so the logic is fully testable without a
  filesystem. On the indexer side `profile-recency.js` holds the recency rules
  behind injected adapters and is called by the `post` and `set-profile`
  action handlers, mirroring the existing `topic-indexing.js` shape.
- **Dependency rule (good).** Adapters near IO depend on nothing upward; the
  `ListRecentProfiles` use case and the action handlers depend on injected
  adapter interfaces; the backfill library depends only on injected stores. No
  new upward or IO-inward dependency was introduced.
- **Information hiding and encapsulation (good).** `ProfileQuery` exposes only
  `listRecentProfiles`/`getProfileIdentity`; store names, key formats, and
  not-found handling stay internal. The indexer exposes only
  `recordProfileRecency`/`establishProfileRecency`. The cross-boundary contract
  is the small `{ addr, blockHeight, seen }` record.
- **Local code quality (good).** `handlePost` extracts the
  `qualifiesForRecency` predicate, and the recency selection is split into
  small helpers. CRAP/cyclomatic complexity is at or below CC 6 / CRAP 6.0 for
  every analyzed function (details below); no dead code or unused imports were
  introduced.
- **Accepted tradeoffs (documented, not changed).** The `profileRecency` store
  is address-keyed for idempotent upsert, so `ProfileQuery.listRecentProfiles`
  reads and sorts the whole recency index in memory (O(P log P)) rather than
  using a bounded ordered scan like `topicRecency`'s inverted-height key. The
  spec explicitly frames the read as "the profileRecency index plus per-page
  profile lookups" and only forbids scanning `addrPostHeights` or sorting every
  profile, so this is within spec; a compound key would be a broader index
  redesign (and would need stale-key deletion like `recordTopicPost`).
  Separately, orphan recency records (no matching profile) are dropped from the
  page but still counted in `total`; both writers maintain the
  every-recency-has-a-profile invariant, so orphans only arise from direct
  CRUD writes and the defensive drop is tested. The qualifying-post rules are
  duplicated between the indexer and the DB backfill by design — they are
  separate deployables with different stores, and sharing code would couple
  them.

## Fixes applied

No production structural fix was needed: module boundaries, dependency
direction, and information hiding were accepted as delivered. The architect's
substantive change is the mutation-hardening unit suite (kill language-mutation
survivors and cover the one uncovered site), plus tool-written metadata:

- **DB tests** (`test/unit/lib/backfill-profile-recency.unit.js`,
  `test/unit/adapters/profile-query.unit.js`): cover the status-tip
  confirmation boundary (no tip, exact tip), unexpected-store-error
  propagation, addresses without a profile, malformed addrPostHeights entries,
  missing optional reply/poll stores, missing post seen, stale-record removal,
  greater-seen tie-break, the `addrPostHeight` key height fallback, the
  `listRecencyEntries` height/seen defaults, the `listRecentProfiles` default
  limit/offset, and the address comparator tie-break.
- **Indexer tests**
  (`test/unit/use-cases/action-types/profile-recency.unit.js`,
  `test/unit/use-cases/action-types/set-profile.unit.js`): `isConfirmed`
  boundaries, recency-record height/seen defaults, missing-store fallbacks,
  missing addrPostHeight height, missing post seen, status-read-error fallback,
  newest-of-several selection, and the set-profile stored text plus max-size
  boundary. The recency test file was refactored onto shared `makeAdapters`/
  `assertRecency`/`addAddrPost`/`addPost` helpers so `dry4javascript` reports no
  duplicate candidates.
- Tool-written `mutate4javascript` manifests refreshed and `gherkin-mutator`
  `# mutation-stamp`/manifest metadata written into the changed features.

## Verification results

Records (both pinned to the review commit `ace7038`):

| File | Component |
|------|-----------|
| `docs/reviews/profile-last-post-verification.json` | psf-memo-indexer |
| `docs/reviews/profile-last-post-db-verification.json` | psf-memo-db |

- **Language mutation** (`mutate4javascript <file> --max-workers 8` via
  `swarmforge/scripts/mutate-file.sh`, one file at a time; differential runs
  that under-selected were rerun with `--mutate-all`): **55 killed, 7 survived,
  0 uncovered.** Per file (final):
  - `psf-memo-db/src/lib/backfill-profile-recency.js`: **19 killed, 2
    survived**, 0 uncovered (was 12/7 with 2 uncovered before hardening)
  - `psf-memo-db/src/adapters/profile-query.js`: **15 killed, 1 survived**, 0
    uncovered (was 8/8)
  - `psf-memo-db/src/use-cases/list-recent-profiles.js`: 2 killed, 0 survived
  - `psf-memo-db/src/adapters/index.js`: 0 killed, **2 uncovered** (pre-existing
    adapter wiring, exercised by DB acceptance only)
  - `psf-memo-db/src/adapters/level-db.js`: 0 mutation sites
  - `psf-memo-db/src/controllers/rest-api/level/crud-handlers.js`: 0 killed,
    **2 uncovered** (pre-existing `ENTITY_CONFIG` wiring, acceptance only)
  - `psf-memo-indexer/src/use-cases/action-types/profile-recency.js`: **14
    killed, 4 survived**, 0 uncovered (was 4/13 with 1 uncovered)
  - `psf-memo-indexer/src/use-cases/action-types/post.js`: 3 killed, 0 survived
  - `psf-memo-indexer/src/use-cases/action-types/set-profile.js`: **2 killed, 0
    survived** (was 0/2)
  - `psf-memo-indexer/src/adapters/adapters-index.js`: 0 killed, **1
    uncovered** (pre-existing adapter wiring, acceptance only)
- **Documented equivalent survivors (7).** All are guard-redundant
  comparison operators with no observable difference:
  - `backfill-profile-recency.js` `isNewer` lines 101 and 102 `> -> >=`: line
    101 compares only unequal heights (the guard already excluded equality) and
    line 102 only equal seen values (the same `{ addr, blockHeight, seen }` is
    written either way).
  - `profile-query.js` `compareRecency` line 41 `< -> <=`: line 40 already
    returns 0 for equal addresses, so `<` and `<=` are equivalent.
  - `profile-recency.js` (indexer) `upsertProfileRecency` line 48 `<= -> <`:
    an equal height+seen re-write is an idempotent write of identical values.
    Line 63 `blockHeight ?? 0` is unreachable (`isConfirmed` rejects a null
    block height first). `newerCandidate` lines 84 and 85 `> -> >=`: line 84
    compares only unequal heights and line 85 only equal seen values, both
    writing identical records.
- **Uncovered wiring (5, pre-existing).** The `profileRecencyDb`/
  `profileRecency` wiring in `psf-memo-db/src/adapters/index.js`,
  `psf-memo-db/.../crud-handlers.js`, and
  `psf-memo-indexer/src/adapters/adapters-index.js` has no unit coverage;
  `mutate4javascript` runs the unit suite as its baseline, so those wiring
  sites report uncovered. They are exercised end-to-end by the component
  acceptance suites, consistent with prior reviews.
- **DRY** (`dry4javascript`, scoped to the changed production files and then to
  the changed tests): production **"No duplicate candidates found."**; the
  test scope is clean after the helper refactor.
- **Cyclomatic complexity / CRAP** (`crap4javascript`, all at 100% coverage
  except the pre-existing `handlePost`/`handleSetProfile` error branches):
  - DB max CC 5 / CRAP 5.0 (`ProfileQuery.compareRecency`,
    `ProfileQuery.getRecordOrNull`, `qualifyingCandidate`); `getRecord` CC 4,
    `isQualifyingPost` CC 4, `ListRecentProfiles.execute` CC 1.
  - Indexer max CC 6 / CRAP 6.0 (`qualifyingCandidate`); `handlePost` CC 5 /
    CRAP 5.7, `isConfirmed`/`recordProfileRecency`/`upsertProfileRecency`/
    `newerCandidate` CC 5 / CRAP 5.0, `establishProfileRecency`/
    `getChainBlockHeight` CC 4, `handleSetProfile` CC 3. All below the 8.0
    threshold.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the component runner workers):
  - `psf-memo-db/specs/recent-profile-ordering.feature`: **29 total, 28 killed,
    1 survived, 0 errors.** The survivor is
    `scenarios[0].examples[1].limit: 2 -> 6` — at `offset 2` only two rows
    remain, so limit 2 and limit 6 return the same page. Intrinsic equivalent
    (the feature records only the clean scenario in its manifest and carries no
    stamp).
  - `psf-memo-db/specs/backfill-profile-recency.feature`: **12 total, 12
    killed, 0 survived, 0 errors** — `# mutation-stamp` written.
  - `psf-memo-db/specs/recent-profile-identity.feature`: **9 total, 9 killed, 0
    survived, 0 errors** — `# mutation-stamp` written (the feature changed to
    load `profileRecency`, invalidating the prior stamp).
  - `psf-memo-indexer/specs/profile-recency-indexing.feature`: **88 total, 8
    killed, 80 survived, 0 errors.** Every surviving mutation is a
    consistent-example-value change (`addr`, `txid`, `text`, `room`,
    `question`, or a single-post `height`/`seen`) that the scenario passes
    through both its setup and assertion steps, or a value the scenario does
    not assert at all, so the mutated value cancels out. The 8 killed mutations
    are all in the "greatest height wins regardless of processing order"
    outline, where two independently-named heights/seens are compared. The
    intrinsic survivors leave an empty `scenarios` manifest and no stamp, which
    is the tool's expected output for a write-side feature whose only
    observable result is the recency record.
  All four features' tool-written metadata is committed as-is.

## Suite status

`verify.sh` **result: pass** for both components at `git_sha ace703831f`:

- `verify.sh db` — unit **431 passing**, property **66 pass / 0 fail**,
  acceptance **all 22 suites passed**, lint ok.
- `verify.sh indexer` — unit **146 passing**, property **14 pass / 0 fail**,
  acceptance **all 9 suites passed**, lint ok.

(The hardening added 18 DB unit tests and 14 indexer unit tests over the
delivered suite; DB acceptance took ~115 s, indexer ~2.5 s.)

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only hardening tests and tool-written mutation/acceptance
  metadata.
