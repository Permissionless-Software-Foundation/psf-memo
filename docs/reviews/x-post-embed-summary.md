# x-post-embed — Architect Review

Task: `x-post-embed`
Component: `psf-memo-client`
Base: `581a0ae` (fix-aps-worktree-path record); inbound refactorer commit `9bb063445d`

## What was reviewed

Inbound refactorer batch (priority 10, one item), merged onto
`swarmforge-architect` as `5d6e417` (clean merge). The linear chain reviewed:

- **`3e22149`** — specifier: *Spec X post embed*. Adds
  `psf-memo-client/specs/x-post-embed.feature` (5 scenarios: status-link embed,
  surrounding text, non-status stays a link, no status link, profile page) and
  the backlog entry.
- **`dd59954`** — coder: *Embed X status links in post text*. Adds the pure
  `src/services/x-embed.js` parser (`extractXStatusId`, `X_EMBED_BASE_URL`),
  renders the self-contained X tweet frame in the shared `PostContent`
  component, adds the CSS, the acceptance step handlers, and unit tests.
- **`9bb0634`** — refactorer: *Refactor X post embed: extract render nodes, add
  parser properties*. Extracts `youtubeEmbedNode`, `xEmbedNode`, and `linkNode`
  from `PostContent` (PostContent CRAP 7.0 -> 5.0) and adds property tests for
  the parser and the embed rendering.

**Architect review commit: `3d38f144bc`** — the repaired `mutate4javascript`
manifests on `x-embed.js` and `post-content.js`, the soft Gherkin
acceptance-mutation manifest on `x-post-embed.feature`, and DRY extractions in
the property tests. The verification record and this summary are committed on
top, so `git diff 3d38f144bc HEAD` touches only `docs/`. The record's `git_sha`
is `3d38f144bc`, the commit that contains the verified source state.

## Architectural findings and fixes applied

The refactorer's structure is sound and required no further boundary change.

1. **UI/Core separation.** `src/services/x-embed.js` is a pure leaf: URL
   parsing only, no React, DOM, network, or wallet. `PostContent` is the React
   UI that imports pure services; the acceptance runtime renders it under Node
   without a browser. Every core decision (host/protocol/status-id recognition)
   is testable directly.
2. **Dependency rule.** `PostContent` depends inward on `x-embed.js`,
   `youtube-embed.js`, and `post-links.js`; the pure services depend on nothing.
   No persistence or framework structure leaks across the boundary.
3. **Information hiding.** The X status URL shape lives only in
   `x-embed.js`; the embed frame URL is one exported constant shared by the
   renderer and the acceptance handler. The render-node extraction keeps each
   `React.createElement` concern in its own function.
4. **Testable boundary.** Mutation coverage is complete for the changed
   production modules (see below). The stale `post-content.js` manifest was
   repaired by the tool to list all five functions.

### Mutation manifests

`post-content.js` shipped with a 2026-09-16 manifest that listed only
`PostImage` and `PostContent`, omitting the three extracted render nodes. The
tool rewrote it during the differential run; the repaired manifest is committed
as tool-written churn.

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`)

- `src/services/x-embed.js`: **3 covered, 3 killed, 0 survived, 0 uncovered**.
- `src/components/post-feed/post-content.js`: **3 covered, 3 killed, 0
  survived, 0 uncovered** (`youtubeEmbedNode`, `xEmbedNode`, `PostContent`).

`acceptance/lib/handlers.js` (546 sites) is acceptance step-handler
infrastructure, not a unit-testable production module; it was not mutated. It
is exercised end-to-end by the 43-suite acceptance phase.

### DRY (`dry4javascript`, scoped to the changed production files and tests)

First scoped run reported 3 duplicate blocks, all task-local property-test
boilerplate: the duplicated numeric-id generator and the two structurally
identical plain-anchor property bodies. The shared `randomNumericId` generator
was moved to `test/property/harness.js` and a `plainAnchorProperty` helper was
extracted. Final scoped run: **No duplicate candidates found.**

### Cyclomatic complexity (`crap4javascript`)

`extractXStatusId` CC 6 (100%, CRAP 6.0), `PostContent` CC 5 (93.3%, CRAP 5.0),
`linkNode`/`parseCandidate` CC 3, `isXHost`/`PostImage` CC 2, `xEmbedNode`/
`youtubeEmbedNode` CC 1. All at or below CRAP 6.0, under the 8.0 threshold.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`x-post-embed.feature`: **33 executed, 26 killed, 7 survived, 0 errors**. All
seven survivors are intrinsic equivalents, not implementation gaps:

- `scenario[0].examples[0].url` username case (`doNatello`): the username is not
  asserted and the `/status/<id>` path is unchanged.
- `scenario[0].examples[3].url` host case (`mobilE.twitter.com`) and
  `scenario[1].examples[2].text` host case (`twitter.cOm`): URL hosts are
  case-insensitive and `isXHost` lowercases before comparing.
- `scenario[0].examples[5].url` scheme case (`httpS://`): the URL parser
  lowercases the scheme.
- `scenario[1].examples[1].text` (`https://` -> `httpsx//`): `parsePostLinks`
  linkifies the bare `x.com/alice/status/<id>` domain, recovering the status
  link. This is the established bare-domain linkifier contract, not the X embed.
- `scenario[3].examples[0].text` (`jusT a normal memo`) and
  `scenario[3].examples[1].text` (`examPle.com`): the case change is applied to
  both the setup text and the `shows the text` assertion, and neither produces
  an embed.

These are specifier-side Gherkin example-quality items (case-insensitive hosts
and self-consistent text values), not implementation gaps. The tool wrote the
feature manifest (only scenario 3, whose mutations were all killed, is recorded
as clean); it is committed as tool-written.

### Suite status

Canonical record against review commit `3d38f144bc`:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/x-post-embed-verification.json --task x-post-embed`
  -> **pass (5/5)**: unit **673 pass / 0 fail**, property **190 pass / 0 fail**,
  acceptance **all 43 suites passed**, lint **ok**, build **ok**.

Property tests were run as their own explicit command by `verify.mjs`, separate
from unit coverage and language mutation.

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `x-post-embed`) with the
  review commit `3d38f144bc` so it can merge `swarmforge-architect` into
  `master`.
- No coder/refactorer handoff: this review is mutation hardening plus local
  test-helper extraction with no follow-up work for those roles.

By architect.
