# Architect review — `new-topic-normalize`

**Role**: architect
**Task**: `new-topic-normalize` (client-only, `psf-memo-client`)
**Reviewed commits**: `d51646f` (specifier) → `86971d0` (coder) → `3dd214b`
(refactorer, tests-only)
**Merge**: `c4a4472afe` (refactorer `swarmforge-refactorer` → `swarmforge-architect`)
**Review commit**: `ce6bf63961` (tool-written mutation manifests)
**Verification record**: `docs/reviews/new-topic-normalize-verification.json`
(`git_sha` `ce6bf6396106030207d358c98f7293ac42caad56`)

## Scope

Follow-up to `new-topic-ui`: tighten `NewTopicPage.normalizeRoom` so a `#`
followed by whitespace cannot leave a leading space in the room. The task
touches only the client: the spec (`specs/new-topic.feature`), the controller
(`src/services/new-topic-page.js`), and the unit/property tests.

## Architectural findings

- **Normalization is now correct and idempotent.**
  `normalizeRoom` is `String(name).trim().replace(/^[#\s]+/, '').toLowerCase()`.
  The regex and `trim()` use the same whitespace class, so a leading run of `#`
  and whitespace is removed in one pass: `"# bitcoin"` → `"bitcoin"`,
  `"##BCH"` → `"bch"`, `"  #Cash  "` → `"cash"`, and `" # "` → `""` (rejected).
  The previously documented non-idempotence is resolved.
- **Spec alignment.** `new-topic.feature` now states the tightened rule and adds
  `"# bitcoin"`/`"##BCH"` example rows, so the behavior change is spec-backed
  rather than an implementation-only choice.
- **Tests follow the behavior.** The unit tests add the spaced/double-hash cases
  and the `' # '` empty rejection; the property tests replace the
  repeated-application convergence loop with a direct idempotence assertion and
  fold the trimmed invariant into the shape property.
- **Boundaries unchanged.** `NewTopicPage` still extends `PageController` and
  keeps wallet/feed/navigate injected; no coupling, cohesion, or information
  hiding regressions were introduced. No further source or test change was
  required by the review.

The only committed review changes are the mutation tools' embedded manifests.

## Verification

### Language mutation (`mutate4javascript`)

| File | Covered | Killed | Survived | Uncovered |
|------|---------|--------|----------|-----------|
| `src/services/new-topic-page.js` | 8 | 8 | 0 | 0 |

The differential run selected 0 sites (the changed `normalizeRoom` function has
no arithmetic/comparison/boolean/`0<->1` sites); `mutate-file.sh` detected the
under-selection and reran with `--mutate-all` (8/8 killed). `topic-discovery-page.js`
was unchanged by this task.

### DRY (`dry4javascript`)

Scoped to the changed production file and tests: **no duplicate candidates**.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`specs/new-topic.feature`: differential selection ran **38 mutations**
(2 scenarios / 3 mutations skipped as already fully killed), **14 killed / 24
survived / 0 errors**. All survivors are intrinsic equivalents:

- **Room mutations killed** (m3, m6, m9, m12, m15, m18) and the new internal-space
  and case name mutations killed (m20, m21) — confirming the normalized room is
  asserted exactly.
- **`count` mutations killed** (m29, m32, m35, m38) and the byte-count message
  mutations killed (m30, m36).
- Surviving `name`/`message` case flips and self-consistent message/error edits
  are re-mutated next run by design; the committed manifest keeps the two
  fully-killed scenarios.

### CRAP / cyclomatic complexity (`crap4javascript`)

`new-topic-page.js`: **100% coverage on every function, max CC 2, max CRAP 2.0**
(`normalizeRoom` CC 1), exit 0 (threshold 8.0).

### Canonical suite (`verify.sh client`, at `ce6bf63961`)

| Command | Result |
|---------|--------|
| unit | 773 pass / 0 fail |
| property | 215 pass / 0 fail |
| acceptance | all 48 suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/new-topic-normalize-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `new-topic-normalize`, commit `ce6bf63961`.
