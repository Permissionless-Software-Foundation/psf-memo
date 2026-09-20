# Recent Profile Identity — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `recent-profile-identity` (refactorer handoff
  `merge_and_process refactorer 63107855a2`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from `2d1755a`). Commits:
  - `761d526` Record feed tabs completion in backlog and briefing
    (specifier/master; the prior task's completion record, carried in by the
    fast-forward and outside this task)
  - `dda94b1` Specify recent profile identity for `/profile/recent` (specifier)
  - `9fb092e` Implement recent profile identity join and Account column (coder)
  - `6310785` Harden recent profile identity with property tests (refactorer)
- Architect review commit: `7973e2d` (tool-written mutation manifests and
  Gherkin acceptance stamps only; no production behavior changed).
- Records/summary commit: this commit.

`GET /profile/recent` now joins each profile's current display name (newest
`setName`, names store) and avatar URL (newest `setProfilePic`, profilePics
store), both keyed by address and reported as `null` when absent, without
changing order or pagination. The client `/profile/recent` table gains a
leftmost Account column showing that name and avatar, both linking to the
profile, with truncated-address and identicon fallbacks. Touches
`psf-memo-db` and `psf-memo-client`.

## Architectural review

- **UI/Core separation (good).** The DB join is split correctly: `ProfileQuery`
  owns LevelDB access (`getProfileIdentity`, `getRecordOrNull`), the
  `ListRecentProfiles` use case orchestrates the page-only join, and the
  controller only maps HTTP in/out. On the client the Account cell is a
  DOM-free CommonJS component (`recent-profile-account.js`) with a matching
  `acceptance/lib/render-recent-profile-account.js` adapter, and the account
  mapping is a pure module (`recent-profiles-table.js`), so the behavior is
  testable without a browser.
- **Dependency rule (good).** `ProfileQuery` (low-level, near IO) does not
  reach upward; `ListRecentProfiles` depends on it through the injected
  `adapters.profileQuery` interface, and the controller depends on the use
  case. Direction is unchanged by this task.
- **Information hiding and encapsulation (good).** The adapter exposes only
  `getProfileIdentity(addr) -> { name, profilePicUrl }`; both stores and the
  not-found handling are hidden behind it. Missing-store behavior (null
  identity) is documented and tested. The use case exposes only the enriched
  page and the unchanged pagination shape; the client consumes the same
  `name` / `profilePicUrl` wire fields, so no persistence structure leaks
  across the boundary.
- **Local code quality (good).** The join is bounded to the requested page and
  runs in parallel; no dead code or unused imports were introduced. The
  acceptance handlers assert both the view model and the rendered HTML.
- **Duplication (documented, not changed).** The new `profilePath` and
  display-name fallback in `recent-profiles-table.js` mirror
  `notification-entry.js`. `dry4javascript` reports no duplicate candidate in
  either file (the helpers fall below its candidate thresholds), and the
  standing precedent is to avoid a cross-feature extraction for a trivial
  helper; the fallback already shares `truncateAddr` from `util`. Left as-is.
- **Mutation boundary limitation (documented).** The two added
  `namesDb`/`profilePicsDb` wiring lines in `adapters/index.js` have no unit
  coverage; they are exercised by DB acceptance, but `mutate4javascript` runs
  the unit suite as its test command, so those two sites report uncovered.
  The client JSX page `index.js` is a thin shell that `mutate4javascript`
  cannot parse (Babel syntax error) and `node --test` does not load; its pure
  model and cell are fully covered by the mutated modules.

## Fixes applied

No production structural fix was needed: module boundaries, dependency
direction, and information hiding were accepted as delivered. The only review
changes are the tool-written artefacts from the verification sequence:

- `mutate4javascript` manifests refreshed in `profile-query.js`,
  `list-recent-profiles.js`, `adapters/index.js`, `recent-profile-account.js`,
  and `recent-profiles-table.js`.
- `gherkin-mutator` `# mutation-stamp` + `acceptance-mutation-manifest` written
  into `psf-memo-db/specs/recent-profile-identity.feature` and
  `psf-memo-client/specs/recent-profile-display.feature`.

## Verification results

Record (pinned to the review commit `7973e2d`):

| File | Component |
|------|-----------|
| `docs/reviews/recent-profile-identity-verification.json` | psf-memo-client |
| `docs/reviews/recent-profile-identity-db-verification.json` | psf-memo-db |

- **Language mutation** (`mutate4javascript <file> --max-workers 8` via
  `swarmforge/scripts/mutate-file.sh`, one file at a time):
  **12 killed, 0 survived.** Per file:
  - `psf-memo-db/src/adapters/profile-query.js`: 6 killed, 0 survived
  - `psf-memo-db/src/use-cases/list-recent-profiles.js`: 3 killed, 0 survived
  - `psf-memo-db/src/adapters/index.js`: 0 covered, **2 uncovered** (the
    acceptance-only wiring described above)
  - `psf-memo-client/src/services/recent-profiles-table.js`: 2 killed, 0 survived
  - `psf-memo-client/src/components/app-body/recent-profiles/recent-profile-account.js`:
    1 killed, 0 survived
  - `psf-memo-db/.../profile/controller.js`: 0 mutation sites
- **DRY** (`dry4javascript`, scoped to the changed production files of both
  components): **no duplicate candidates found.**
- **Cyclomatic complexity / CRAP** (`crap4javascript`):
  - Client: `accountDisplayName` CC 2 / CRAP 2.0, `buildRecentProfileAccount`
    CC 2 / CRAP 2.0, `RecentProfileAccount` CC 2 / CRAP 2.0,
    `RecentProfileAvatar` CC 2 / CRAP 2.0, `buildRecentProfilesTable` CC 1 /
    CRAP 1.0, `profilePath` CC 1 / CRAP 1.0 — all 100% coverage.
  - DB: `ProfileQuery.getRecordOrNull` CC 5 / CRAP 5.0,
    `getProfileIdentity` CC 3 / CRAP 3.0,
    `scanProfilesWithBlockHeight` CC 2 / CRAP 2.0,
    `ListRecentProfiles.execute` CC 1 / CRAP 1.0,
    `ProfileRESTControllerLib.getRecentProfiles` CC 2 / CRAP 2.1 (75%
    coverage; unit path only, error path in `handleError`), `handleError`
    CC 1 / CRAP 1.0. Max CRAP 5.0, all below the 8.0 threshold.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`):
  - `psf-memo-db/specs/recent-profile-identity.feature`: **9 total, 9 killed,
    0 survived, 0 errors.**
  - `psf-memo-client/specs/recent-profile-display.feature`: **10 total, 10
    killed, 0 survived, 0 errors.**
  Both features therefore carry a `# mutation-stamp` and a manifest recording
  every scenario; committed as tool-written.

## Suite status

`verify.sh` **result: pass** for both components at `git_sha 7973e2d`:

- `verify.sh client` — unit **520 pass / 0 fail**, property **125 pass / 0
  fail**, acceptance **all 38 suites passed**, lint ok, build ok.
- `verify.sh db` — unit **413 passing**, property **63 pass / 0 fail**,
  acceptance **all 20 suites passed**, lint ok.

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  change to review, only tool-written mutation manifests and acceptance stamps.
