# Review summary: post-link-formatting

**Architect review of the refactorer handoff for task `post-link-formatting`.**

## Commits reviewed
- `968970b` (specifier): Spec post link formatting
  (`psf-memo-client/specs/post-link-formatting.feature`).
- `6c7952f` (coder): Format post URLs and bare domains as links — pure
  `parsePostLinks` service (`src/services/post-links.js`), link rendering in
  `src/components/post-feed/post-content.js`, acceptance handlers/adapter, unit
  tests.
- `e17c515` (refactorer): Add property tests for post link parsing
  (`test/property/post-links.property.test.js`).

Merged onto the architect worktree (`swarmforge-architect`) by fast-forwarding
to `e17c515`.

## Architectural findings and fixes applied
The structure is sound and matches the codebase's layered layout. UI/Core
separation, the dependency rule, and information hiding all hold:

- **UI/Core separation:** `src/services/post-links.js` is a pure text parser
  (`parsePostLinks`) with no React or network dependencies, so it is unit- and
  property-testable directly. `src/components/post-feed/post-content.js` is a
  pure presentational component written in plain `React.createElement` style
  (no JSX, no I/O), so the same module drives the browser build and the Node
  acceptance adapter.
- **Dependency rule:** the component depends inward on the two pure services
  (`post-links`, `youtube-embed`); neither service depends outward on the
  component, the DOM, or the acceptance layer.
- **Information hiding:** the parser exposes only the segment shape
  (`{type:'text'}` / `{type:'link', href, text}`); the renderer hides the anchor
  and iframe markup (target/rel/class/allow/referrerPolicy).

Three issues left by the handoff were fixed:

1. **Unkilled boundary mutants (information hiding / edge cases).** The first
   mutation run left 3 survivors in `isBareDomainBoundary`. I added two unit
   tests — a bare domain at the *start* of the text (must link) and a bare
   domain glued to a leading token character such as `-example.com` (must stay
   text) — and removed the redundant `end < input.length` guard before
   `input[end] === '@'` (an out-of-range index is `undefined`, so the guard only
   created an equivalent mutant). `post-links.js` is now 15 killed / 0 survived.
2. **Unkillable React key mutant (cohesion).** `post-content.js` incremented a
   mutable `key` counter whose starting value (`0 -> 1`) is unobservable in
   rendered output. I now build the children without keys and let
   `React.Children.toArray` assign stable positional keys; the rendered markup
   is unchanged and the mutant site is gone.
3. **Boolean-attribute survivor.** Added an `allowfullscreen` assertion to the
   embedded-YouTube render test, killing the `allowFullScreen: true -> false`
   mutant.

Noted but intentionally left as-is: `post-links.js` repeats a
trailing-punctuation regex and a `pushText` helper from `youtube-embed.js`.
`dry4javascript` reports no duplicate candidates, and single-sourcing a shared
URL tokenizer would be a cross-module refactor beyond this task.

## Verification results

### Language mutation (`mutate4javascript`, differential, `--max-workers 8`)
- **`src/services/post-links.js`**: 15 killed, **0 survived**, 0 uncovered.
- **`src/components/post-feed/post-content.js`**: 1 killed, **0 survived**, 0 uncovered.

### DRY (`dry4javascript`)
- Changed files (`post-links.js`, `post-content.js`): **no duplicate candidates**.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions are below the 8.0 threshold and 100% covered:
`parsePostLinks` (CC 6, CRAP 6.0), `PostContent` (CC 5, CRAP 5.0),
`isBareDomainBoundary` (CC 4, CRAP 4.0), `pushText` (CC 2, CRAP 2.0).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **`post-link-formatting.feature`**: 21 executed, **18 killed**, **3 survived**.
  All three survivors are single-character case mutations of unasserted
  trailing words in the `text` example (`herE`, `rePly`, `livE`). Each scenario
  asserts the link `href` (and, for bare domains, the visible link text); the
  trailing prose is setup-only and never asserted, so mutating its case cannot
  change the outcome. These are weak example-to-assertion connections, not
  implementation gaps; no change warranted. The tool wrote a per-scenario
  acceptance-mutation manifest stamp for the fully-killed YouTube scenario and
  correctly withheld a full-feature stamp because survivors remain.

## Suite status
`swarmforge/scripts/verify.sh client --record …` → **pass (5/5)**:
- unit **329 passing**, property **50 passing**, acceptance **all 26 suites
  passing**, lint **pass**, build **pass**.

## Handoffs sent
- End-of-chain `git_handoff` to the specifier (`priority: 50`, task
  `post-link-formatting`) with the review commit so it can merge
  `swarmforge-architect` into `master`.
- No coder/refactorer handoff: the review commit is mutation/test hardening plus
  a behavior-preserving renderer refactor, with no follow-up work for them.

By architect.
