# Architect review — `account-post-metadata`

**Role**: architect
**Task**: `account-post-metadata` (client-only, `psf-memo-client`)
**Reviewed commits**: `2a3d524` (specifier, spec) → `bd783e8` (coder) → `35619944ea`
(refactorer)
**Merge**: `cadea8ab2b` (refactorer `swarmforge-refactorer` → `swarmforge-architect`)
**Review commit**: `9c46b25706` (tool-written mutation manifests)
**Verification record**: `docs/reviews/account-post-metadata-verification.json`
(`git_sha` `9c46b25706107cc5145c37f52714d680f34448d4`)

## Scope

Show each account post's timestamp and block number at the top of its card,
matching the profile feed. The task adds a shared `post-timestamp.js` service,
uses it in the account feed, replaces the two duplicated `formatSeen` copies in
the profile and recent-profiles pages with it, extends the account feed spec with
scenario 6, and adds unit/property/acceptance coverage. Client-only read feature;
no Memo action is broadcast.

## Architectural findings

- **The shared formatter is the right extraction.** `formatSeen` was duplicated
  verbatim in `components/app-body/profile/index.js` and
  `components/app-body/recent-profiles/index.js`. The task moved the single
  implementation into the pure `services/post-timestamp.js` and removed both
  copies, so the JSX pages, the account feed component, and the Node acceptance
  handler all share one behavior. This is a genuine cohesion/DRY improvement,
  not just local cleanup.
- **Dependency direction holds.** `post-timestamp.js` is pure (no IO, no
  imports). It is imported by high-level presentational/page modules and by the
  acceptance adapter — all dependencies point at the service, never outward.
- **The two feeds now agree on metadata.** The account card's meta row mirrors
  the profile card's: a muted `seen` span, `Block <height>`, and the options
  menu. This closes the layout divergence flagged in the prior
  `account-posts-feed` review; the card contents and metadata are now the same
  shared pieces, and only the wrapper (`Card` vs `div.card`) differs.
- **Behavior preserved.** The `seen > 1e12` epoch-seconds/milliseconds
  threshold is unchanged from the two originals, and falsy values still format
  to an empty string.
- **Accepted, not changed.** `dry4javascript`'s only non-`handlers.js` duplicate
  is the `getPostsByAddr` fake shared between `acceptance/lib/handlers.js` and
  `test/property/account-posts-feed.property.test.js`. It predates this task
  (introduced with the prior feed feature) and spans two separate test harnesses;
  consolidating it would couple the acceptance world to a property-test fake,
  so it is left as-is. The 111 `handlers.js` blocks are the documented
  step-handler boilerplate noise floor.

## Fixes applied

None were required: every language mutation site was already killed by the
delivered tests. The only committed review changes are the tool-written
`mutate4javascript` manifests for `post-timestamp.js` and `account-posts-feed.js`
and the refreshed `gherkin-mutator` manifest for
`specs/account-posts-feed.feature` (empty scenarios by design, as every scenario
retains an intrinsic survivor).

## Verification

### Language mutation (`mutate4javascript`, one file at a time, `--mutate-all --max-workers 8`)

| File | Covered | Killed | Survived | Uncovered |
|------|---------|--------|----------|-----------|
| `src/services/post-timestamp.js` | 2 | 2 | 0 | 0 |
| `src/components/app-body/account/account-posts-feed.js` | 2 | 2 | 0 | 0 |

Total **4 killed, 0 survived, 0 uncovered**. The JSX pages
(`profile/index.js`, `recent-profiles/index.js`) are not mutation-testable and
are covered by the acceptance suite, consistent with the established boundary.

### DRY (`dry4javascript`, scoped to changed modules, tests, and acceptance)

The task removed the two duplicated `formatSeen` definitions. The remaining
candidates are pre-existing `handlers.js` step-handler boilerplate and the
cross-harness `getPostsByAddr` test fake noted above — no task-local duplication.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`specs/account-posts-feed.feature`: **18 mutations, 4 killed / 14 survived / 0
errors**. Survivors are intrinsic equivalents:

| IDs | Reason |
|-----|--------|
| m2, m6, m9–m12 | single-char `txid` substitution used self-consistently on the serve and assert sides |
| m3, m7 | case flip of the `url` value in a negative "does not show the raw URL" assertion |
| m13, m16 | `height` substitution carried through both the serve step and the block-number assertion |
| m14, m17 | `seen` substitution carried through both the serve step and the formatted-timestamp assertion |
| m15, m18 | single-char `txid` substitution, self-consistent across serve/assert |

The core embed-rendering mutations remain killed (m1, m4, m5, m8). Scenario 6's
new metadata behavior is covered by the language mutation of `post-timestamp.js`
and `account-posts-feed.js` (all killed) and by the new unit/property tests; the
Gherkin survivors are intrinsic to parameterized self-consistency.

### CRAP / cyclomatic complexity (`crap4javascript`)

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `formatSeen` | 3 | 100% | 3.0 |
| `AccountPostCard` | 2 | 100% | 2.0 |
| `AccountPostsFeed` | 2 | 100% | 2.0 |

Exit 0 (threshold 8.0).

### Canonical suite (`verify.sh client`, at `9c46b25706`)

| Command | Result |
|---------|--------|
| unit | 811 pass / 0 fail |
| property | 223 pass / 0 fail |
| acceptance | all 49 acceptance suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/account-post-metadata-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `account-post-metadata`, commit `9c46b25706`.
