# tiktok-embed — Architect Review

Task: `tiktok-embed`
Component: `psf-memo-client`
Base: `9da218b` (x-post-embed record); inbound refactorer commit `a3baf2e770`

## What was reviewed

Inbound refactorer batch (priority 10, one item), merged onto
`swarmforge-architect` by fast-forward to `a3baf2e` (the refactorer branch
already contained the specifier's merge of the x-post-embed review). The linear
chain reviewed:

- **`30a5794`** — specifier: *Add TikTok Embed Gherkin specification*. Adds
  `psf-memo-client/specs/tiktok-embed.feature` (6 scenarios: canonical video
  links, short-link resolution, unresolvable short link, surrounding text,
  non-video links, profile page) and the backlog entry.
- **`ac85cae`** — coder: *Embed TikTok video links in post text*. Adds the pure
  `src/services/tiktok-embed.js` parser and the injectable-fetch
  `src/services/tiktok-oembed.js` resolver, renders the player in the shared
  `PostContent` component, adds the CSS, the acceptance step handlers, refines
  the "does not show the raw URL" assertion to ignore frame `src`, and adds unit
  tests.
- **`a3baf2e`** — refactorer: *Refactor TikTok embed: lower oEmbed CRAP, add
  property tests*. Splits the CRAP-9.0 `resolveTikTokVideoId` into `pickFetch`,
  `isOkResponse`, and `videoIdFromMetadata`, and adds property tests for the
  parser, the resolver, and TikTok rendering.

**Architect review commit: `98aff8d25b`** — the repaired `mutate4javascript`
manifests on the two TikTok services and `post-content.js`, the soft Gherkin
acceptance-mutation manifest on `tiktok-embed.feature`, the extracted
`resolveShortLinks` orchestration with its unit tests, and the shared property
helpers. The verification record and this summary are committed on top, so
`git diff 98aff8d25b HEAD` touches only `docs/`. The record's `git_sha` is
`98aff8d25b`, the commit that contains the verified source state.

## Architectural findings and fixes applied

1. **UI/Core separation.** `src/services/tiktok-embed.js` is a pure leaf (URL
   parsing only). `src/services/tiktok-oembed.js` is the only network-touching
   module and takes an injected `fetchImpl`, so the browser and acceptance paths
   can supply their own. `PostContent` stays the React UI. Only the pure and
   injectable modules participate in language mutation.
2. **Dependency rule.** The component depends inward on the pure parser and the
   injected-fetch resolver; neither service knows about React, the DOM, or the
   wallet.
3. **Testable boundary (fix applied).** The browser-only short-link resolution
   effect, `useResolvedTikTokIds`, had three mutation sites that React server
   rendering never executes (the effect body and its cancel cleanup), so they
   were uncovered. The orchestration was extracted into a plain
   `resolveShortLinks(shortLinks, attempted, resolveTikTok, onResolved)`
   function; the hook is now thin `useState`/`useRef`/`useEffect` glue. New unit
   tests in `test/unit/tiktok-resolution.test.js` pin: one request per
   unattempted link, already-attempted links skipped, falsy ids ignored, cancel
   suppresses later callbacks, no resolver is a no-op, and rejections are
   swallowed. `post-content.js` is now 11/11 mutation-clean.
4. **Information hiding.** The player frame URL is one exported constant shared
   by the renderer and the acceptance handler. The short-link vs canonical
   distinction lives only in `tiktok-embed.js`.
5. **Acceptance assertion refinement reviewed.** The coder changed
   `assertRenderedHidesRawUrl` from "the URL appears anywhere in the HTML" to
   "the URL appears as visible text or an anchor href". This is correct: a frame
   `src` is markup the reader cannot see, and the canonical TikTok example
   `.../player/v1/<id>` is also the player's own `src`, so the old check
   collided with the intended embed. The refined check still catches raw
   displayed/linked URLs.

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`)

- `src/services/tiktok-embed.js`: **8 covered, 8 killed, 0 survived, 0
  uncovered**.
- `src/services/tiktok-oembed.js`: **3 covered, 3 killed, 0 survived, 0
  uncovered**.
- `src/components/post-feed/post-content.js`: **11 covered, 11 killed, 0
  survived, 0 uncovered** (after the `resolveShortLinks` extraction).
- `src/components/app-body/profile/profile-post-content.js`: 0 mutation sites
  (thin prop pass-through).

`acceptance/lib/handlers.js` is acceptance step-handler infrastructure and was
not mutated; it is exercised end-to-end by the 44-suite acceptance phase.

### DRY (`dry4javascript`, scoped to the changed production files and tests)

The first scoped run reported five property-test duplicates: the `randomFrom`
generator in three files, two structurally identical round-trip tests, and the
two structurally identical embed-rendering tests. `randomFrom` moved to
`test/property/harness.js`, the round-trips and embed tests became table-driven
loops, and a `frameEmbedProperty` helper was extracted. Final scoped run: **No
duplicate candidates found.**

### Cyclomatic complexity (`crap4javascript`)

Highest CRAP is 6.0: `collectTikTokShortLinks`, `extractTikTokShortCode`, and
`linkNode` at CC 6 / 100% coverage; `PostContent` CC 5; `extractTikTokVideoId`
and `parseCandidate` CC 5; `resolveShortLinks` and `resolveTikTokVideoId` CC 4
(the latter down from CRAP 9.0 before the refactor); the rest CC <= 3. All under
the 8.0 threshold.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`tiktok-embed.feature`: **38 executed, 26 killed, 12 survived, 0 errors**. All
twelve survivors are intrinsic equivalents, not implementation gaps:

- Case-only mutations of URL parts that parsing normalizes or that are not
  asserted: scheme case (`httPs://`, `httpS://`), host case (`M.tiktok.com`,
  `vt.tikTok.com`), the `is_from_webapP` query value, and the `@scout2x15`
  username (`scenario[0]` examples 0/2/5, `scenario[1]` examples 0/1,
  `scenario[3]` example 0).
- The three `video_id` mutations (`scenario[1]` examples 0/1/2): scenario 2
  seeds the resolution map and asserts the player with the same mutated id, so
  the value is self-consistent on both sides.
- `scenario[2]` example 1: the mutated short URL is used in both the setup text
  and the "shows a link to" assertion, so it is self-consistent.
- `scenario[3]` example 1 (`https:x/www.tiktok.com/...`): `parsePostLinks`
  linkifies the bare `www.tiktok.com/@alice/video/<id>` domain, recovering the
  canonical embed; the established bare-domain linkifier contract, not the
  TikTok embed.
- `scenario[4]` example 1 (`brOwse`): the surrounding word is not asserted by
  the link/href steps.

These are specifier-side Gherkin example-quality items (case-insensitive URL
parts, self-consistent values, unasserted surrounding text), not implementation
gaps. Every scenario had at least one intrinsic survivor, so the tool wrote an
empty `scenarios` manifest; it is committed as tool-written.

### Suite status

Canonical record against review commit `98aff8d25b`:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/tiktok-embed-verification.json --task tiktok-embed`
  -> **pass (5/5)**: unit **705 pass / 0 fail**, property **200 pass / 0 fail**,
  acceptance **all 44 suites passed**, lint **ok**, build **ok**.

Property tests were run as their own explicit command by `verify.mjs`, separate
from unit coverage and language mutation.

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `tiktok-embed`) with the
  review commit `98aff8d25b` so it can merge `swarmforge-architect` into
  `master`.
- No coder/refactorer handoff: this review is mutation hardening, a targeted
  testability extraction, and local test-helper extraction with no follow-up
  work for those roles.

By architect.
