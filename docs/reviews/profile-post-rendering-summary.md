# Profile Post Rendering — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `profile-post-rendering` (refactorer handoff
  `merge_and_process refactorer b2aed01348`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `1411abe`). Commits:
  - `9caf063` Record tx-handoff-retry-logging completion in backlog and
    briefing (specifier/master)
  - `f5cb7ea` Specify profile post rendering (specifier)
  - `87d40ca` Render profile posts with shared post content (coder)
  - `b2aed01` Refactor profile post rendering: share acceptance assertions, add
    properties (refactorer)
- Architect review commit: `5076f073e9` — tool-written `mutate4javascript` and
  gherkin-mutation manifests only. No production behavior changed.
- Records/summary commit: this commit.

The `/profile/:addr` post cards previously rendered post text as plain text, so
image URLs, YouTube links, and other links did not get the inline embed/link
behavior the recent posts feed already had. The profile post text is now
rendered through a new pure `ProfilePostContent` seam that wraps the shared
`PostContent` renderer inside the profile post-text element
(`p.profile-post-text.card-text`). Embeddable YouTube links become an embedded
player, image URLs render inline inside a new-tab anchor (with a failed-image
fallback to a plain link), other URLs render as new-tab links, and surrounding
text is preserved. Read-only: no Memo broadcast, no DB change.

## Architectural review

- **UI/Core separation (good).** `ProfilePostContent` is a pure
  `React.createElement` module (no browser or IO API) that delegates all
  parsing/embedding to the shared `PostContent` renderer. The React shell
  (`profile/index.js`) only supplies `post.text`, and the acceptance adapter
  (`acceptance/lib/render-profile-post.js`) renders the same module to static
  HTML under Node, so the profile seam is exercised without a browser.
- **Dependency rule (good).** The profile presentation module depends inward on
  the shared post-feed renderer; both are framework-facing leaves, and no
  IO/persistence detail crosses into them. The shell depends on the seam, not
  the reverse.
- **Information hiding and encapsulation (good).** The seam exposes only `text`
  and `initialFailedImages`; the parsing, image detection, YouTube-embed URL
  construction, and failed-image state stay hidden in `PostContent` and the
  pure services it uses. The `card-text` class React Bootstrap previously added
  via `Card.Text` is preserved by the wrapper, so the markup contract is
  unchanged.
- **Local code quality (good).** `ProfilePostContent` is a single CC-1
  delegation. The refactorer replaced the feed's inline post-rendering
  assertions with shared `assertRendered*` helpers and reused them for the
  profile steps, so the feed and profile acceptance seams assert the same
  contract and cannot drift apart.
- **Accepted observation — the two rendering acceptance adapters share their
  shape (documented, not changed).** `render-profile-post.js` and
  `render-post.js` are near-identical `createElement` +
  `renderToStaticMarkup` shells differing only in the component they wrap.
  This is the established per-seam adapter convention
  (`render-account-avatar`, `render-post-options`, `render-like-result`), and
  the language DRY tool reports no duplicate candidate for them (structural
  similarity below threshold), so they were left as-is.
- **Accepted observation — scenario 4 does not assert preserved surrounding
  text (documented, not changed).** The two soft-Gherkin survivors below are
  case changes to the non-URL words in scenario 4's `text` example; scenario 4
  asserts the link and the absence of an image, not the surrounding prose, so
  the mutation passes. Surrounding-text preservation is independently asserted
  by scenarios 2 and 3 (`text_without_url`), so this is intrinsic to the
  scenario's assertion set, not an implementation gap; changing it would be a
  spec-level decision for the specifier.

## Fixes applied

No production structural fix was needed: module boundaries, dependency
direction, and information hiding were accepted as delivered, and there were no
language-mutation survivors or uncovered sites to harden. The architect's
changes are tool-written metadata only:

- `mutate4javascript` manifest on
  `src/components/app-body/profile/profile-post-content.js` (function recorded;
  no mutable sites).
- `gherkin-mutator` soft-mutation manifest on
  `specs/profile-post-rendering.feature` (records the four fully killed
  scenarios).

## Verification results

Record (pinned to the review commit `5076f073e9`):

| File | Component |
|------|-----------|
| `docs/reviews/profile-post-rendering-verification.json` | psf-memo-client |

- **Language mutation** (`swarmforge/scripts/mutate-file.sh <file>
  --max-workers 8`, one file at a time):
  - `src/components/app-body/profile/profile-post-content.js`: **0 total / 0
    covered / 0 killed / 0 survived / 0 uncovered.** The scan confirms the zero
    is structural: the module is a pure `createElement` wrapper with no
    arithmetic, comparison, equality, boolean, logical, or `0<->1` constant
    sites, consistent with the documented pure-module precedent
    (`block-explorer.js`, `like-result.js`). No survivors.
  - The JSX shell (`src/components/app-body/profile/index.js`) remains excluded:
    `mutate4javascript` cannot parse JSX (no plugin), as in prior reviews; its
    behavior is exercised end-to-end through acceptance.
- **DRY** (`dry4javascript`, scoped):
  - production (`profile-post-content.js`, `index.js`, both render adapters):
    **"No duplicate candidates found."**
  - tests (`test/unit/profile-post-content.test.js`,
    `test/property/profile-post-content.property.test.js`): **"No duplicate
    candidates found."**
  - `acceptance/lib/handlers.js`: **102** pre-existing score-1.00 boilerplate
    duplicates (unchanged from prior reviews); **none** of the changed regions
    (the new shared assertion helpers, ~lines 4860–4970, and the profile
    handlers, ~lines 4536–4592) participates in a candidate.
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the changed production
  seam, 100% coverage): `ProfilePostContent` **CC 1 / CRAP 1.0**. Exit 0
  (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the client runner worker and `--json`):
  - `psf-memo-client/specs/profile-post-rendering.feature`: **35 total, 33
    killed, 2 survived, 0 errors.** The tool wrote a manifest recording
    scenarios 1, 2, 3, and 5 as fully killed (4/4, 3/3, 16/16, 4/4); scenario 4
    keeps two intrinsic survivors and is re-mutated next run.
  - Survivors, both intrinsic to scenario 4's assertions (the scenario asserts
    the link and no image, not the surrounding prose):
    - `$.scenarios[3].examples[0].text`: `read https://example.com/page now` ->
      `rEad https://example.com/page now` (the link example `<url>` and the
      no-image assertion are unchanged).
    - `$.scenarios[3].examples[3].text`: `visit memo.fullstackcash.net for
      details` -> `visit memo.fullstackcash.net For details` (same).
- **Suite status**: `verify.sh client` **result: pass (5/5)** at `git_sha
  5076f073e9`:
  - unit **636 pass / 0 fail** (629 before; +7 `profile-post-content` unit
    tests)
  - property **178 pass / 0 fail** (172 before; +6
    `profile-post-content` property tests)
  - acceptance **all 42 generated suites passed** (41 before; the new
    `profile-post-rendering` suite adds 13 example executions across 5
    scenarios)
  - lint ok
  - build ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only tool-written mutation/acceptance metadata.
