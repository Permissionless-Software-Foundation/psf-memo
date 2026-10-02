# profile-post-like — Architect Review

Task: `profile-post-like`
Component: `psf-memo-client`
Base: `df9451b` (tiktok-embed backlog record); inbound refactorer commit `62a43177f1`

## What was reviewed

Inbound refactorer batch (priority 10, one item), merged onto
`swarmforge-architect` by fast-forward to `62a4317`. The linear chain reviewed:

- **`671f2a6`** — specifier: *Specify interactive like/tip behavior on profile
  post cards*. Adds `psf-memo-client/specs/profile-post-like.feature`: five
  scenarios (interactive button, modal opens, like broadcasts `0x6d04`, like
  with tip pays the author, broadcast result modal stays open then dismisses).
- **`2fea781`** — coder: *Add interactive like/tip control to profile post
  cards*. Wires the profile page to `LikeTipModal`, adds the presentational
  `src/components/app-body/profile/profile-post-like.js` wrapper, converts the
  shared `LikeButton` to plain CommonJS `React.createElement` so the acceptance
  adapter can render it, adds the `render-profile-post-like.js` adapter and the
  profile acceptance handlers, and adds unit tests.
- **`62a4317`** — refactorer: *Refactor profile post like: move likes-map state
  into service*. Moves the per-post likes map and transitions into the pure
  `src/services/profile-post-like.js` (`initialLikeState`, `reflectLike`,
  `selectLikeState`, `applyLike`), leaving the JSX page to wire React state and
  the modal; removes the now-unused `LikeButton` `readOnly` span branch; adds
  unit and seeded property tests.

**Architect review commit: `20bd05f42c`** — the repaired/added
`mutate4javascript` manifests for the new like service and component and for
`LikeButton`, the soft Gherkin acceptance-mutation manifest on
`profile-post-like.feature`, and the explicit `post-feed.css` import on the
profile page. The verification record and this summary are committed on top, so
`git diff 20bd05f42c HEAD` touches only `docs/`. The record's `git_sha` is
`20bd05f42c`, the commit that contains the verified source state.

## Architectural findings and fixes applied

1. **UI/Core separation (good).** The like state is now a pure service
   (`src/services/profile-post-like.js`) with no React, DOM, wallet, or network
   dependency. `Profile` owns only React state (`likes`, `likeTarget`) and
   delegates the transition to `applyLike`/`selectLikeState`. The broadcast and
   tip I/O stay in `MemoLike`/`LikeTipModal`.
2. **Dependency rule (good).** The page (near UI) depends inward on the pure
   service and on presentational components; the service depends on nothing.
   The presentational wrapper `profile-post-like.js` depends only on the shared
   `LikeButton`.
3. **Testable boundary (good).** `LikeButton` was converted by the coder to
   CommonJS `React.createElement` so the acceptance adapter can render it under
   Node — the same convention already used by `post-content.js`,
   `like-result.js`, `post-options-menu.js`, and `profile-post-content.js`. The
   refactorer removed the `readOnly` branch after confirming no caller passes
   it (grep shows no remaining `readOnly` usage), which also made the component
   fully covered.
4. **Information hiding (fix applied).** A CommonJS component cannot
   `require` CSS under Node, so `LikeButton` no longer imports
   `post-feed.css`. The feed page still gets it through `post-feed-item.js`, but
   the profile page was only receiving it transitively through `LikeTipModal`.
   Added `import '../../post-feed/post-feed.css'` to
   `src/components/app-body/profile/index.js`, matching `posts/index.js`, so the
   profile page explicitly owns the styles for the controls it renders.
5. **Acceptance helper (reviewed).** `createWorld`'s `memoLike` now reflects a
   like into `feed.posts.concat(memoDb.posts)`, and `findDisplayedPost` also
   searches the local feed, so a like from a profile post updates the post the
   profile page served. This is acceptance-only infrastructure and does not
   change production behavior.
6. **Noted, not changed.** `LikeButton` still lives under `post-feed/` but is
   now shared by the feed and profile features. The `ProfilePostLike` wrapper
   already gives the profile feature a stable presentational boundary; moving
   the shared button to a neutral location would be a broad cross-module change
   beyond this handoff.

## Verification results

### Language mutation (`mutate4javascript`, `--max-workers 8`)

- `src/services/profile-post-like.js`: **7 killed, 0 survived, 0 uncovered**
  (first run, all sites selected).
- `src/components/app-body/profile/profile-post-like.js`: **2 killed, 0
  survived, 0 uncovered**.
- `src/components/post-feed/like-button.js`: **3 killed, 0 survived, 0
  uncovered**.

All three manifests were written by the tool and committed. `profile/index.js`
is a JSX page and, like the other `app-body/*/index.js` pages, does not
participate in language mutation; its behavior is exercised through the
acceptance suite.

### DRY (`dry4javascript`, scoped to the changed production files, tests, and new adapter)

Run over `src/services/profile-post-like.js`,
`src/components/app-body/profile/profile-post-like.js`,
`src/components/post-feed/like-button.js`,
`test/unit/profile-post-like.test.js`,
`test/property/profile-post-like.property.test.js`, and
`acceptance/lib/render-profile-post-like.js`: **No duplicate candidates
found.**

### Cyclomatic complexity (`crap4javascript`, changed non-JSX files)

- `LikeButton` — CC 4, 100% cov, **CRAP 4.0**.
- `initialLikeState` / `selectLikeState` / `ProfilePostLike` — CC 2, 100%,
  CRAP 2.0.
- `applyLike` / `reflectLike` — CC 1, 100%, CRAP 1.0.

All well under the 8.0 threshold. `profile/index.js` is JSX and not analyzable
by the tool (same as prior client page reviews).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`profile-post-like.feature`: **12 executed, 5 killed, 7 survived, 0 errors**.
Every survivor is an intrinsic equivalent, not an implementation gap:

- `m1`–`m4` (`scenarios[0]`/`scenarios[1]` txid examples): the value is
  seeded by the setup step and looked up by the same value, so the exact txid is
  self-consistent and never independently asserted in scenarios 1 and 2.
- `m7`/`m9` (`scenarios[3]` tips `600 -> 609`, `25000 -> 25005`): the tip is
  entered and asserted with the same value, so it is self-consistent.
- `m12` (`scenarios[4].examples[1]` txid `a… -> A…`): an uppercase hex digit is
  still valid and self-consistent, so nothing fails.

The corresponding `x` substitutions in the broadcast scenarios were **killed**
(invalid hex fails the like txid validation), confirming the like action does
validate the post txid. The tool recorded only `scenarios[2]` (the broadcast
scenario) in its manifest; the other scenarios are intentionally re-mutated
next run. This matches the established intrinsic-survivor pattern for
self-consistent Gherkin example values.

### Suite status

Canonical record against review commit `20bd05f42c`:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/profile-post-like-verification.json --task profile-post-like`
  -> **pass (5/5)**: unit **718 pass / 0 fail**, property **207 pass / 0 fail**,
  acceptance **all 45 suites passed**, lint **ok**, build **ok**.

Property tests run as their own explicit command by `verify.mjs`, separate from
unit coverage and language mutation.

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `profile-post-like`) with
  the review commit `20bd05f42c` so it can merge `swarmforge-architect` into
  `master`.
- No coder/refactorer handoff: this review adds tool-written manifests, an
  explicit page CSS import, and verification artifacts, with no follow-up work
  for those roles.

By architect.
