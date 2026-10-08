# Architect review — `new-topic-ui`

**Role**: architect
**Task**: `new-topic-ui` (client-only feature, `psf-memo-client`)
**Reviewed commits**: `9b363e2` (spec) → `cd47e83` (push count) → `2b2e799`
(implementation) → `a5a018b` (refactor: reuse the shared page submit template)
**Merge**: `3857c60` (refactorer `swarmforge-refactorer` → `swarmforge-architect`)
**Review commit**: `7ad5c49` (tool-written mutation manifests)
**Verification record**: `docs/reviews/new-topic-ui-verification.json`
(`git_sha` `7ad5c491760c0e856cb0be6cfe7adf455c85a312`)

## Scope

Adding a New Topic page to the React SPA. Creating a topic is the same on-chain
action as posting to a topic (`0x6d0c` Memo topic-message), so the feature is
client-only: no indexer, DB, or CLI change. The change set is the spec
(`specs/new-topic.feature`), the controller
(`src/services/new-topic-page.js`), the JSX shell
(`src/components/app-body/new-topic/index.js`), a New Topic entry point on the
topics page (`topic-discovery-page.js` + `topics/index.js`), route registration,
and the acceptance step handlers.

## Architectural findings

The refactorer's `a5a018b` moved `NewTopicPage` onto the shared
`PageController` submit template. The high-level design is sound:

- **UI/Core separation** — `NewTopicPage` is a plain, Node-testable controller.
  The React shell (`new-topic/index.js`) only owns local form state and error
  copy; wallet, feed, and navigate are injected, so the page runs under
  `node --test` with no DOM, network, or framework.
- **Dependency rule** — the controller depends on the stable `PageController`
  abstraction and the `MemoTopicPost` action, not on concrete I/O. The
  `memoTopicPostFactory` boundary keeps the room→action construction injectable.
- **Information hiding** — the byte budget is exposed through
  `NewTopicPage.MAX_TOPIC_MESSAGE_BYTES` and `remainingCount()`; the view never
  sees the protocol constant or the `utf8` helper directly. `topic-discovery`
  exposes only `hasNewTopicButton()` and `openNewTopic()` to the shell.
- **Two-field page on a single-input base** — `NewTopicPage` keeps
  `topicName`/`firstMessage` and overrides `_perform()` to read `firstMessage`,
  rather than forcing both fields through `PageController.input`. `_perform`'s
  parameter is therefore unused. This is a deliberate, readable extension of the
  base contract, not a leak; the alternative (folding both fields into a
  composite `input`) would duplicate state or require getters for no benefit.
- **Byte-budget convention** — `remainingCount()` computes
  `MAX - byteLength(room) - byteLength(message)` directly from `utf8`. This
  matches the established sibling pattern (`profile-text-page.js`,
  `reply-thread-page.js`); `topic-post-page.js` delegates only because it already
  holds a `MemoTopicPost` instance. Keeping the direct form is consistent with
  the codebase, so no change was made.
- **Routing** — `/topics/new` is registered before `/topics/:room`; React Router's
  ranking makes that unambiguous.

No source or test change was required by the review. The only committed changes
are the mutation tools' embedded manifests.

### Documented behavior note

`normalizeRoom` trims, then strips a leading `#` run, then lowercases. A typed
name whose `#` is followed by whitespace (e.g. `"# bitcoin"`) therefore yields a
room with a leading space and is not idempotent in one pass. The spec does not
cover this input and the implementation matches its documented order, so the
refactorer preserved the behavior and pinned convergence over repeated
application. Left as-is; not a regression and not a spec conflict.

## Verification

### Language mutation (`mutate4javascript`, one file at a time, `--max-workers 8`)

| File | Covered | Killed | Survived | Uncovered |
|------|---------|--------|----------|-----------|
| `src/services/new-topic-page.js` | 8 | 8 | 0 | 0 |
| `src/services/topic-discovery-page.js` | 3 | 3 | 0 | 0 |

`topic-discovery-page.js`'s differential run initially selected 1 of 3 covered
sites after new functions were added; `mutate-file.sh` detected the
under-selection and reran with `--mutate-all` (3/3 killed). The new JSX shells
are not mutation-testable (the tool has no JSX parser plugin) and are covered by
the acceptance suite, consistent with the established boundary.

### DRY (`dry4javascript`)

Focused on the changed production files and tests:
**no duplicate candidates**. The scoped run that included
`acceptance/lib/handlers.js` reported only the pre-existing step-handler
boilerplate noise floor (hundreds of score-1.00 blocks); no task-local duplicate
was introduced.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`specs/new-topic.feature`: **35 total / 14 killed / 21 survived / 0 errors**.
The survivors are all intrinsic equivalents, not coverage gaps:

- **Room-case mutations (m3, m6, m9, m12, m15) were killed** — confirming the
  normalized room is asserted exactly, via both the push payload and the feed
  path.
- **`name` case flips** (m2, m5, m8, m11, m14, m20, m22, m25, m28, m31, m34)
  survive because normalization lowercases, so the expected room is unchanged.
- **`message` case/character flips** (m1, m4, m7, m10, m13, m19, m21, m27, m33)
  survive because each example value is used consistently on the setup and
  assertion sides, or because only its byte length matters (scenarios 6 and 7).
- **`broadcast_error` case flip** (m35) survives because the wallet is
  configured to fail with the mutated string and the assertion expects it
  consistently.

The tool wrote an `acceptance-mutation-manifest` listing the two fully-killed
scenarios ("New Topic - 4", "New Topic - 5"); scenarios with intrinsic survivors
are intentionally re-mutated next run.

### CRAP / cyclomatic complexity (`crap4javascript`)

Changed services (`new-topic-page.js`, `topic-discovery-page.js`): **100%
coverage on every function, max CC 2, max CRAP 2.0**, exit 0 (threshold 8.0).

### Canonical suite (`verify.sh client`, at `7ad5c49176`)

| Command | Result |
|---------|--------|
| unit | 773 pass / 0 fail |
| property | 215 pass / 0 fail |
| acceptance | all 48 suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/new-topic-ui-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `new-topic-ui`, commit `7ad5c49176`.
