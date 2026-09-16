# Review summary: post-image-rendering

**Architect review of the refactorer handoff for task `post-image-rendering`.**

## Commits reviewed
- `53d7439` (specifier): Spec post image rendering
  (`psf-memo-client/specs/post-image-rendering.feature`).
- `3971e07` (coder): Render image URLs inline in posts — pure
  `isImageUrl`/`imageAltText` helpers in `src/services/post-links.js`, a
  `PostImage` presentational component plus failed-image state in
  `src/components/post-feed/post-content.js`, acceptance handlers/adapter, and
  unit tests.
- `e77e174` (refactorer): Refactor post image rendering and cover image helpers
  — extracted the pure `addFailedImage` set transition into
  `src/services/failed-images.js`, DRY'd the acceptance no-link/no-image
  assertions through `assertFeedHasNoElement`, added property tests for image
  detection/alt text/rendering.

Merged onto the architect worktree (`swarmforge-architect`) by fast-forwarding
to `e77e174`.

**Architect review commit: `19e57be`** (code + manifests + unit test). This
summary and the verification record are committed directly on top of it, so
`git diff 19e57be HEAD` touches only `docs/`. The record's `git_sha` is
`19e57be`, the commit that contains the review source changes.

## Architectural findings and fixes applied
The structure is sound and matches the codebase's layered layout. UI/Core
separation, the dependency rule, and information hiding all hold:

- **UI/Core separation:** `parsePostLinks`, `isImageUrl`, and `imageAltText`
  are pure text/URL functions with no React or network dependency, and
  `addFailedImage` is a pure `Set` transition free of React and the DOM. All
  four are directly unit- and property-testable. `PostImage`/`PostContent` are
  presentational (`React.createElement`, no JSX, no IO), so the same module
  drives the browser build and the Node acceptance adapter.
- **Dependency rule:** the component depends inward on the pure services
  (`post-links`, `failed-images`, `youtube-embed`); none of those services
  depends outward on the component, the DOM, or the acceptance layer.
- **Information hiding:** the services expose only
  `parsePostLinks`/`isImageUrl`/`imageAltText`/`addFailedImage`; `PostImage`
  hides the anchor/img markup and the fallback behavior; the `Set`
  representation of failed images stays inside `PostContent`/`failed-images`.
  The acceptance seam is the `initialFailedImages` prop, the minimal
  synchronous injection needed because static server rendering cannot emit
  image `error` events.
- **Local quality:** the `PostImage` fallback anchor repeats the plain-link
  anchor attributes. `dry4javascript` reports no candidate (below its
  structural threshold), so extracting a shared `PostLink` component would add
  indirection without measured duplication gain; left as-is.

One issue left by the handoff was fixed:

1. **Unkilled language mutant (edge cases).** `mutate4javascript` left one
   survivor in `isImageUrl` at line 83 (`if (typeof url !== 'string') return
   false`; `false -> true`). The non-string guard was never exercised. Added
   `isImageUrl rejects non-string input` (`null`, `undefined`, `12345`, `{}`)
   to `test/unit/post-links.test.js`, which kills it.

Tool-written artifacts committed with the review: the embedded
`mutate4javascript` manifests in `post-links.js`/`post-content.js` (now track
`isImageUrl`, `imageAltText`, and `PostImage`) and the `gherkin-mutator`
acceptance-mutation stamp at the top of `post-image-rendering.feature`
(scenarios 1 and 3 fully killed; scenario 2 withheld because of the survivor
below).

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`)
- **`src/services/post-links.js`**: 20 killed, **0 survived**, 0 uncovered
  after the fix (1 survivor before).
- **`src/components/post-feed/post-content.js`**: 2 killed, **0 survived**,
  0 uncovered.
- **`src/services/failed-images.js`**: 0 mutation sites (no supported
  operators), 0 uncovered.

### DRY (`dry4javascript`)
- Changed files (`post-links.js`, `failed-images.js`, `post-content.js`):
  **no duplicate candidates**.
- `acceptance/lib/handlers.js`: no new candidates involving the added
  handlers or `assertFeedHasNoElement`; the pre-existing route/controller
  boilerplate duplicates are untouched.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions are below the 8.0 threshold:
`PostContent` (CC 6, 97.1% covered, CRAP 6.0), `parsePostLinks` (CC 6, 100%,
6.0), `isBareDomainBoundary` (CC 4, 100%, 4.0), `imageAltText` (CC 3, 100%,
3.0), `isImageUrl` (CC 3, 100%, 3.0), `addFailedImage` (CC 2, 100%, 2.0),
`PostImage` (CC 2, 100%, 2.0), `pushText` (CC 2, 100%, 2.0).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **`post-image-rendering.feature`**: 26 executed, **25 killed**, **1
  survived**, 0 errors.
- Survivor: scenario 2, example 1, `read https://example.com/page now` ->
  `reaD https://example.com/page now`. Scenario 2 asserts the link and the
  absence of an image, not the surrounding prose, so a case mutation of the
  setup-only word `read` cannot change the outcome. This is a weak
  example-to-assertion connection (the same class as the documented
  post-link-formatting trailing-prose survivors), not an implementation gap —
  scenario 1 asserts its surrounding text case-sensitively, which is why its
  mutants died. Not chased.

## Suite status
`swarmforge/scripts/verify.sh client --record
docs/reviews/post-image-rendering-verification.json --task post-image-rendering`
-> **pass (5/5)**: unit **346 passing**, property **58 passing**, acceptance
**all 27 suites passing**, lint **pass**, build **pass**.

## Handoffs sent
- End-of-chain `git_handoff` to the specifier (`priority: 50`, task
  `post-image-rendering`) with the review commit so it can merge
  `swarmforge-architect` into `master`.
- No coder/refactorer handoff: the review is a test addition plus tool-written
  manifests, with no follow-up work for them.

By architect.
