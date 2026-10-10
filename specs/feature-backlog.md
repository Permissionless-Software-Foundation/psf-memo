# psf-memo — Feature Backlog

**Status**: DRAFT — refreshed 2026-09-03.
**Owner**: specifier.
**Last updated**: 2026-10-08

---

## Goal

Make `psf-memo` feature-equivalent to [memo.cash](https://memo.cash), a Bitcoin
Cash (BCH) social network built on `OP_RETURN` transactions. Every social action
is a BCH transaction carrying a Memo protocol payload (`0x6d` + action byte)
that is broadcast from the client to the chain and later indexed by
`psf-memo-indexer` into `psf-memo-db`.

---

## Current direction

Core functionality is implemented and shipped. For the foreseeable future the
focus is **front-end improvements** to `psf-memo-client` (the React SPA).

- All previously listed roadmap features (P0–P6) have been removed from this
  backlog.
- New work should target the client: UI/UX polish, accessibility, performance,
  responsiveness, state handling, error surfacing, and any other front-end
  improvements.
- A single user-facing feature may still touch more than one component; call
  out all affected components in the task description and in the handoff.

## In progress

- None.

## Recently completed

- **Image format query detection (`image-format-detection`, 2026-10-08):**
  Client-only rendering feature. A post URL now renders as an inline image
  when its path ends in a known image extension **or** its query string
  carries an image format hint (`?format=jpg|jpeg|png|gif|webp|bmp`,
  case-insensitive), so X/Twitter-style URLs such as
  `https://pbs.twimg.com/media/HUDsd-2XAAA6KW7?format=jpg&name=small` render
  inline instead of as a plain link. `src/services/post-links.js` `isImageUrl`
  now derives both detection forms from one module-private `IMAGE_FORMATS`
  list; `img src` stays the full original URL and `imageAltText` falls back to
  the path segment. New scenarios `Post Image Rendering - 4` and
  `Profile Post Rendering - 6` (16/16 killed each); the old `?format=jpg`
  "not an image" examples moved to `?format=json`. Merged to `master` at
  `87f0d3a` (fast-forward; architect code-review commit `ea720e9`; the later
  `87f0d3a` adds only the record and summary, so
  `docs/reviews/image-format-detection-verification.json` is valid for the
  merged tree). Recorded `verify.sh client` pass 5/5 at `ea720e9` (unit 825/0,
  property 226/0, acceptance all 49 suites, lint ok, build ok); soft Gherkin
  mutation post-image-rendering 42/41 and profile-post-rendering 51/49 (3
  intrinsic case-flip survivors). Independent acceptance check after merge:
  post-image-rendering 13/13 and profile-post-rendering 18/18. Architect
  summary: `docs/reviews/image-format-detection-summary.md`.

- **Account sidebar profile link (`account-profile-link`, 2026-10-08):**
  Client-only. The `/account` left sidebar now shows a `Profile` link between
  the bio and the BCH address, linking to the account's own `/profile/:addr`
  page (`/profile/<encodeURIComponent(addr)>`) and navigating via the client
  router. `AccountPage.SIDEBAR_SECTIONS` becomes `avatar, bio, profile,
  address, tokens`; the refactorer extracted the shared pure
  `src/services/profile-path.js` (`profilePath`) and pointed
  `notification-entry.js` and `recent-profiles-table.js` at it, replacing the
  duplicated profile-path builders (gotcha #43). New/updated scenarios
  `Account Page Layout - 15` (order) and `- 16` (link target + navigation).
  Merged to `master` at `81c47cb` (fast-forward; architect code-review commit
  `6b910ae`; the later `81c47cb` adds only the record and summary, so
  `docs/reviews/account-profile-link-verification.json` is valid for the merged
  tree). Recorded `verify.sh client` pass 5/5 at `6b910ae` (unit 819/0, property
  224/0, acceptance all 49 suites, lint ok, build ok). Independent acceptance
  check after merge: account-page-layout 21/21. Architect summary:
  `docs/reviews/account-profile-link-summary.md`.

- **Account post metadata (`account-post-metadata`, 2026-10-08):** Client-only
  fix for the account posts feed. Each `/account` post card now shows the
  post's timestamp and `Block <height>` at the top, matching the
  `/profile/:addr` card's meta row. The refactorer extracted the duplicated
  `formatSeen` into the shared pure `src/services/post-timestamp.js` and
  pointed the account feed, profile page, and recent profiles page at it. New
  `Account Posts Feed - 6` scenario exercises both epoch-seconds and
  milliseconds `seen` inputs. Merged to `master` at `a70f36c` (fast-forward;
  architect code-review commit `9c46b25`; the later `a70f36c` adds only the
  record and summary, so
  `docs/reviews/account-post-metadata-verification.json` is valid for the merged
  tree). Recorded `verify.sh client` pass 5/5 at `9c46b25` (unit 811/0,
  property 223/0, acceptance all 49 suites, lint ok, build ok). Independent
  acceptance check after merge: account-posts-feed 10/10. Architect summary:
  `docs/reviews/account-post-metadata-summary.md`.

- **Account posts feed (`account-posts-feed`, 2026-10-08):** Client-only
  front-end feature. `/account` now loads the authenticated address's top-level
  Memo posts (`MemoDb.getPostsByAddr`, `PAGE_SIZE = 50`) and shows them in the
  right column below the Set Name / Set Bio / Set Avatar URL controls, rendered
  with the same building blocks as the `/profile/:addr` feed
  (`ProfilePostContent`, `ProfilePostLike`, `PostOptionsMenu`, and a new pure
  `ReplyCountView`): link/image/YouTube rendering, options menu, interactive
  like/tip, reply count → thread, the `Posts` range header, Previous/Next
  pagination, and an account-specific `You have no posts yet.` empty state. New
  spec `psf-memo-client/specs/account-posts-feed.feature` (5 scenarios) and
  `Page Size - 8` in `page-size.feature`. Merged to `master` at `2470bc8`
  (fast-forward; architect code-review commit `af512e5`; the later `2470bc8`
  adds only the record and summary, so
  `docs/reviews/account-posts-feed-verification.json` is valid for the merged
  tree). Recorded `verify.sh client` pass 5/5 at `af512e5` (unit 806/0,
  property 219/0, acceptance all 49 suites, lint ok, build ok). Independent
  acceptance checks after merge: account-posts-feed 8/8 and page-size 16/16.
  Architect summary: `docs/reviews/account-posts-feed-summary.md`.

- **Set Bio existing bio and cancel (`set-bio-existing-and-cancel`, 2026-10-08):**
  Client-only front-end feature, the first of the new client direction. The
  `/memo/set-bio` page now shows the account's existing bio above the input and
  has a Cancel button that returns to `/account` without broadcasting. The read
  goes through the injected session profile store
  (`SetBioPage.getExistingBio()`), and `cancel()` lives on the shared
  `ProfileTextPage` base. Three new scenarios in
  `psf-memo-client/specs/set-bio.feature` (6–8; scenario 6 uses separate
  `stored_bio`/`shown_bio` example columns so a soft mutation of either side
  fails instead of surviving tautologically). Merged to `master` at `4467e6e`
  (merge commit; architect code-review commit `9cd5166`; the later `2357e0c`
  adds only the review record and summary, and master's `21040ad` is an
  unrelated `.env.development` commit, so
  `docs/reviews/set-bio-existing-and-cancel-verification.json` is valid for the
  merged tree). Recorded `verify.sh client` pass 5/5 at `9cd5166` (unit 778/0,
  property 217/0, acceptance all 48 suites, lint ok, build ok); soft Gherkin
  mutation 4/4 killed on scenario 6. Independent acceptance check after merge:
  set-bio 14/14. Follow-up candidate: the page reads only the in-session profile
  store, so a bio persisted from a previous session is not shown on a fresh load
  unless the store is hydrated (the `/account` page also falls back to
  `memo-db`). Architect summary:
  `docs/reviews/set-bio-existing-and-cancel-summary.md`.

- **CLI async visibility (`cli-async-visibility`, 2026-10-08):** X7, the final
  item of the `psf-memo-cli` cross-cutting series. `README.md` gained an "Async
  visibility" section documenting that a write returns
  `{ message, txid, explorerUrl }` immediately while reads see only indexed
  state, that block confirmation + indexing is required, that `memo-status`
  reports the sync heights, and that `memo-wait` is the post-store
  write→index→read bridge (with a scriptable example). Documentation-only; the
  behavior is pinned by `memo-wait` and `memo-status`. Merged to `master` at
  `7fc7cd0` (fast-forward; verification record
  `docs/reviews/cli-async-visibility-verification.json` names the verified tree
  `b5663c7fd3`, and the later `7fc7cd0` adds only the record and summary, so it
  is valid for the merged tree). `verify.sh cli` pass 4/4 at `b5663c7fd3` (unit
  580/0, property 110/0, acceptance all 38 suites, lint ok). Independent
  `verify.sh cli` after merge: pass 4/4. Architect summary:
  `docs/reviews/cli-async-visibility-summary.md`. With X7, the `psf-memo-cli`
  X-series (X1–X7) is complete.

- **CLI pagination fidelity (`cli-pagination-fidelity`, 2026-10-08):** X6 of the
  `psf-memo-cli` cross-cutting series. Every paginated read command exposes
  `--limit`/`--offset` and echoes the service pagination unchanged. The new
  `pagination-fidelity` feature pins the recent-feed total cap (500; gotcha #21)
  passthrough, page-count/total independence, and `hasMore` echo (not
  recompute) — properties the small per-command fixtures cannot exercise. No
  production change (characterization lock). Merged to `master` at `e7b59eb`
  (fast-forward; verification record
  `docs/reviews/cli-pagination-fidelity-verification.json` names the verified
  tree `ab4871be07`, and the later `e7b59eb` adds only the record and summary,
  so it is valid for the merged tree). `verify.sh cli` pass 4/4 at `ab4871be07`
  (unit 580/0, property 110/0, acceptance all 38 suites, lint ok); DRY clean;
  soft Gherkin mutation 22/8 with 14 intrinsic survivors. Independent
  acceptance check after merge: pagination-fidelity 6/6. Architect summary:
  `docs/reviews/cli-pagination-fidelity-summary.md`.

- **CLI quality audit (`cli-quality-audit`, 2026-10-08):** X5 of the
  `psf-memo-cli` cross-cutting series. Re-established the
  `cli-quality-hardening` baseline over the complete command set: 100%
  statements/branches/functions/lines (579 unit tests), CRAP exit 0 / max 6.0,
  DRY clean, language mutation 180 killed / 3 intrinsic survivors / 0 uncovered
  across all `src/`, property 110/0, all 37 acceptance suites, lint clean.
  Closed the two previously uncovered branches (`memo-profiles` `(unset)`
  avatar/bio and the `wallet-list-command` missing-list-field fallback), and the
  refactorer's `defineListReadCommand` removed the last DRY pair. No Gherkin
  feature (quality deliverable; soft Gherkin mutation not applicable). Merged
  to `master` at `cb02cc9` (fast-forward; verification record
  `docs/reviews/cli-quality-audit-verification.json` names the verified tree
  `4688e628e1`, and the later commits add only records/process notes, so it is
  valid for the merged tree). Independent acceptance check after merge:
  memo-profiles 12/12 and memo-topics 10/10. Architect summary:
  `docs/reviews/cli-quality-audit-summary.md`.

- **CLI read-only safety (`cli-read-only-safety`, 2026-10-08):** X4 of the
  `psf-memo-cli` cross-cutting series. Wallet-independent reads (`memo-feed`,
  `memo-status`, `memo-profile`, and a `--viewer` supplied as an address) never
  resolve a wallet; only wallet-relative reads do, and a missing wallet for
  such a read is a runtime error. X4 was already satisfied by the module
  layout, so the task is a characterization lock: new unit tests and
  recording-resolver acceptance steps, plus an address-path encoding fix in the
  shared acceptance assertion. Merged to `master` at `3d97d79` (fast-forward;
  verification record `docs/reviews/cli-read-only-safety-verification.json`
  names the verified tree `5b54942f3b`, and the later `3d97d79` adds only the
  record and summary, so it is valid for the merged tree). `verify.sh cli` pass
  4/4 at `5b54942f3b` (unit 577/0, property 110/0, acceptance all 37 suites,
  lint ok); language mutation 7 killed / 0 survived / 0 uncovered; DRY clean;
  soft Gherkin mutation 8 intrinsic survivors (self-consistent example values).
  Independent acceptance check after merge: read-only-safety 9/9. Architect
  summary: `docs/reviews/cli-read-only-safety-summary.md`.

- **CLI secret hygiene (`cli-secret-hygiene`, 2026-10-08):** X3 of the
  `psf-memo-cli` cross-cutting series. `wallet-sweep` no longer echoes the swept
  WIF; a wallet-relative `--json` result carries no key material and
  `wallet-list` reports only public metadata. The negative Gherkin assertions
  are value-independent (soft-mutation intrinsic survivors). Merged to `master`
  at `ed6d3c5` (fast-forward; verification record
  `docs/reviews/cli-secret-hygiene-verification.json` names the verified tree
  `08c6178137`, and the later `ed6d3c5` adds only records, so it is valid for
  the merged tree). `verify.sh cli` pass 4/4 at `08c6178137` (unit 572/0,
  property 110/0, acceptance all 36 suites, lint ok); language mutation 2/2 on
  `wallet-sweep.js`; DRY clean; soft Gherkin mutation 10 survivors intrinsic
  (negative assertions). Independent acceptance check after merge:
  secret-hygiene 6/6, all 36 suites. Architect summary:
  `docs/reviews/cli-secret-hygiene-summary.md`.

- **CLI error surfacing (`cli-error-surfacing`, 2026-10-08):** X2 of the
  `psf-memo-cli` cross-cutting series. A wallet/node rejection during a Memo
  broadcast is reported as `Failed to broadcast: <wallet error>` (exit 1),
  preserving the real message; errors detected before the broadcast keep their
  own specific messages. The prefix lives once in
  `psf-memo-cli/src/lib/memo-broadcast.js`; the shared `memo-broadcast` feature
  and all 13 write-command features assert the prefixed message. Merged to
  `master` at `5be373d` (fast-forward; verification record
  `docs/reviews/cli-error-surfacing-verification.json` names the verified tree
  `dc5a389c57`, and the later `5be373d` adds only records, so it is valid for
  the merged tree). `verify.sh cli` pass 4/4 at `dc5a389c57` (unit 570/0,
  property 110/0, acceptance all 35 suites, lint ok); language mutation 6/6 on
  `memo-broadcast.js`; DRY clean. Independent acceptance check after merge: all
  35 suites. Architect summary:
  `docs/reviews/cli-error-surfacing-summary.md`.

- **CLI command reference (`cli-command-reference`, 2026-10-08):** X1 of the
  `psf-memo-cli` cross-cutting series — documentation only. `README.md` and
  `src/commands/README.md` now document all 30 `memo-*` commands (17 reads, 13
  writes) with flags/defaults, the `{ message, ...data }` JSON shape, exit codes
  `0/1/2`, the `-n`/`--wif` wallet source, `--db-url`, and the `pagination`
  contract; `.env.example` documents `MEMO_DB_URL`. No Gherkin (docs-only).
  Spec: `psf-memo-cli/dev-docs/command-reference.md`. Merged to `master` at
  `0541746` (fast-forward; architect verification record
  `docs/reviews/cli-command-reference-verification.json` names the verified tree
  `81b160ec42`, and the later `0541746` adds only records, so it is valid for
  the merged tree). `verify.sh cli` pass 4/4 at `81b160ec42` (unit 568/0,
  property 110/0, acceptance all 35 suites, lint ok); language mutation N/A (no
  code change). Independent check after merge: all 30 `memo-*` commands present
  in both docs. Architect summary:
  `docs/reviews/cli-command-reference-summary.md`.

- **CLI topic writes (`cli-topic-writes`, 2026-10-08):** W9/W10 of the
  `psf-memo-cli` Memo-protocol backlog — the topic message and topic follow
  writes. Added `defineFieldsWriteCommand` (`src/lib/write-command.js`, now also
  backing `memo-reply`), `room-flag.js` (shared required `-r` message), and
  `topic-room-write-command.js`, plus `memo-topic-post` (`0x6d0c`,
  `[6d0c, room, message]`, room+message ≤ 214 UTF-8 bytes),
  `memo-topic-follow` (`0x6d0d`, `[6d0d, room]`), and `memo-topic-unfollow`
  (`0x6d0e`, `[6d0e, room]`). Each resolves the signing wallet (`-n`/`--wif`),
  requires the room (`-r`), and reports the txid + explorer link; missing/empty/
  over-limit flags are usage errors (exit 2) with no broadcast. Specs:
  `psf-memo-cli/specs/memo-topic-post.feature` (8 scenarios),
  `memo-topic-follow.feature` and `memo-topic-unfollow.feature` (4 each); 24
  example executions total. Merged to `master` at `c46a728` (fast-forward;
  architect code-review commit `8bfdfa47ec`; the later `c46a728` adds only the
  record and summary, so `docs/reviews/cli-topic-writes-verification.json` is
  valid for the merged tree). `verify.sh cli` pass 4/4 at `8bfdfa47ec` (unit
  568/0, property 110/0, acceptance all 35 suites, lint ok); language mutation 6
  killed / 0 survived (`write-command.js` 3, `memo-topic-post.js` 3; the command
  modules scan as 0 sites); soft Gherkin mutation topic-post 21/8, follow/
  unfollow 6/0 (intrinsic case equivalents); DRY clean after sharing the
  property random-text generator. Independent acceptance check after merge:
  24/24. Architect summary: `docs/reviews/cli-topic-writes-summary.md`.

- **CLI social-graph writes (`cli-follow-mute`, 2026-10-08):** W7/W8 of the
  `psf-memo-cli` Memo-protocol backlog — four hash160 state writes in one cycle.
  Added `defineAddressWriteCommand` (`src/lib/address-write-command.js`) and
  `addressHash160FlagParser` (`src/lib/address-flag.js`, reusing F4
  `addressToHash160` in display order, never byte-reversed) plus thin
  declarations `memo-follow` (`6d06`), `memo-unfollow` (`6d07`), `memo-mute`
  (`6d16`), and `memo-unmute` (`6d17`). Each resolves the signing wallet
  (`-n`/`--wif`), requires the target cash address (`-a`), broadcasts
  `[prefix, hash160]`, and reports the txid + explorer link; a missing or
  malformed address is a usage error (exit 2) with no broadcast, and a rejected
  broadcast surfaces the wallet's real error (exit 1). The architect table-drove
  the address-command tests. Specs: `psf-memo-cli/specs/memo-follow.feature`,
  `memo-unfollow.feature`, `memo-mute.feature`, `memo-unmute.feature` (5
  scenarios each, 28 example executions total). Merged to `master` at `0e89edc`
  (fast-forward; architect code-review commit `a53d471595`; the later `0e89edc`
  adds only the record and summary, so
  `docs/reviews/cli-follow-mute-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `a53d471595` (unit 530/0, property 105/0,
  acceptance all 32 suites, lint ok); language mutation 0 sites in the changed
  files (logic in the covered wire-encoding/address-flag helpers); soft Gherkin
  mutation 8 total / 4 killed / 4 intrinsic survivors per feature; DRY clean
  after the table-driven consolidation. Independent acceptance check after
  merge: 28/28 (7 per feature). Architect summary:
  `docs/reviews/cli-follow-mute-summary.md`.

- **CLI set-avatar write command (`cli-memo-avatar`, 2026-10-08):** W6 of the
  `psf-memo-cli` Memo-protocol backlog. Added `src/lib/memo-avatar.js` (0x6d0a
  prefix, 217 UTF-8 byte limit, `-u` parsing, summary) and a thin
  `src/commands/memo-avatar.js` over the shared single-field write factory,
  registered as `memo-avatar`. It resolves the signing wallet (`-n`/`--wif`) and
  broadcasts `[6d0a, url]`; a missing/empty/over-217-byte URL is a usage error
  (exit 2) with no broadcast, and a rejected broadcast surfaces the wallet's
  real error (exit 1). The refactorer generalized `memoTextFlagParser` to take a
  `flag` key so it backs both `-m` (post/name/bio) and `-u` (avatar). Spec:
  `psf-memo-cli/specs/memo-avatar.feature` (7 scenarios, 11 example executions).
  Merged to `master` at `b7686b1` (fast-forward; architect code-review commit
  `2771df6039`; the later `b7686b1` adds only the record and summary, so
  `docs/reviews/cli-memo-avatar-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `2771df6039` (unit 493/0, property 103/0,
  acceptance all 28 suites, lint ok); language mutation 2 killed / 0 survived
  (`memo-text-flag.js`; the avatar module scans as 0 sites); soft Gherkin
  mutation 15 total / 5 killed / 10 intrinsic survivors; DRY only the accepted
  per-command wrapper pair. Independent acceptance check after merge: 11/11.
  Architect summary: `docs/reviews/cli-memo-avatar-summary.md`.

- **CLI set-bio write command (`cli-memo-bio`, 2026-10-08):** W5 of the
  `psf-memo-cli` Memo-protocol backlog. Added `src/lib/memo-bio.js` (0x6d05
  prefix, 217 UTF-8 byte limit, flag parsing, summary) and a thin
  `src/commands/memo-bio.js` over the shared single-field write factory,
  registered as `memo-bio`. It resolves the signing wallet (`-n`/`--wif`) and
  broadcasts `[6d05, bio]`; a missing/empty/over-217-byte bio is a usage error
  (exit 2) with no broadcast, and a rejected broadcast surfaces the wallet's
  real error (exit 1). The refactorer extracted the shared `-m` validation
  factory `src/lib/memo-text-flag.js` (now backing `memo-post`, `memo-name`,
  `memo-bio`). Spec: `psf-memo-cli/specs/memo-bio.feature` (7 scenarios, 11
  example executions). Merged to `master` at `ab6f909` (fast-forward; architect
  code-review commit `e93f949aca`; the later `ab6f909` adds only the record and
  summary, so `docs/reviews/cli-memo-bio-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `e93f949aca` (unit 476/0, property
  100/0, acceptance all 27 suites, lint ok); language mutation 2 killed / 0
  survived (`memo-text-flag.js`; the command modules and per-command libs scan
  as 0 sites); soft Gherkin mutation 15 total / 5 killed / 10 intrinsic
  survivors; DRY one accepted per-command wrapper pair. Independent acceptance
  check after merge: 11/11. Architect summary:
  `docs/reviews/cli-memo-bio-summary.md`.

- **CLI set-name write command (`cli-memo-name`, 2026-10-08):** W4 of the
  `psf-memo-cli` Memo-protocol backlog, the first profile write. Added
  `src/lib/memo-name.js` (0x6d01 prefix, 77 UTF-8 byte limit via
  `Buffer.byteLength`, flag parsing, summary) and a thin
  `src/commands/memo-name.js` over the shared write scaffolding, registered as
  `memo-name`. It resolves the signing wallet (`-n`/`--wif`) and broadcasts the
  single-field action `[6d01, name]`; a missing/empty/over-77-byte name is a
  usage error (exit 2) with no broadcast, and a rejected broadcast surfaces the
  wallet's real error (exit 1). The refactorer extracted
  `defineFieldWriteCommand` (also backing `memo-post`). Spec:
  `psf-memo-cli/specs/memo-name.feature` (7 scenarios, 11 example executions).
  Merged to `master` at `14d4407` (fast-forward; architect code-review commit
  `a020de3ade`; the later `14d4407` adds only the record and summary, so
  `docs/reviews/cli-memo-name-verification.json` is valid for the merged tree).
  `verify.sh cli` pass 4/4 at `a020de3ade` (unit 458/0, property 97/0,
  acceptance all 26 suites, lint ok); language mutation 5 killed / 0 survived
  (`memo-name.js` 2, `write-command.js` 3; the command modules scan as 0
  sites); soft Gherkin mutation 15 total / 5 killed / 10 intrinsic survivors
  (case and over-limit equivalents); DRY clean. Independent acceptance check
  after merge: 11/11. Architect summary:
  `docs/reviews/cli-memo-name-summary.md`.

- **CLI poll read command (`cli-memo-poll`, 2026-10-08):** R13 of the
  `psf-memo-cli` Memo-protocol backlog, completing the read-command set
  (R1–R16). Added `src/lib/memo-poll.js` (summary) and a thin
  `src/commands/memo-poll.js` over the shared read-command plumbing and
  `MemoDb.getPoll` (`GET /polls/:txid`), registered as `memo-poll`. It reads a
  single poll by txid (`-t`, shared txid flag) and reports the question, the
  options (text and author address), and the current votes (comment and voter
  address); the DB's 404 maps to a named not-found failure (exit 1). Read-only;
  no wallet. Spec: `psf-memo-cli/specs/memo-poll.feature` (6 scenarios, 9
  example executions). Merged to `master` at `2a34ccc` (fast-forward; architect
  code-review commit `1838180cc9`; the later `2a34ccc` adds only the record and
  summary, so `docs/reviews/cli-memo-poll-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `1838180cc9` (unit 442/0, property
  94/0, acceptance all 25 suites, lint ok); language mutation 15 killed / 0
  survived (`memo-poll.js` 2, `memo-db.js` 13; the command module scans as 0
  sites); soft Gherkin mutation 12/12 killed; DRY clean. Independent acceptance
  check after merge: 9/9. Architect summary:
  `docs/reviews/cli-memo-poll-summary.md`.

- **CLI muted-list command (`cli-memo-muted`, 2026-10-08):** R12 of the
  `psf-memo-cli` Memo-protocol backlog. Added `src/commands/memo-muted.js` over
  the new shared `defineWalletListCommand` factory and `MemoDb.getMuted`
  (`GET /mute/muted/:addr`), registered as `memo-muted`. It resolves the signing
  wallet (`-n`/`--wif`, shared F2 wallet-source; usage error exit 2 when
  missing) and reports the address's muted (mutee) cash addresses; the route is
  unpaginated, so there is no `--limit`/`--offset`. Read-only; a failed request
  is an error (exit 1). The refactorer extracted `src/lib/wallet-list-command.js`
  and migrated `memo-following` onto the same factory. Spec:
  `psf-memo-cli/specs/memo-muted.feature` (4 scenarios, 5 example executions;
  scenario 2 is a `Scenario Outline` so the values are soft-mutation-testable).
  Merged to `master` at `7367b74` (fast-forward; architect code-review commit
  `265618da20`; the later `7367b74` adds only the record and summary, so
  `docs/reviews/cli-memo-muted-verification.json` is valid for the merged tree).
  `verify.sh cli` pass 4/4 at `265618da20` (unit 431/0, property 91/0,
  acceptance all 24 suites, lint ok); language mutation 18 killed / 0 survived
  (`wallet-list-command.js` 2, `follow-list.js` 3, `memo-db.js` 13; the command
  modules scan as 0 sites); soft Gherkin mutation 4/4 killed; DRY clean.
  Independent acceptance check after merge: 5/5. Architect summary:
  `docs/reviews/cli-memo-muted-summary.md`.

- **CLI follow lists (`cli-follow-lists`, 2026-10-08):** R11 of the
  `psf-memo-cli` Memo-protocol backlog, delivered as two commands in one cycle.
  Added `psf-memo-cli/src/lib/follow-list.js` (shared follower `-a` flag and
  address-list summary), `src/commands/memo-following.js` (resolves the signing
  wallet through the F2 wallet source, then `GET /follow/following/:addr`) and
  `src/commands/memo-followers.js` (`GET /follow/followers/:addr`), both over
  the shared `ListReadCommand` pipeline and `MemoDb.getFollowing`/`getFollowers`,
  registered as `memo-following` and `memo-followers`. Each reports the
  address's followee/follower cash addresses; the routes are unpaginated, so
  there is no `--limit`/`--offset`. `memo-following` requires `-n`/`--wif`
  (usage error exit 2 when missing); `memo-followers` requires `-a` (usage error
  exit 2). Read-only; a failed request is an error (exit 1). Specs:
  `psf-memo-cli/specs/memo-following.feature` and
  `psf-memo-cli/specs/memo-followers.feature` (4 scenarios each, 8 example
  executions total). Merged to `master` at `9bffb8a` (fast-forward; architect
  code-review commit `c67e4ac0be`; the later `9bffb8a` adds only the record and
  summary, so `docs/reviews/cli-follow-lists-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `c67e4ac0be` (unit 423/0, property
  89/0, acceptance all 23 suites, lint ok); language mutation 17 killed / 0
  survived (`follow-list.js` 3, `memo-following.js` command 1, `memo-db.js` 13;
  `memo-followers.js` command scans as 0 sites); soft Gherkin mutation 0
  mutations (no Examples tables; gotcha #78); DRY clean after extracting the
  shared follow-command test scaffolding and property generators. Independent
  acceptance check after merge: 8/8. Architect summary:
  `docs/reviews/cli-follow-lists-summary.md`.

- **CLI recent-profiles command (`cli-memo-profiles`, 2026-10-08):** R10 of the
  `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-profiles.js` (page defaults and human summary) and
  a thin `src/commands/memo-profiles.js` over the shared `ListReadCommand`
  pipeline and `MemoDb.getRecentProfiles` (`GET /profile/recent`), registered as
  `memo-profiles`. It reports one page of recently active profiles — address,
  bio text, display name, avatar URL, provenance txid, and the most recent
  qualifying post's block height and seen, in the service's order — with the
  service pagination unchanged. A profile with no name record reports a null
  display name and one with no picture record reports a null avatar URL (raw
  service values, not the web client's truncated-address/identicon rendering).
  Read-only; no wallet. The refactorer extracted the shared formatted-page read
  pipeline (`ListReadCommand`, `runOutcomeCommand`), now used by
  `memo-profiles`, `memo-topics`, and `memo-search`. Spec:
  `psf-memo-cli/specs/memo-profiles.feature` (6 scenarios, 12 example
  executions). Merged to `master` at `44e1c1e` (fast-forward; architect
  code-review commit `292dfa1c1b`; the later `44e1c1e` adds only the record and
  summary, so `docs/reviews/cli-memo-profiles-verification.json` is valid for
  the merged tree). `verify.sh cli` pass 4/4 at `292dfa1c1b` (unit 402/0,
  property 81/0, acceptance all 21 suites, lint ok); language mutation 18 killed
  / 0 survived (`memo-profiles.js` 4, `read-command.js` 1, `memo-db.js` 13; the
  command modules scan as 0 sites); soft Gherkin mutation 33 total / 31 killed /
  2 intrinsic survivors (fixture-masked upward `limit`); DRY reports one
  accepted command-glue pair (`memo-profiles`/`memo-topics`). Independent
  acceptance check after merge: 12/12. Architect summary:
  `docs/reviews/cli-memo-profiles-summary.md`.

- **CLI full-text search command (`cli-memo-search`, 2026-10-08):** R9 of the
  `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-search.js` (required `-q` query, page defaults,
  blank-query empty page, human summary) and a thin
  `src/commands/memo-search.js` over the shared read-command plumbing and
  `MemoDb.search` (`GET /search`), registered as `memo-search`. It reports one
  page of matching top-level posts and profiles (case-insensitive substring over
  post text and profile name/bio) with the combined service pagination
  unchanged; the optional `--viewer` filters muted authors from the posts
  (profiles are not mute-filtered). A missing `-q` is a usage error (exit 2); a
  provided blank query returns an empty result (exit 0); a failed request is an
  error (exit 1). The refactorer added a shared `toQuery` builder in
  `src/lib/memo-db.js` and shared usage-error test helpers. Spec:
  `psf-memo-cli/specs/memo-search.feature` (7 scenarios, 11 example executions).
  Merged to `master` at `850674c` (fast-forward; architect code-review commit
  `2cd80790da`; the later `850674c` adds only the record and summary, so
  `docs/reviews/cli-memo-search-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `2cd80790da` (unit 389/0, property 76/0,
  acceptance all 20 suites, lint ok); language mutation 17 killed / 0 survived
  (`memo-search.js` lib 5, `memo-db.js` 12; the command module scans as 0 sites);
  soft Gherkin mutation 22 total / 20 killed / 2 intrinsic survivors (viewer
  address case); DRY clean. Independent acceptance check after merge: 11/11.
  Architect summary: `docs/reviews/cli-memo-search-summary.md`.

- **CLI topic read command (`cli-memo-topic`, 2026-10-07):** R8 of the
  `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-topic.js` (required `-r` room, optional `--viewer`,
  page defaults, summary) and a thin `src/commands/memo-topic.js` over the shared
  `runPostsPageCommand` pipeline and `MemoDb.getTopicPosts`
  (`GET /topics/:room/posts`), registered as `memo-topic`. It reports one page of
  a topic's posts (with reply and like counts) and pagination unchanged; the
  optional viewer filters muted authors. Spec:
  `psf-memo-cli/specs/memo-topic.feature` (7 scenarios, 12 example executions).
  Merged to `master` at `085e873` (fast-forward; architect code-review commit
  `405ab072ef`; the later `085e873` adds only the record and summary, so
  `docs/reviews/cli-memo-topic-verification.json` is valid for the merged tree).
  `verify.sh cli` pass 4/4 at `405ab072ef` (unit 370/0, property 68/0, acceptance
  all 19 suites, lint ok); language mutation 9 killed / 0 survived
  (`memo-topic.js` 2, `memo-db.js` 7); soft Gherkin mutation 26 total / 24 killed
  / 2 intrinsic survivors (viewer-address case); DRY clean. Independent
  acceptance check after merge: 12/12. Architect summary:
  `docs/reviews/cli-memo-topic-summary.md`.

- **CLI topics read command (`cli-memo-topics`, 2026-10-07):** R7 of the
  `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-topics.js` (page defaults and summary) and a thin
  `src/commands/memo-topics.js` over the shared read scaffolding and
  `MemoDb.getTopics` (`GET /topics`), registered as `memo-topics`. It reports
  the paginated topic list — each topic's `room`, `postCount`, `lastSeen`
  (epoch-ms last-post time), and `followerCount` — in the service's recency
  order, with pagination unchanged. The refactorer added
  `src/lib/page-summary.js` (`formatPageSummary`), now shared by `memo-feed`,
  `memo-notifications`, and `memo-topics`. Spec:
  `psf-memo-cli/specs/memo-topics.feature` (5 scenarios, 10 example executions).
  Merged to `master` at `5559269` (fast-forward; architect code-review commit
  `ccb7ab8702`; the later `5559269` adds only the record and summary, so
  `docs/reviews/cli-memo-topics-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `ccb7ab8702` (unit 357/0, property 65/0,
  acceptance all 18 suites, lint ok); language mutation 11 killed / 0 survived
  (`page-summary.js` 1, `memo-topics.js` 1, `memo-db.js` 6, `memo-feed.js` 2,
  `memo-notifications.js` 1); soft Gherkin mutation 28 total / 26 killed / 2
  intrinsic survivors (exhausted-page limits); DRY clean. Independent acceptance
  check after merge: 10/10. Architect summary:
  `docs/reviews/cli-memo-topics-summary.md`.

- **CLI posts read command (`cli-memo-posts`, 2026-10-07):** R5 of the
  `psf-memo-cli` Memo-protocol backlog. Added `psf-memo-cli/src/lib/memo-posts.js`
  (flag parsing/defaults and summary) and a thin `src/commands/memo-posts.js`
  over the new shared `src/lib/post-page-command.js` (`memo-feed` now uses it
  too) and the new shared `src/lib/address-flag.js`, registered as `memo-posts`.
  It reports one page of `GET /posts/by/:addr` (newest first, replies excluded)
  as `{ posts, pagination }`. Spec: `psf-memo-cli/specs/memo-posts.feature` (6
  scenarios, 10 example executions). Merged to `master` at `b6d7fac`
  (fast-forward; architect code-review commit `382485b5f2`; the later `b6d7fac`
  adds only the record and summary, so
  `docs/reviews/cli-memo-posts-verification.json` is valid for the merged tree).
  `verify.sh cli` pass 4/4 at `382485b5f2` (unit 342/0, property 61/0,
  acceptance all 17 suites, lint ok); language mutation 6 killed / 0 survived
  (`memo-posts.js` 1, `memo-profile.js` 5; the new shared modules are
  structural-zero); soft Gherkin mutation 22/22 killed (clean); DRY clean.
  Independent acceptance check after merge: 10/10. Architect summary:
  `docs/reviews/cli-memo-posts-summary.md`.

- **CLI profile read command (`cli-memo-profile`, 2026-10-07):** R4 of the
  `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-profile.js` (required `-a`, page defaults, summary)
  and a thin `src/commands/memo-profile.js` that composes the address's
  name/bio/avatar (`/level/name|profile|profilepic`) with one page of `GET
  /posts/by/:addr` and an optional `--viewer` follow state (`GET /follow/state`);
  without a viewer the follow state is false. It reports `{ address, name, bio,
  avatar, following, posts, pagination }`. No tokens (psf-memo-db exposes no
  token route; R15 covers the wallet's own). Spec:
  `psf-memo-cli/specs/memo-profile.feature` (7 scenarios, 12 example
  executions). Merged to `master` at `dcf66fd` (fast-forward; architect
  code-review commit `78577b1ce6`; the later `dcf66fd` adds only the record and
  summary, so `docs/reviews/cli-memo-profile-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `78577b1ce6` (unit 328/0, property
  58/0, acceptance all 16 suites, lint ok); language mutation 15 killed / 0
  survived (`memo-profile.js` lib 5, command 5, `memo-db.js` 5); soft Gherkin
  mutation 28 total / 17 killed / 11 intrinsic survivors (identity pass-through
  cells and exhausted-page limits); DRY clean after table-driving the
  address-page tests. Independent acceptance check after merge: 12/12. Architect
  summary: `docs/reviews/cli-memo-profile-summary.md`.

- **CLI notifications read command (`cli-memo-notifications`, 2026-10-07):** R6 of
  the `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-notifications.js` (pure page defaults and human
  summary) and a thin `src/commands/memo-notifications.js` composed over the
  shared `initReadCommand`/`runReadCommand`, the F2 wallet source, and
  `MemoDb.getNotifications` (`GET /posts/notifications/:addr`), registered as
  `memo-notifications`. It reads the wallet address's notifications (type,
  action txid, actor address, and service-provided post txid/text/block height)
  and reports the pagination unchanged; the refactorer extracted the shared
  `page-flags.js` parse (with `memo-feed`), `installWalletFactory`, and
  `assertReportedTxids`. Spec: `psf-memo-cli/specs/memo-notifications.feature`
  (6 scenarios, 11 example executions). Merged to `master` at `8446473`
  (fast-forward; architect code-review commit `b81b63e225`; the later `8446473`
  adds only the record and summary, so
  `docs/reviews/cli-memo-notifications-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `b81b63e225` (unit 309/0, property
  54/0, acceptance all 15 suites, lint ok); language mutation 16 killed / 0
  survived across `page-flags.js`, `memo-notifications.js` lib+command,
  `memo-db.js`, and `memo-feed.js`; soft Gherkin mutation 25/25 killed (clean);
  DRY clean after extracting the request-recording helper. Independent
  acceptance check after merge: 11/11. Architect summary:
  `docs/reviews/cli-memo-notifications-summary.md`.

- **CLI wait read command (`cli-memo-wait`, 2026-10-07):** R16 of the
  `psf-memo-cli` Memo-protocol backlog. Added `psf-memo-cli/src/lib/memo-wait.js`
  (pure timing-flag validation and poll loop) and a thin
  `src/commands/memo-wait.js` over the shared `initReadCommand`/`runReadCommand`,
  registered as `memo-wait` in `psf-memo-cli.js`. It polls `GET
  /level/post/:txid` immediately, then every `--interval` (default 5000 ms)
  until the post appears or `--timeout` (default 60000 ms) elapses: on success
  it reports the stored post fields; a timeout is a runtime error (exit 1); a
  transport failure aborts on the first poll (exit 1); non-positive or
  non-integer timing flags are usage errors (exit 2). The clock (`sleep`/`now`)
  is injected. Spec: `psf-memo-cli/specs/memo-wait.feature` (6 scenarios, 9
  example executions). Merged to `master` at `d4ca45a` (fast-forward; architect
  code-review commit `e8dfe42aa0`; the later `d4ca45a` adds only the record and
  summary, so `docs/reviews/cli-memo-wait-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `e8dfe42aa0` (unit 293/0, property
  50/0, acceptance all 14 suites, lint ok); language mutation 12 killed / 0
  survived (`memo-wait.js` lib 10, command 2); soft Gherkin mutation 12 total /
  6 killed / 6 intrinsic survivors (invalid-flag outline equivalents); DRY clean
  after extracting `test/support/clock.js`. Independent acceptance check after
  merge: 9/9. Architect summary: `docs/reviews/cli-memo-wait-summary.md`.

- **CLI memo like/tip write command (`cli-memo-like`, 2026-10-07):** W3 of the
  `psf-memo-cli` Memo-protocol backlog. Added `psf-memo-cli/src/lib/memo-like.js`
  (pure `0x6d04` prefix, post-txid decode, the tip window — 600-sat dust floor,
  1-BCH maximum, integer parse — the spendable-sat math, and the human summary)
  and a thin `src/commands/memo-like.js` over the shared
  `initWriteCommand`/`runWriteCommand`, registered as `memo-like` in
  `psf-memo-cli.js`. A like broadcasts `[6d04, post txid (32 LE)]`; an optional
  `--tip`/`--author` adds a P2PKH output to the post author. Tip amount rules
  (dust floor, maximum, non-integer, missing author) and a malformed post txid
  are usage errors (exit 2) with no broadcast; a wallet under 3000 spendable
  sats, or a tip above the spendable balance, is reported as an error (exit 1);
  a rejected broadcast surfaces the wallet's real error (exit 1). The
  refactorer extracted `parseTxidBytesFlag` into `txid-flag.js` (shared with
  `memo-reply`). Spec: `psf-memo-cli/specs/memo-like.feature` (10 scenarios, 20
  example executions). Merged to `master` at `aa617ed` (fast-forward; architect
  code-review commit `4a7917472f`; the later `aa617ed` adds only the record and
  summary, so `docs/reviews/cli-memo-like-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `4a7917472f` (unit 274/0, property
  48/0, acceptance all 13 suites, lint ok); language mutation 17 killed / 2
  equivalent survived (`memo-like.js` lib) plus 4 killed / 1 equivalent
  (`memo-like.js` command) and 2 killed / 0 survived (`memo-reply.js`); soft
  Gherkin mutation 36 total / 10 killed / 26 intrinsic survivors; DRY clean after
  extracting the shared command-test bodies. Independent acceptance check after
  merge: 20/20. Architect summary: `docs/reviews/cli-memo-like-summary.md`.

- **CLI memo reply write command (`cli-memo-reply`, 2026-10-07):** W2 of the
  `psf-memo-cli` Memo-protocol backlog — the first multi-field write command.
  Added `psf-memo-cli/src/lib/memo-reply.js` (pure `0x6d03` prefix,
  184-UTF-8-byte limit, parent-txid presence/format validation, little-endian
  wire encoding, human summary) and a thin `src/commands/memo-reply.js` over the
  new shared `src/lib/write-command.js` (`initWriteCommand`/`runWriteCommand`),
  which now also backs `memo-post`. A valid reply broadcasts `[6d03, parent
  txid (32 LE), text]` through the F3 multi-push scaffolding and reports the
  txid + `bch.loping.net` explorer link; missing/empty/over-long text and a
  missing/malformed parent txid are usage errors (exit 2) with no broadcast; a
  rejected broadcast surfaces the wallet's real error (exit 1). Spec:
  `psf-memo-cli/specs/memo-reply.feature` (9 scenarios, 14 example executions).
  Merged to `master` at `89fe739` (fast-forward; architect code-review commit
  `30fdddf0c2`; the later `89fe739` adds only the record and summary, so
  `docs/reviews/cli-memo-reply-verification.json` is valid for the merged tree).
  `verify.sh cli` pass 4/4 at `30fdddf0c2` (unit 248/0, property 46/0, acceptance
  all 12 suites, lint ok); language mutation 6 killed / 0 survived
  (`write-command.js` 2, `memo-reply.js` lib 2, `memo-reply.js` command 1, and
  the refactored `memo-post.js` command 1); soft Gherkin mutation 21 total / 7
  killed / 14 intrinsic survivors (self-consistent parent/text/txid and
  over-limit equivalents); DRY clean after extracting the shared write-command
  unit helpers. Independent acceptance check after merge: 14/14. Architect
  summary: `docs/reviews/cli-memo-reply-summary.md`.

- **CLI memo post write command (`cli-memo-post`, 2026-10-07):** W1 of the
  `psf-memo-cli` Memo-protocol backlog — the first write command. Added
  `psf-memo-cli/src/lib/memo-post.js` (pure `0x6d02` prefix, 217-UTF-16-code-unit
  limit, flag parsing, human summary) and a thin `src/commands/memo-post.js`
  composing the shared F5 reporter, F2 wallet source, and F3 broadcast
  scaffolding, registered as `memo-post` in `psf-memo-cli.js`. A valid memo
  broadcasts `[6d02, text]` and reports the txid + `bch.loping.net` explorer
  link; missing/empty/over-long text is a usage error (exit 2) with no
  broadcast; a rejected broadcast surfaces the wallet's real error (exit 1).
  Spec: `psf-memo-cli/specs/memo-post.feature` (7 scenarios, 11 example
  executions). Merged to `master` at `756747e` (fast-forward; architect
  code-review commit `4675901a11`; the later `756747e` adds only the record and
  summary, so `docs/reviews/cli-memo-post-verification.json` is valid for the
  merged tree). `verify.sh cli` pass 4/4 at `4675901a11` (unit 228/0, property
  44/0, acceptance all 11 suites, lint ok); language mutation 5 killed / 0
  survived (`memo-post.js` command 3, lib 2); soft Gherkin mutation 15 total / 6
  killed / 9 intrinsic survivors (self-consistent text/txid and over-limit
  equivalents); DRY clean after consolidating the usage-error tests. Independent
  acceptance check after merge: 11/11. Architect summary:
  `docs/reviews/cli-memo-post-summary.md`.

- **CLI wallet identity read command (`cli-memo-identity`, 2026-10-07):** R15 of
  the `psf-memo-cli` Memo-protocol backlog — the first wallet-relative read
  command. It composes the shared `src/lib/read-command.js` scaffolding with the
  F2 `src/lib/wallet-source.js` resolver and pure `src/lib/memo-identity.js`
  helpers (BCH summing, sats→BCH, token-UTXO collection), plus `MemoDb.getName`
  and `getProfilePic`. It reports the wallet's cash address, BCH/SLP balances,
  and the address's Memo name/bio/avatar; a missing profile document becomes an
  empty field (exit 0) while a transport failure is exit 1. Spec:
  `psf-memo-cli/specs/memo-identity.feature` (6 scenarios, 11 example
  executions). Merged to `master` at `df32bc0` (fast-forward; architect
  code-review commit `a403a53`; the later `df32bc0` is docs-only, so
  `docs/reviews/cli-memo-identity-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `a403a53` (unit 211/0, property 42/0,
  acceptance 10 suites, lint ok); language mutation 19 killed / 0 survived; soft
  Gherkin mutation 26 total / 12 killed / 14 intrinsic survivors (profile
  pass-through cells); DRY clean. Independent acceptance check after merge:
  11/11. Architect summary:
  `docs/reviews/cli-memo-identity-summary.md`.

- **CLI indexer status read command (`cli-memo-status`, 2026-10-07):** R14 of
  the `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-status.js` (pure result shaping),
  `src/commands/memo-status.js` (flag-less thin subclass of the shared
  `src/lib/read-command.js`), and `MemoDb.getStatus` for
  `GET /level/status/status`. It reports the indexer's `startBlockHeight`,
  `syncedBlockHeight`, and `chainBlockHeight`; a missing status record maps to a
  named not-found failure (exit 1). Spec:
  `psf-memo-cli/specs/memo-status.feature` (3 scenarios, 5 example executions).
  Merged to `master` at `a9aa65a` (fast-forward; architect code-review commit
  `f842955`; the later `a9aa65a` is docs-only, so
  `docs/reviews/cli-memo-status-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `f842955` (unit 194/0, property 38/0,
  acceptance 9 suites, lint ok); language mutation 5 killed / 0 survived; soft
  Gherkin mutation 9/9 intrinsic (self-consistent status values); DRY clean.
  Independent acceptance check after merge: 5/5. Architect summary:
  `docs/reviews/cli-memo-status-summary.md`.

- **CLI single-post read command (`cli-memo-get-post`, 2026-10-07):** R3 of the
  `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/memo-get-post.js` (pure flag parsing and result shaping),
  `src/commands/memo-get-post.js` (thin subclass of the shared
  `src/lib/read-command.js`), `MemoDb.getPost` for `GET /level/post/:txid`, and
  the shared `src/lib/txid-flag.js` (required `-t` validation). It reports a
  single stored post's fields (text, address, block height, seen); a txid with no
  stored post maps to a named not-found failure (exit 1). The `memo-post` name
  collision is resolved: read = `memo-get-post`, write W1 = `memo-post`. Spec:
  `psf-memo-cli/specs/memo-get-post.feature` (4 scenarios, 5 example
  executions). Merged to `master` at `373912d` (fast-forward; architect
  code-review commit `e91506a`; the later `373912d` is docs-only, so
  `docs/reviews/cli-memo-get-post-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `e91506a` (unit 185/0, property 35/0,
  acceptance 8 suites, lint ok); language mutation 8 killed / 0 survived
  (`memo-thread.js` 4, `memo-db.js` 4; the new modules scan as 0 sites); soft
  Gherkin mutation 10/10 killed; DRY clean. Independent acceptance check after
  merge: 5/5. Architect summary:
  `docs/reviews/cli-memo-get-post-summary.md`.

- **CLI memo thread read command (`cli-memo-thread`, 2026-10-07):** R2 of the
  `psf-memo-cli` Memo-protocol backlog. Added `psf-memo-cli/src/lib/memo-thread.js`
  (pure flag parsing and result shaping), `src/commands/memo-thread.js` (thin
  subclass of the new shared `src/lib/read-command.js`), and `MemoDb.getThread`
  for `GET /posts/:txid/thread`. It reads a Memo post and its nested reply tree
  with per-node like counts, preserving the service's oldest-first reply order;
  a txid with no indexed thread maps to a named not-found failure (exit 1). The
  refactorer also extracted the shared read-command scaffolding reused by
  `memo-feed`. Spec: `psf-memo-cli/specs/memo-thread.feature` (7 scenarios, 9
  example executions). Merged to `master` at `8fe83ce` (fast-forward; architect
  code-review commit `aa75d60`; the later `8fe83ce` is docs-only, so
  `docs/reviews/cli-memo-thread-verification.json` is valid for the merged
  tree). `verify.sh cli` pass 4/4 at `aa75d60` (unit 170/0, property 32/0,
  acceptance 7 suites, lint ok); language mutation 10 killed / 0 survived;
  soft Gherkin mutation 6/6 killed; DRY clean. Independent acceptance check
  after merge: 9/9. Architect summary:
  `docs/reviews/cli-memo-thread-summary.md`.

- **CLI memo feed read command (`cli-memo-feed`, 2026-10-07):** R1 of the
  `psf-memo-cli` Memo-protocol backlog — the first `memo-*` read command. Added
  `psf-memo-cli/src/lib/memo-feed.js` (pure flag parsing/defaults and result
  shaping) and `src/commands/memo-feed.js` (thin wiring over the F1 `MemoDb`
  client and the F5 reporter), registered as `memo-feed` in
  `psf-memo-cli/psf-memo-cli.js`. It reads one page of the recent top-level feed
  (`GET /posts/recent`, newest first), passing `--limit`/`--offset` through
  (defaults 50/0), an optional `--viewer` address, and the service pagination
  unchanged (including the capped total). Spec:
  `psf-memo-cli/specs/memo-feed.feature` (6 scenarios, 11 example executions).
  Merged to `master` at `bbf680b` (fast-forward; architect code-review commit
  `baf9ca2`; the later `bbf680b` is docs-only, so
  `docs/reviews/cli-memo-feed-verification.json` is valid for the merged tree).
  `verify.sh cli` pass 4/4 at `baf9ca2` (unit 157/0, property 27/0, acceptance 6
  suites, lint ok); language mutation 9 killed / 0 survived (`memo-feed.js`
  command 1, lib 8); soft Gherkin mutation 33/27 with 6 intrinsic survivors
  (widened-limit and consistent-viewer equivalents); DRY clean. Independent
  acceptance check after merge: 11/11. Architect summary:
  `docs/reviews/cli-memo-feed-summary.md`.

- **CLI wallet source and Memo broadcast scaffolding (`cli-wallet-broadcast`,
  2026-10-07):** F2/F3 of the `psf-memo-cli` Memo-protocol backlog, completing
  the foundation. Added `psf-memo-cli/src/lib/wallet-source.js` (pure resolver;
  exactly one of `-n <wallet>`/`--wif <wif>`, else `UsageError`),
  `psf-memo-cli/src/lib/memo-broadcast.js` (pure `toPushBuffer`/`buildMemoPushes`
  plus a confined `minimal-slp-wallet` `Script.encode2` patch so a multi-field
  action becomes one push per field, gotcha #35), and a `wallet-util.js` WIF
  constructor. Specs: `psf-memo-cli/specs/wallet-source.feature`,
  `psf-memo-cli/specs/memo-broadcast.feature`. Merged to `master` at `d78fb09`
  (architect code-review commit `c2ab84a`; the later `d78fb09` adds only the
  record and summary, so `docs/reviews/cli-wallet-broadcast-verification.json`
  is valid for the merged tree). `verify.sh cli` pass 4/4 at `c2ab84a` (unit
  139/0, property 20/0, acceptance 5 suites, lint ok); language mutation 12
  killed / 0 survived (`wallet-source.js` 2, `memo-broadcast.js` 6,
  `wallet-util.js` 4); soft Gherkin mutation memo-broadcast 22/9 and
  wallet-source 8/0, survivors intrinsic round-trip equivalents; DRY clean.
  Independent acceptance check after merge: all 5 suites. Architect summary:
  `docs/reviews/cli-wallet-broadcast-summary.md`.

- **CLI wire-encoding helpers (`cli-memo-wire-encoding`, 2026-10-07):** F4 of the
  `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/wire-encoding.js`: `txidToWireBytes` (32-byte
  little-endian, byte-reversed) and `addressToHash160` (20-byte hash160 in
  display order, **not** reversed), with `ecashaddrjs` promoted to a direct
  dependency. These are the endianness regression guards for the like/reply/
  poll-option/poll-vote payloads (gotcha #32). Merged to `master` at `6f5c5ba`
  (architect code-review commit `44015a9`; the later `6f5c5ba` adds only the
  record and summary, so `docs/reviews/cli-memo-wire-encoding-verification.json`
  is valid for the merged tree). `verify.sh cli` pass 4/4 at `44015a9` (unit
  121/0, property 17/0, acceptance 3 suites, lint ok); language mutation 1
  killed / 0 survived (`wire-encoding.js`); soft Gherkin mutation 16/10 with 6
  malformed-input intrinsic survivors; DRY clean. Independent acceptance check
  after merge: memo-wire-encoding 10/10 plus the two existing suites (all 3
  passed). Architect summary: `docs/reviews/cli-memo-wire-encoding-summary.md`.

- **CLI output and exit-code contract (`cli-output-contract`, 2026-10-06):** F5
  of the `psf-memo-cli` Memo-protocol backlog. Added
  `psf-memo-cli/src/lib/reporter.js`, the pure injectable leaf every `memo-*`
  command uses: human-readable by default, `--json` prints one object to
  stdout, failures report the real error on stderr, exit `0`/`1`/`2`. Success
  JSON is the command's own result object; error JSON is `{ "error": "..." }`
  on stderr. Unknown-option exit-2 handling was deferred. The architect also
  split the CLI acceptance step handlers into per-feature modules
  (`acceptance/lib/steps/`). Merged to `master` at `e93afcf` (architect
  code-review commit `e050713`; the later `e93afcf` adds only the record and
  summary, so `docs/reviews/cli-output-contract-verification.json` is valid for
  the merged tree). `verify.sh cli` pass 4/4 at `e050713` (unit 113/0, property
  13/0, acceptance 2 suites, lint ok); language mutation 4 killed / 0 survived
  (`reporter.js`); soft Gherkin mutation 10/0 with 10 intrinsic survivors; DRY
  clean. Independent acceptance check after merge: 10/10 (plus the existing
  memo-db-client 12/12). Architect summary:
  `docs/reviews/cli-output-contract-summary.md`.

- **CLI Memo DB client (`cli-memo-db-client`, 2026-10-06):** the first item of
  the new `psf-memo-cli` Memo-protocol backlog
  (`psf-memo-cli/dev-docs/feature-backlog.md`). Added
  `psf-memo-cli/src/lib/memo-db.js` (read-only client for the psf-memo-db REST
  API; injected `fetch`, pure endpoint resolution) and endpoint config
  (`MEMO_DB_URL` default `https://memo-api.fullstackcash.net`, `--db-url`
  override, local dev `http://localhost:5021`). The same job onboarded the CLI
  Gherkin acceptance harness (`psf-memo-cli/acceptance/`), so
  `psf-memo-cli/specs/memo-db-client.feature` (7 scenarios, 12 example
  executions) is executable. Merged to `master` at `346556f` (fast-forward;
  architect code-review commit `c881811`; the later `9491580`/`346556f` are
  docs-only, so `docs/reviews/cli-memo-db-client-verification.json` is valid for
  the merged tree). `verify.sh cli` pass 4/4 at `c881811` (unit 99/0, property
  10/0, acceptance 1 suite, lint ok); language mutation 6 killed / 0 survived;
  soft Gherkin mutation 23/12 with 11 intrinsic survivors; DRY clean.
  Independent acceptance check after merge: 12/12. Architect summary:
  `docs/reviews/cli-memo-db-client-summary.md`.

- **psf-memo-cli quality baseline (`cli-quality-hardening`, 2026-10-06):** the
  newly added `psf-memo-cli` component was hardened before feature work.
  Baseline was red: CRAP exit 2 (`SendTokens.validateFlags` 9.0;
  `MsgVerify`/`SendBch.validateFlags` 7.0), 4 exact DRY duplicates, and 50
  killed / 23 survived / 0 uncovered mutations. The refactorer extracted
  `src/lib/token-balances.js`, `flag-validator.js`, `send-command.js`, and
  `bind-methods.js`, added a property suite, and made `pretest` provision
  `.wallets`; the architect decoupled `SendTokens` from the `WalletBalance`
  command, fixed misleading error labels, made `saveWallet` create its parent
  directory, added `property` to the `cli` verification entry, and killed every
  survivor. Final: CRAP exit 0 (max 6.0), DRY no duplicates, mutation 49 killed
  / 0 survived / 0 uncovered, unit 84 passing / 100% coverage, property 4/4,
  lint clean. Merged to `master` at `e1fc6f0` (fast-forward; architect
  code-review commit `7997339`; the later `e1fc6f0` adds only the record and
  summary, so `docs/reviews/cli-quality-hardening-verification.json` is valid
  for the merged tree). Independent check after merge: unit 84 passing,
  property 4/4, CRAP exit 0. Refactorer commits `eee2a29`, `1631bac`; architect
  review `7997339`. Architect summary:
  `docs/reviews/cli-quality-hardening-summary.md`.

- **Feed pagination scroll (2026-10-02):** the `/posts/recent` posts feed now
  scrolls back to the top whenever a page loads (the Next or Previous buttons)
  or the active Recent/Following tab changes, so the viewer starts at the first
  post of the new page. The scroll is decided by the pure `FeedTabsPage`
  coordinator through an injected `scrollToTop` adapter (no-op by default); the
  React posts view supplies `window.scrollTo({ top: 0, left: 0 })`. No-op paths
  (selecting the active tab, Next/Previous with no target page) do not scroll.
  Client-only; no DB/indexer change. Spec:
  `psf-memo-client/specs/feed-pagination-scroll.feature` (4 scenarios, 7 example
  executions). Merged to `master` at `ffb063f` (merge commit; architect review
  commit `181709a7e0`; the later `b7476d7` adds only the record and summary, so
  `docs/reviews/feed-pagination-scroll-verification.json` is valid for the merged
  tree). Independent acceptance check after merge: 7/7 example executions.
  `verify.sh client` pass 5/5 at `181709a7e0` (unit 759/0, property 212/0,
  acceptance 47 suites, lint ok, build ok); language mutation 22 killed / 0
  survived (`feed-tabs-page.js`); soft Gherkin mutation 14 total / 9 killed / 5
  intrinsic survivors (self-consistent example values, gotcha #12 class); max CC
  and CRAP 5.0. Architect summary:
  `docs/reviews/feed-pagination-scroll-summary.md`.

- **Account page layout (2026-10-02):** the `/account` page now shares the
  `/profile/:addr` sidebar — avatar with a jdenticon fallback, bio (or
  "No profile text"), the copyable BCH address with the transient "Copied to
  clipboard" confirmation, and the account's SLP token icons — with the
  existing Set Name / Set Bio / Set Avatar URL controls in the right column,
  each preceded by a short description, in the profile section order. The
  shared two-phase token-icon loading (`services/token-icon-loader.js`) and the
  address-copy confirmation (`services/address-copy.js`) now back both page
  controllers. Client-only; no DB/indexer change. Spec:
  `psf-memo-client/specs/account-page-layout.feature` (15 scenarios);
  `account-avatar-display.feature` (jdenticon fallback) and
  `set-avatar-url.feature` scenario 1 (rendered avatar image) were updated.
  Merged to `master` at `cf6310e` (fast-forward; architect review commit
  `8836f4c634`; the later `cf6310e` is docs-only, so
  `docs/reviews/account-page-layout-verification.json` is valid for the merged
  tree). Independent acceptance check after merge: 33 example executions across
  the three touched features (account-page-layout 20, account-avatar-display 3,
  set-avatar-url 10). `verify.sh client` pass 5/5 at `8836f4c634` (unit 758/0,
  property 207/0, acceptance 46 suites, lint ok, build ok); language mutation 89
  killed / 0 survived; soft Gherkin mutation account-page-layout 14/10,
  account-avatar-display 2/0, set-avatar-url 13/7, all survivors intrinsic
  case/same-length-equivalent substitutions; max CC 6 / CRAP 6.0. Architect
  summary: `docs/reviews/account-page-layout-summary.md`.

- **Profile post like/tip (2026-10-02):** the heart on a `/profile/:addr`
  post card is now the same interactive like/tip control as the `/posts/recent`
  feed: clicking it opens the Like/Tip modal for that post, a pure like
  broadcasts `0x6d04` (no tip), a like with a tip also pays the post author,
  the post's like count and heart reflect the like, and the broadcast-result
  modal stays open with the success message, like transaction id, and
  block-explorer link until dismissed. The per-post like state is a pure
  service (`psf-memo-client/src/services/profile-post-like.js`), the
  presentational seam is
  `src/components/app-body/profile/profile-post-like.js` (plain
  `React.createElement`, shared with the Node adapter
  `acceptance/lib/render-profile-post-like.js`), and the shared `LikeButton`
  was converted to CommonJS `React.createElement` with its unused `readOnly`
  span branch removed. Client-only. Spec:
  `psf-memo-client/specs/profile-post-like.feature`. Merged to `master` at
  `3653f80` (architect review commit `20bd05f`; the later docs-only `abc1f4c`
  adds the record and summary, so
  `docs/reviews/profile-post-like-verification.json` is valid for the merged
  tree). Independent acceptance check after merge: 10/10 example executions.
  `verify.sh client` pass 5/5 at `20bd05f` (unit 718/0, property 207/0,
  acceptance 45 suites, lint ok, build ok); language mutation 12 killed / 0
  survived (`profile-post-like.js` 7, profile presentational component 2,
  `like-button.js` 3); soft Gherkin mutation 12 total / 5 killed / 7 intrinsic
  survivors (self-consistent txid/tip example values; invalid-hex txid
  substitutions were killed). Architect summary:
  `docs/reviews/profile-post-like-summary.md`.

- **TikTok Embed (2026-10-02):** posts containing a TikTok video link now
  render the video in an embedded player
  (`https://www.tiktok.com/player/v1/<video_id>`) instead of the raw URL, with
  surrounding text preserved and non-video tiktok.com links left as ordinary
  links. Canonical links carry the numeric id; short links (`vt.tiktok.com`,
  `vm.tiktok.com`, `tiktok.com/t/`) are resolved through TikTok's CORS-enabled
  oEmbed `embed_product_id` before the player shows, via the injectable-fetch
  resolver `psf-memo-client/src/services/tiktok-oembed.js` and the pure parser
  `src/services/tiktok-embed.js`; an unresolved short link stays a plain link.
  Client-only read rendering through the shared `PostContent` renderer (feed +
  profile page). Spec: `psf-memo-client/specs/tiktok-embed.feature`. Merged to
  `master` at `3d2dbbb` (architect review commit `98aff8d`; the later docs-only
  `8adb27a` adds the record and summary, so
  `docs/reviews/tiktok-embed-verification.json` is valid for the merged tree).
  Independent acceptance check after merge: 20/20 example executions.
  `verify.sh client` pass 5/5 at `98aff8d` (unit 705/0, property 200/0,
  acceptance 44 suites, lint ok, build ok); language mutation 8/8
  (`tiktok-embed.js`), 3/3 (`tiktok-oembed.js`), 11/11 (`post-content.js`);
  soft Gherkin mutation 38 total / 26 killed / 12 intrinsic survivors
  (case-insensitive URL parts, self-consistent values, unasserted text);
  max CC 6 / CRAP 6.0. Architect summary:
  `docs/reviews/tiktok-embed-summary.md`.

- **X Post Embed (2026-10-02):** posts containing an x.com or twitter.com
  status link (`/status/<numeric id>`) now render the linked post in an
  embedded X frame (`https://platform.twitter.com/embed/Tweet.html?id=<status_id>`)
  instead of the raw URL; surrounding text is preserved, and non-status or
  malformed x.com/twitter.com links stay ordinary links. Client-only read
  rendering through the shared `PostContent` renderer, so the feed and the
  profile page both get it. Spec: `psf-memo-client/specs/x-post-embed.feature`;
  the pure parser is `psf-memo-client/src/services/x-embed.js`
  (`extractXStatusId`) and the render-node extraction is in
  `src/components/post-feed/post-content.js`. Merged to `master` at `3795645`
  (architect review commit `3d38f14`; the later docs-only `9da218b` adds the
  record and summary, so `docs/reviews/x-post-embed-verification.json` is valid
  for the merged tree). Independent acceptance check after merge: 17/17 example
  executions. `verify.sh client` pass 5/5 at `3d38f14` (unit 673/0, property
  190/0, acceptance 43 suites, lint ok, build ok); language mutation 3/3
  (`x-embed.js`) and 3/3 (`post-content.js`); soft Gherkin mutation 33 total /
  26 killed / 7 intrinsic survivors (case-insensitive host/scheme and
  self-consistent text values); max CC 6 / CRAP 6.0. Architect summary:
  `docs/reviews/x-post-embed-summary.md`.

- **Mute persistence (2026-09-25):** the indexer's mute writes now persist.
  `psf-memo-indexer` writes mutes through
  `createEntityDb('mute', 'key', 'muteData')` (`POST /level/mute` with
  `{ key, muteData }`, key `${muterAddr}:${muteeHash160}`), but
  `psf-memo-db`'s `ENTITY_CONFIG` had no `mute` route, so every write 404'd and
  the `mutes` store stayed empty; `/mute/state`, `/mute/muted`, and the
  `/posts/recent?viewer=` mute filter therefore always saw no mutes and the
  client kept showing muted authors' posts. The fix registers the `mute` route
  against `mutesDb`. DB-only; no client or indexer code change. Spec:
  `psf-memo-db/specs/mute-persistence.feature`. Merged to `master` at `04275c4`
  (architect review commit `5de0ab1`; the later tip `04275c4` adds only the
  record and summary, so `docs/reviews/mute-persistence-verification.json` is
  valid for the merged tree). Independent acceptance check after merge: 6/6
  examples. `verify.sh db` pass 4/4 at `5de0ab1` (unit 458/0, property 71/0,
  acceptance 24 suites, lint ok); language mutation 3/3 on `crud-handlers.js`;
  soft Gherkin mutation 24 total / 8 killed / 16 intrinsic survivors; max CC 1 /
  CRAP 1.0. Architect summary: `docs/reviews/mute-persistence-summary.md`.
  Backfill of already-lost mutes was explicitly dropped (it needs a chain
  re-scan); re-mute from the client after deploy.

- **Profile post rendering (2026-09-25):** the `/profile/:addr` post cards now
  render post text through the shared `PostContent` renderer (wrapped in a pure
  `ProfilePostContent` seam), so image URLs render inline, YouTube links embed,
  other URLs become new-tab links, and surrounding text is preserved with a
  failed-image fallback to a plain link -- matching the recent feed. Client-only
  read rendering; no broadcast, no DB/indexer change. Spec:
  `psf-memo-client/specs/profile-post-rendering.feature`. Merged to `master` at
  `43b4f74` (architect review commit `5076f07`; the later tip `43b4f74` adds
  only the record and summary, so
  `docs/reviews/profile-post-rendering-verification.json` is valid for the
  merged tree). The merged feature's acceptance suite has 13 example executions
  across 5 scenarios. `verify.sh client` pass 5/5 at `5076f07` (unit 636/0,
  property 178/0, acceptance 42 suites, lint ok, build ok); language mutation 0
  mutable sites (`profile-post-content.js`); soft Gherkin mutation 35 total / 33
  killed / 2 intrinsic survivors (scenario 4); max CC 1 / CRAP 1.0. Architect
  summary: `docs/reviews/profile-post-rendering-summary.md`.

- **TX indexer handoff failure logging (2026-09-25):** each failed TX indexer
  handoff attempt now emits one diagnostic line naming the control endpoint
  (`TX_REST_API_IP` / `TX_REST_API_PORT`) and the error, and stating the
  automatic retry interval, so the previously silent failure is observable. The
  adapter owns the endpoint description (`endpoint()` -> `{ ip, port }`); the
  pure `TxIndexerHandoff` use case takes injected `log` and `endpoint()`, and
  the composition root wires `console.error`. Building on `tx-handoff-retry`;
  indexer-only, no client/DB change. Spec:
  `psf-memo-indexer/specs/tx-indexer-handoff-retry.feature` (scenario 5). Merged
  to `master` at `1411abe` (fast-forward from `7ce9597`; architect review commit
  `a9b1965`; the later `1411abe` commit is docs-only, so the record
  `docs/reviews/tx-handoff-retry-logging-verification.json` is valid for the
  merged tree). Independent acceptance check after merge: 11/11 example
  executions. `verify.sh indexer` pass 4/4 at `a9b1965` (unit 168/0, property
  19/0, acceptance 10 suites, lint ok); language mutation 15/15
  (`tx-indexer-handoff.js`), 3/3 (`tx-indexer.js`), no survivors; soft Gherkin
  mutation 33 total / 24 killed / 9 intrinsic survivors (scenario 5: 16/16
  killed); max CC 6 / CRAP 6.0. Architect summary:
  `docs/reviews/tx-handoff-retry-logging-summary.md`.

- **TX indexer handoff retry (2026-09-25):** the block indexer no longer
  `await`s a single `GET http://{TX_REST_API_IP}:{TX_REST_API_PORT}/tx-start`
  after IBD. A failed or unreachable TX indexer control endpoint (the observed
  `connect ETIMEDOUT 172.17.0.1:5455`) used to abort `start()` and stop block
  indexing. The handoff now runs through the pure `TxIndexerHandoff` use case
  (`psf-memo-indexer/src/use-cases/tx-indexer-handoff.js`) with injected
  `startTxIndexer` and `sleep`: it retries every `TX_INDEXER_HANDOFF_RETRY_MS`
  (default 10000) indefinitely, in the background, until the request succeeds,
  and never rejects into the block-indexing loop. `psf-memo-block-indexer.js`
  calls `startInBackground()`; each axios request is bounded by
  `TX_INDEXER_HANDOFF_TIMEOUT_MS` (default 10000). Indexer-only; no client or DB
  change. Spec: `psf-memo-indexer/specs/tx-indexer-handoff-retry.feature`.
  Merged to `master` at `20ed191` (fast-forward from `b778509`; architect review
  commit `0acf7a9`; the later `20ed191` commit adds the review docs and a
  one-line test lint cleanup, so the record
  `docs/reviews/tx-handoff-retry-verification.json` is valid for the merged
  tree). Independent acceptance check after merge: 9/9 example executions.
  `verify.sh indexer` pass 4/4 at `0acf7a9` (unit 164/0, property 18/0,
  acceptance 10 suites, lint ok); language mutation 12/12
  (`tx-indexer-handoff.js`), 3/3 (`tx-indexer.js`), 8/8 (`config/index.js`), no
  survivors; soft Gherkin mutation 32 total / 23 killed / 9 intrinsic
  survivors; max CC 6 / CRAP 6.0. Architect summary:
  `docs/reviews/tx-handoff-retry-summary.md`.

- **Profile recency via DB read API (2026-09-25):** set-profile establishment
  (`0x6d05`) no longer scans `addrPostHeights` across the REST boundary. When a
  set-profile arrives after the address has posted, the indexer asks
  psf-memo-db for the newest confirmed qualifying post through the new
  `GET /profile/newest-post/:addr` read API (use case
  `get-newest-qualifying-post`); psf-memo-db owns the qualifying rule (top-level
  post or topic message; replies and poll creations excluded; unconfirmed
  ignored; newest height then seen) and shares it with the backfill through
  `psf-memo-db/src/lib/qualifying-post.js`. The indexer's duplicate
  `addrPostHeights` scan was deleted and replaced by
  `psf-memo-indexer/src/adapters/newest-qualifying-post.js`. DB + indexer; no
  client change. Specs: `psf-memo-db/specs/newest-qualifying-post.feature` and
  `psf-memo-indexer/specs/profile-recency-indexing.feature` (scenarios 7-8).
  Merged to `master` at `81beada` (fast-forward from `440ab0b`; architect
  review commit `3a3c314`; the later `81beada` commit adds only the records and
  summary, so the records are valid for the merged tree). Independent acceptance
  check after merge: db 3/3, indexer 20/20. Records:
  `docs/reviews/profile-recency-db-read-verification.json` (db) and
  `docs/reviews/profile-recency-db-read-indexer-verification.json`. Architect
  summary: `docs/reviews/profile-recency-db-read-summary.md`.

- **Profile token name tooltip (2026-09-24):** the `/profile/:addr` token icons
  now load in two phases. Phase one lists the profile's SLP tokens and renders
  an icon per token immediately, with the token ID as the native tooltip and a
  jdenticon placeholder. Phase two retrieves each token's token data (genesis
  record + IPFS mutable-data record) in one `getTokenData` call, then rebuilds
  the icons: the tooltip becomes the token's genesis name and the mutable-data
  image resolves. A token whose genesis record has no name, or whose token data
  cannot be retrieved, keeps the token-ID tooltip and its jdenticon. The
  controller exposes `loadTokenIcons()`/`loadTokenData()` and notifies an
  injected `onTokenIconsChange` listener so the React shell updates the
  sidebar; a destroyed page does not notify. The shared
  `psf-memo-client/src/services/token-mutable-data.js` now also returns the
  genesis name. Client-only; no Memo broadcast, no DB/indexer change. Spec:
  `psf-memo-client/specs/profile-token-icons.feature` (scenarios 4, 5, 11, 12).
  Merged to `master` at `03ad934` (fast-forward; architect review commit
  `79cf584`; the later tip `03ad934` adds only the record and summary, so the
  record `docs/reviews/profile-token-name-tooltip-verification.json` is valid
  for the merged tree). Independent acceptance check after merge: 25/25 example
  executions. `verify.sh client` pass 5/5 at `79cf584` (unit 629/0, property
  172/0, acceptance 41 suites, lint ok, build ok); language mutation 61 killed
  / 0 survived (`profile-page.js` 50, `token-mutable-data.js` 8,
  `profile-token-icons.js` 3); soft Gherkin mutation 28/28 killed; max CC 6 /
  CRAP 6.0. Architect summary:
  `docs/reviews/profile-token-name-tooltip-summary.md`.

- **Profile token icons (2026-09-23):** the `/profile/:addr` sidebar now shows
  a row of small (30 px) SLP token icons below the Follow/Mute controls for the
  SLP tokens held by that profile address. Each icon prefers the token's
  mutable-data image (an http `fullSizedUrl` over the `tokenIcon`) and
  otherwise renders a jdenticon keyed on the token id; icons carry the token id
  as a native tooltip (later replaced by the genesis name; see the token name
  tooltip entry), expose the ticker as an accessible label, link to
  `https://explorer.tokentiger.com/?tokenid=<tokenId>` in a new tab, and wrap
  to multiple rows. A profile with no tokens, or a token lookup that fails,
  shows no icons and does not error. The shared
  `psf-memo-client/src/services/token-mutable-data.js` resolves each token's
  `ipfs://` mutable data via `getTokenData` then `cid2json` (the same path as
  `/slp-tokens`, which now shares the helper); `ProfilePage` loads tokens
  through an injected `tokenSource`, `profile-token-icons.js` is the pure view
  model, and `src/components/app-body/profile/profile-token-icons.js` is the
  plain-`React.createElement` render seam shared with the Node acceptance
  adapter (`acceptance/lib/render-profile-token-icons.js`). Client-only; no
  Memo broadcast, no DB/indexer change. Spec:
  `psf-memo-client/specs/profile-token-icons.feature`. Merged to `master` at
  `2e6de9b` for the initial feature and at `97067aa` for the mutable-data fetch
  fix (fast-forwards; review commits `6e76766` and `073b1e7`; the later tip
  commits add only records/summaries, so records
  `docs/reviews/profile-token-icons-verification.json` and
  `docs/reviews/profile-token-icons-fetch-verification.json` are valid for the
  merged trees). Independent acceptance check after each merge: 17/17 example
  executions. Final `verify.sh client` pass 5/5 at `073b1e7` (unit 618/0,
  property 168/0, acceptance 41 suites, lint ok, build ok); language mutation
  50 killed / 0 survived on the fix (`token-mutable-data.js` 7,
  `profile-token-icons.js` 2, `profile-page.js` 41); soft Gherkin mutation
  18/18 killed; max CC 6 / CRAP 6.0. Architect summaries:
  `docs/reviews/profile-token-icons-summary.md`,
  `docs/reviews/profile-token-icons-fetch-summary.md`.

- **Profile address copy (2026-09-22):** the `/profile/:addr` sidebar address
  is now a button. Clicking it writes the profile's BCH cash address to the
  system clipboard and shows a transient "Copied to clipboard" confirmation
  (`role=status`, `aria-live=polite`) that disappears after 1.5s. It mirrors
  the post-txid copy-confirmation UX on feed cards. The confirmation state
  machine lives in the pure `ProfilePage` controller (`copyAddress`,
  `isShowingAddressCopyConfirmation`, `addressCopyTimeoutElapsed`, `destroy`)
  with an injected clipboard write and timer; `profile-address.js` is a
  presentational plain-`React.createElement` component shared with the Node
  acceptance adapter (`acceptance/lib/render-profile-address.js`). Client-only;
  no Memo broadcast, no DB/indexer change. Spec:
  `psf-memo-client/specs/profile-address-copy.feature`. Merged to `master` at
  `d9a6371` (fast-forward; architect review commit `3bccb41`; the later
  `d9a6371` commit adds only the record and summary, so the record
  `docs/reviews/profile-address-copy-verification.json` is valid for the merged
  tree). Independent acceptance check after merge: 6/6 example executions.
  `verify.sh client` pass 5/5 at `3bccb41` (unit 579/0, property 153/0,
  acceptance 40 suites, lint ok, build ok); language mutation 37 killed / 0
  survived; soft Gherkin mutation 4/0 with 4 intrinsic example-address case
  survivors; max CC 4 / CRAP 4.0. Architect summary:
  `docs/reviews/profile-address-copy-summary.md`.

- **Recent profile follow confirmation (2026-09-22):** clicking a
  `/profile/recent` Follow/Unfollow button now opens a confirmation modal first:
  "Are you sure you want to follow <display name>?" (or "unfollow") with Yes
  and No buttons. Nothing is broadcast until Yes; No closes the modal without
  broadcasting and leaves the row unchanged; Yes continues to the existing
  loading -> success (message + txid + `bch.loping.net` explorer link) or red
  failure flow. The display name is the profile's name, or the truncated
  address when it has none, matching the Account column (both derive it from
  `accountDisplayName`). Client-only; no DB/indexer change. The confirmation
  state machine lives in `RecentProfilesPage` (`requestFollow` /
  `getFollowConfirmMessage` / `confirmFollow` / `cancelFollow`, `pendingFollow`)
  with a pure `recent-profile-follow-confirm.js` component. Spec:
  `psf-memo-client/specs/recent-profile-follow.feature` (scenarios 5-11). Merged
  to `master` at `3045520` (architect tip `bd86490`; review commit `20b13f2`;
  the later `bd86490`/`3045520` commits are docs-only, so the record
  `docs/reviews/recent-profile-follow-confirm-verification.json` is valid for
  the merged tree). Independent acceptance check after merge: 13/13 example
  executions. `verify.sh client` pass 5/5 at `20b13f2` (unit 563/0, property
  146/0, acceptance 39 suites, lint ok, build ok); language mutation 18 killed /
  0 survived; soft Gherkin mutation 13/11 killed with 2 intrinsic survivors.
  Architect summary:
  `docs/reviews/recent-profile-follow-confirm-summary.md`.

- **Recent profile follow controls (2026-09-22):** the `/profile/recent`
  table's right-most TXID column is replaced by a **Follow** column. Each row
  shows a Follow/Unfollow button for the viewer: **Follow** when the viewer does
  not follow that profile, **Unfollow** when they do, and a disabled Follow
  button on the viewer's own row. Clicking the button opens a result modal that
  shows a loading indicator (react-bootstrap `Spinner`) while the Memo follow
  (`0x6d06`) or unfollow (`0x6d07`) transaction is prepared and broadcast, then
  the success message plus txid and a `bch.loping.net` block-explorer link, or
  the broadcast error in red with the row label unchanged. The modal stays open
  until dismissed. Client-only: it reads the viewer's follow state from
  `GET /follow/following/:addr` (the same source the feed tabs use) and
  broadcasts through the existing `MemoFollow`; no DB/indexer change. The new
  pure leaf `psf-memo-client/src/services/broadcast-result.js` now owns the
  follow/mute broadcast message strings, shared with `ProfilePage`. Spec:
  `psf-memo-client/specs/recent-profile-follow.feature` (the scenario-5 header
  assertion in `psf-memo-client/specs/recent-profile-display.feature` was also
  updated TXID -> Follow). Merged to `master` at `c37cf61` (fast-forward; review
  commit `c247680`; the later `c37cf61` commit is docs-only, so the record
  `docs/reviews/recent-profile-follow-verification.json` is valid for the merged
  tree). Independent acceptance check after merge: 11/11 example executions.
  `verify.sh client` pass 5/5 at `c247680` (unit 549/0, property 138/0,
  acceptance 39 suites, lint ok, build ok); language mutation 55 killed / 0
  survived; soft Gherkin mutation 10/7 killed with 3 intrinsic survivors. The
  tool-written Gherkin mutation manifests/stamps in the two features are
  committed as-is. Architect summary:
  `docs/reviews/recent-profile-follow-summary.md`.

- **Profile ordering by last post (2026-09-20):** `/profile/recent` now lists
  only profiles that have posted, ordered by their most recent qualifying post
  (top-level `0x6d02` or topic message `0x6d0c`; replies `0x6d03` and poll
  creations `0x6d10` do not qualify) instead of their most recent profile
  update. Profiles that have never posted are dropped. Ordering is by last
  post's block height descending, then seen descending, then address
  ascending, considering confirmed blocks only (the mempool indexer records no
  recency; the backfill ignores entries above `status.chainBlockHeight`). The
  Block and Seen columns now report the last post's block height and timestamp
  rather than the set-profile transaction's. The indexer maintains a
  `profileRecency` store (mirroring `topicRecency`), and
  `util/profiles/backfill-profile-recency.js` rebuilds it from existing data
  idempotently. Indexer + DB (the client renders the returned block/seen
  unchanged). Specs: `psf-memo-indexer/specs/profile-recency-indexing.feature`,
  `psf-memo-db/specs/recent-profile-ordering.feature`,
  `psf-memo-db/specs/backfill-profile-recency.feature`. Merged to `master` at
  `79bb918` (fast-forward; review commit `ace7038`; the later `79bb918` commit
  adds only the records and summary, so the records are valid for the merged
  tree). Records: `docs/reviews/profile-last-post-verification.json` (indexer)
  and `docs/reviews/profile-last-post-db-verification.json` (db). Independent
  acceptance check after merge: indexer 20/20 examples, db
  recent-profile-ordering 9/9, backfill 5/5, recent-profile-identity 3/3.
  Architect summary: `docs/reviews/profile-last-post-summary.md`. Accepted
  tradeoff: `profileRecency` is address-keyed for idempotent upsert, so the read
  scans and sorts the whole recency index in memory (O(P log P)); the spec only
  forbids scanning `addrPostHeights` or sorting every profile.

- **Recent profile identity (2026-09-20):** `/profile/recent` now shows a
  leftmost **Account** column with each profile's display name and avatar. The
  DB joins the `names` (newest `0x6d01`) and `profilePics` (newest `0x6d0a`)
  stores into each `/profile/recent` record as `name` / `profilePicUrl` (null
  when absent) without changing order or pagination; the client renders the
  name and avatar in one cell, both linking to `/profile/<addr>`, falling back
  to the truncated address (no name) and a jdenticon (no avatar). Client + DB.
  Specs: `psf-memo-client/specs/recent-profile-display.feature`,
  `psf-memo-db/specs/recent-profile-identity.feature`. Merged to `master` at
  `5fce1405d4` (review commit `7973e2d`; records
  `docs/reviews/recent-profile-identity-verification.json` (client) and
  `docs/reviews/recent-profile-identity-db-verification.json`; the later
  `5fce140` commit is docs-only, so the records are valid for the merged tree).
  Independent acceptance check after merge: client 7/7, db 3/3. Soft Gherkin
  mutation 9/9 (db) and 10/10 (client) killed; language mutation 12 killed / 0
  survived; architect summary
  `docs/reviews/recent-profile-identity-summary.md`.

- **Feed tabs (2026-09-20):** the Following feed is merged into the
  `/posts/recent` posts page as a row of two mode buttons ("Recent" /
  "Following"). On first load the page asks `GET /follow/following/:addr` and
  selects Following when the viewer's address follows at least one account,
  Recent when it follows no one; the viewer can switch tabs at any time and
  switching resets to the first page. The `/posts/following` route and its
  navbar item are removed, so the Following feed is reached only through the
  Following button. A new pure `FeedTabsPage` service
  (`psf-memo-client/src/services/feed-tabs-page.js`) composes the existing
  `RecentFeedPage` and `FollowingFeedPage` controllers behind injected
  `memoDb`/`wallet`; the React shell reads the controller `getState()` snapshot.
  Client-only read feature. Spec:
  `psf-memo-client/specs/feed-tabs.feature`. Merged to `master` at `2d1755a03d`
  (fast-forward; review commit `e4bda31256`; record
  `docs/reviews/feed-tabs-verification.json`; the later `2d1755a` commit is
  docs-only, so the record is valid for the merged tree). Independent acceptance
  check after merge: feed-tabs 12/12 scenario examples. Soft Gherkin mutation
  42/0 (all intrinsic example-value case substitutions); language mutation 22/22
  killed; architect summary `docs/reviews/feed-tabs-summary.md`.

- **Following feed cap (2026-09-20):** `GET /posts/following/:addr` no longer
  full-scans the global `postHeights` index to compute `pagination.total` (the
  live total reached 10942). The scan now stops after `offset + limit + 500`
  **eligible** followed posts and reports `total = min(eligible, 500)`, and
  reply detection uses per-candidate `isReply` point lookups instead of
  iterating the whole `postParents` store. The cap counts eligible followed
  posts, not raw index entries (followed posts are sparse). DB-only; the client
  renders `pagination.total` unchanged, so the heading now reads
  "Showing 1–50 of 500". Spec:
  `psf-memo-db/specs/following-feed-performance.feature`. Merged to `master` at
  `de3f1c8` (review commit `b7c2056`; record
  `docs/reviews/following-feed-cap-verification.json`; the later `de3f1c8`
  commit is docs-only, so the record is valid for the merged tree). Independent
  acceptance check after merge: db 3/3. Soft Gherkin mutation 17/14 (3 intrinsic
  survivors); language mutation 40/40 killed; architect summary
  `docs/reviews/following-feed-cap-summary.md`.

- **Mute broadcast result (2026-09-18):** the profile page now shows a
  broadcast result modal after a mute (`0x6d16`) or unmute (`0x6d17`) is
  broadcast. On success the modal shows a broadcast success message, the mute
  transaction id, and a `bch.loping.net` block-explorer link that opens in a
  new tab; on failure it shows the real broadcast error message. A successful
  mute still flips the button to Unmute and a successful unmute flips it back
  to Mute; a failed broadcast leaves the button unchanged. The modal stays open
  until dismissed, and dismissing it closes the modal without navigating. Pure
  result state lives in `ProfilePage` (`lastMuteResult`,
  `getMuteBroadcastMessage`, `getMuteResultError`, `dismissMuteResult`); the
  presentational `MuteResult` and shared `ExplorerTxLink` components are plain
  `React.createElement`, shared with the Node acceptance adapter
  (`acceptance/lib/render-mute-result.js`). Client-only. Spec:
  `psf-memo-client/specs/mute-broadcast-result.feature`. Merged to `master` at
  `eaaed8e5ea` (review commit `a7d9ca6299`; record
  `docs/reviews/mute-broadcast-result-verification.json`; the later `eaaed8e`
  commit is docs-only, so the record is valid for the merged tree). Independent
  acceptance check: client 4/4. Soft Gherkin mutation 5/5 intrinsic survivors;
  language mutation 31/31 killed. Architect summary:
  `docs/reviews/mute-broadcast-result-summary.md`.

- **Notification entry display (2026-09-18):** each `/notifications` entry now
  shows the actor's Memo display name and avatar instead of only the raw BCH
  address, resolved client-side from the name and profile-picture records. The
  avatar and display name link to `/profile/<addr>`, the full address renders as
  small non-emphasised plain text, and like/reply entries carry a "View Post"
  link that opens the referenced original post's thread modal. Follow entries
  have no post link. Fallbacks: no display name shows the truncated address, no
  avatar (or a failed profile lookup) shows an identicon. Client-only. Spec:
  `psf-memo-client/specs/notification-entry-display.feature`. Merged to `master`
  at `a1e4a4f95f` (review commit `bbbf4adcd7`; record
  `docs/reviews/notification-entry-display-verification.json`; the later
  `a1e4a4f` commit is docs-only, so the record is valid for the merged tree).
  Independent acceptance check: client 16/16. Soft Gherkin mutation 36/11 (all
  survivors intrinsic example-value case mutations); language mutation 20/20
  killed. Architect summary:
  `docs/reviews/notification-entry-display-summary.md`.

- **Notifications query performance (2026-09-18):** `GET /posts/notifications/:addr`
  is now bounded to the viewer's activity inside a configurable block window
  (`NOTIFICATION_BLOCK_WINDOW`, default 25000; cutoff
  `status.chainBlockHeight - window`) instead of full-scanning `likes`,
  `postChildren`, and `follows`. The viewer's posts are read from
  `addrPostHeights` within the window, likes and replies are prefix-scanned
  from `postLikes`/`postChildren` per post, and follows come from a new
  followee-keyed, height-ordered `followeeHeights` index written by the indexer
  (`/level/followeeheight` route, `backfill-followee-index` utility).
  `pagination.total` counts only in-window notifications, and because a
  notification is drawn from the viewer's content inside the window, an
  interaction with a post older than the window is not returned even when the
  interaction itself is recent. Indexer + DB. Specs:
  `psf-memo-indexer/specs/followee-heights-indexing.feature`,
  `psf-memo-db/specs/backfill-followee-index.feature`,
  `psf-memo-db/specs/notifications-query-performance.feature`. Merged to
  `master` at `a1eb548688` (review commit `c9728cc301`; records
  `docs/reviews/notifications-query-performance-verification.json` (db) and
  `docs/reviews/notifications-query-performance-indexer-verification.json`; the
  later `a1eb548` commit is docs-only, so the records are valid for the merged
  tree). Developer documentation captured in
  `psf-memo-indexer/dev-docs/psf-memo-db.md` (new `followeeHeights` store,
  `NOTIFICATION_BLOCK_WINDOW` config, route notes) and
  `psf-memo-indexer/dev-docs/design-decisions-and-tradeoffs.md` (why per-object
  scans plus a block window replace the full-store scans); architect summary
  `docs/reviews/notifications-query-performance-summary.md`. Independent
  acceptance check after merge: db notifications 10/10, db backfill 4/4,
  indexer 4/4.

- **Topics table layout (2026-09-18):** the topics page now renders topics in
  a react-bootstrap `Table`, so the four columns line up. A pure
  `buildTopicsTable` view model (`psf-memo-client/src/services/topics-table.js`)
  supplies the header labels (`Topic`, `Most recent post`, `Posts`,
  `Followers`), each row's cells in fixed order (`#room`, relative time,
  `N posts`, `N followers`), the topic-feed link, and the `table-responsive`
  horizontal-scroll wrapper; the React `Topics` component is a thin shell over
  it. Client-only rendering. Spec:
  `psf-memo-client/specs/topics-table-layout.feature`. Merged to `master` at
  `1e58b5b` (review commit `d1f0f76`; record
  `docs/reviews/topics-table-layout-verification.json`). Independent acceptance
  check: client 5/5. Soft Gherkin mutation 16/16 killed; language mutation 2/2
  killed.

- **Topic metadata columns (2026-09-18):** the `/topics` page now shows four
  columns — topic name, time since the most recent post, post count, and
  follower count. The indexer writes `lastSeen` (epoch-ms of the newest room
  post; 0 for follow-only rooms) and `followerCount` (active follows) into each
  `topicSummaries` record, idempotently and without disturbing the room's post
  metadata; `GET /topics` returns both; the room backfill rebuilds both from
  `rooms`; and the client formats `No posts` / `Less than an hour ago` /
  `N hours ago` / `N days ago` from `lastSeen`. Client + indexer + DB. Specs:
  `psf-memo-indexer/specs/topic-metadata-indexing.feature`,
  `psf-memo-db/specs/topic-metadata.feature`,
  `psf-memo-client/specs/topic-metadata-columns.feature`. Merged to `master`
  at `af54b0e` (review commit `3f05488`; records
  `docs/reviews/topic-metadata-verification.json` (indexer),
  `-db-verification.json`, `-client-verification.json`). Independent acceptance
  check: indexer 12/12, db 14/14, client 9/9.

- **Topic recency ordering and pagination (2026-09-17):** `GET /topics` now
  orders topics by each room's most recent post and paginates without scanning
  the whole `rooms` store. The indexer maintains two new stores:
  `topicSummaries` (one record per room with `postCount` and `lastHeight`) and
  `topicRecency` (one record per room at its latest post height; follow-only
  rooms at height 0), both idempotent. `GET /topics` gained `limit`/`offset`
  and returns `pagination`; rooms with posts come first by most recent post
  height descending, ties by room name ascending, follow-only rooms last. A
  topic backfill utility (`util/room/backfill-topic-indexes.js`) builds both
  indexes from existing `rooms`. The client topics page loads 50 per page with
  Previous/Next. Client + indexer + DB. Specs:
  `psf-memo-indexer/specs/topic-recency-indexing.feature`,
  `psf-memo-db/specs/backfill-topic-indexes.feature`,
  `psf-memo-db/specs/topic-pagination.feature`,
  `psf-memo-client/specs/topic-pagination.feature`. Merged to `master` at
  `090f41f` (review commit `0e8f8f0`; records
  `docs/reviews/topic-recency-pagination-verification.json` (indexer),
  `-client-verification.json`, and `-db-verification.json`).

- **Memo multi-push encoding (2026-09-17):** fixed the payload layout for
  every multi-field Memo action. `minimal-slp-wallet`'s
  `sendOpReturn(msg, prefix)` can only emit two OP_RETURN pushes
  (`[prefix, msg]`), so the client had been concatenating all fields into one
  push. The indexer and memo.cash expect one push per protocol field, so the
  indexer logged `invalid reply push data count 2` and dropped every reply,
  topic message, add-poll-option, and poll vote; create-poll was accepted by
  our indexer only because it tolerates the combined form. Added the
  browser-safe `psf-memo-client/src/services/memo-multipush.js` adapter
  (`attachMultiPushOpReturn`/`broadcastMultiPush`) and switched the five action
  services to broadcast field arrays: reply `[6d03, txid(32 LE), text]`,
  topic message `[6d0c, topic, text]`, add-poll-option `[6d13, txid(32 LE),
  option]`, poll vote `[6d14, txid(32 LE), comment]`, and create-poll `[6d10,
  poll_type, option_count, question]`. Client-only. Spec:
  `psf-memo-client/specs/memo-multipush-encoding.feature`. Merged to `master`
  at `4dedc51` (review commit `fac0173`; record
  `docs/reviews/memo-multipush-encoding-verification.json`, 425 unit / 85
  property / 31 acceptance suites / lint / build).

- **Txid wire encoding repair (2026-09-16):** fixed the endianness bug that
  broke every like, reply, poll option, and poll vote broadcast by
  psf-memo-client. The client embedded the referenced txid in big-endian
  display order while the indexer expected little-endian wire order
  (`txHashFromPush` reverses it), so the indexer stored a byte-reversed
  reference that never matched the post/poll: like counts read 0, replies
  vanished from threads, and poll options/votes detached. `hex.js` now owns
  `txidToWireBytes`; `buildTxidTextPayload` reverses the txid, and the
  reply-only `buildReplyPayload` was replaced by that shared helper. Added
  `psf-memo-db/src/lib/repair-txid-encoding.js`
  (`correctReference`/`repairTxidEncoding`) and the
  `psf-memo-db/util/txid/repair-txid-encoding.js` CLI to rewrite existing
  reversed references in `likes`/`postLikes`, `postParents`/`postChildren`,
  `pollOptions`, and `pollVotes`, using `posts`/`polls` existence to keep the
  correct orientation, leave unknown targets alone, and stay idempotent. The
  20-byte hash160 follow/mute path is unchanged. Client + DB. Specs:
  `psf-memo-client/specs/txid-wire-encoding.feature` and
  `psf-memo-db/specs/repair-txid-encoding.feature`. Merged to `master` at
  `8f24ac0` (review commit `a2229f7`; records
  `docs/reviews/txid-wire-encoding-verification.json` and
  `docs/reviews/txid-wire-encoding-db-verification.json`).

- **Like broadcast result modal (2026-09-16):** after a successful like (with
  or without a tip), the like/tip modal no longer auto-closes. It now shows a
  broadcast success message, the like transaction id, and a block-explorer link
  to the transaction, mirroring the New Post result modal. The like count and
  filled heart still update, and the user must manually dismiss the result to
  close the modal. The explorer URL was extracted to a shared
  `psf-memo-client/src/services/block-explorer.js` used by the New Post modal,
  the post options menu, and the like result. Client-only behavior. Spec:
  `psf-memo-client/specs/like-broadcast-result.feature`. Merged to `master` at
  `f92f596`, task `like-result-modal`.

- **Post options menu (2026-09-16):** every post card now has a working
  three-dots "Post options" menu. The menu is hidden until the button is
  clicked; its first (top) item is "See on block explorer", linking to the
  post transaction at `https://bch.loping.net/tx/<txid>` in a new tab. Clicking
  the button again, clicking outside the menu, or pressing Escape closes the
  menu, and ArrowDown moves focus to the first item. One shared
  `PostOptionsMenu` component is used by the recent/following/topic feeds, the
  thread modal, and the profile post card; pure behavior lives in
  `psf-memo-client/src/services/post-options.js`. Client-only rendering
  feature. Spec: `psf-memo-client/specs/post-options-menu.feature`. Merged to
  `master` at `fdb6efc`.

- **Feed total cap raised to 500 (2026-09-16):** `GET /posts/recent` now caps
  its total scan at 500 eligible top-level posts instead of 10 (`TOTAL_SCAN_CAP`
  in `psf-memo-db/src/adapters/post-query.js`). Corpora with up to 500 eligible
  top-level posts report an exact `pagination.total`; larger corpora report
  `total = 500` and read at most `offset + limit + 500` postHeights entries.
  Adds DB acceptance fixture `many-top-level-posts` (510 posts) and
  `recent-feed-cap` property tests. DB-only behavior change. Specs:
  `psf-memo-db/specs/feed-total-cap.feature` and
  `psf-memo-db/specs/feed-query-performance.feature`. Merged to `master` at
  `5e62d1e`.
- **Post image rendering (2026-09-16):** post text now renders inline images for
  URLs whose path ends in a common image extension (`.jpg`, `.jpeg`, `.png`,
  `.gif`, `.webp`, `.bmp`; case-insensitive; query string and fragment ignored;
  SVG excluded). The image renders inside an anchor that opens the original URL
  in a new tab, with the URL's filename as `alt` text; the URL is not shown as
  text and surrounding text is preserved. Non-image URLs keep the plain-link
  behavior, and an image that fails to load falls back to a plain link. Pure
  helpers `isImageUrl`/`imageAltText` in
  `psf-memo-client/src/services/post-links.js`, a pure failed-image state
  transition in `src/services/failed-images.js`, and a presentational
  `PostImage`/`PostContent` renderer. Client-only rendering feature. Spec:
  `psf-memo-client/specs/post-image-rendering.feature`. Merged to `master` at
  `c2bfbc3`.
- **Post link formatting (2026-09-16):** post text now auto-links `http://` and
  `https://` URLs and bare domains such as `memo.fullstackcash.net`. Explicit
  URLs keep their scheme; bare domains are linked with `https://` while their
  visible text stays as written. Links render as anchors with `target="_blank"`;
  embeddable YouTube links keep embedding instead of becoming plain links. Pure
  parser `psf-memo-client/src/services/post-links.js` (`parsePostLinks`) feeds
  the shared `PostContent` renderer. Client-only rendering feature. Spec:
  `psf-memo-client/specs/post-link-formatting.feature`. Merged to `master` at
  `b63792f`.
- **Thread query performance (2026-09-15):** `GET /posts/:txid/thread` now does
  work proportional to the thread instead of the whole database. Like counts are
  computed only for the thread's txids via `countLikesForTxids` (the global
  `buildLikeCountMap` was removed), and child lookups prefix-scan `postChildren`
  per parent through a new `PostQuery.listChildTxids` seam instead of walking the
  whole store once per node. Spec:
  `psf-memo-db/specs/thread-query-performance.feature`. Merged to `master` at
  `c8ceb82`.
- **Account avatar display (2026-09-05):** the `/account` page now renders the
  avatar image when an avatar URL is set, instead of only showing the URL as
  text. A pure `AvatarImage` component (`src/components/account/avatar-image.js`,
  plain `React.createElement` so the browser build and the Node acceptance
  adapter share it) renders the `<img>`; the `AccountPage` service exposes
  `getDisplayAvatarUrl` / `hasAvatarImage` / `getAvatarImageUrl` as the testable
  seam. When no avatar URL is set, the page shows "No avatar URL set".
  Client-only rendering feature. Spec:
  `psf-memo-client/specs/account-avatar-display.feature`. Merged to `master` at
  `5afaa64`.
- **Mute feed filtering (2026-09-04):** muting a profile now hides that profile's
  content from the viewer's recent feed, topic feed, search results, and
  notifications. The psf-memo-db API filters server-side given the viewer's
  address (passed by the client as a `viewer` query param); filtering is not
  optimistic — a mute takes effect once the mute tx is indexed, and unmuting
  restores content once indexed. Shared `loadMutedAddrs`/`isMutedPost` helper in
  `psf-memo-db/src/adapters/lib/muted-posts.js` deduplicates the per-adapter
  lookup. Spec: `psf-memo-client/specs/mute-feed-filtering.feature`. Merged to
  `master` at `3992395`.
- **Binary hash160 broadcast payloads (2026-09-04):** client follow/unfollow
  and mute/unmute now broadcast the target's raw 20-byte hash160 as the
  OP_RETURN payload, built as a browser-safe `Uint8Array` from the `hexToBytes`
  helper instead of Node's `Buffer` global (which crashed in a real browser
  with `Buffer is not defined`). Follow/mute/unfollow/unmute were consolidated
  onto a shared `MemoStateAction` base. Spec:
  `psf-memo-client/specs/binary-payload-broadcast.feature`. Merged to `master`
  at `984e691`.
- **Page size 50 (2026-09-04):** every paginated page in the client now requests 50
  items per page instead of 100 to cut payload size and improve page load times.
  Covers the recent feed, following feed, topic feed, notifications, search,
  profile, and recent profiles pages. Pagination Previous/Next controls were also
  added to the search, profile, and recent-profiles pages (which previously had
  none), and the paginated page controllers were refactored onto a shared
  `PaginatedPage` base plus `RecentProfilesPage`. Spec:
  `psf-memo-client/specs/page-size.feature`. Merged to `master` at `cfe6711`.
- **YouTube embed (2026-09-04):** posts whose text contains a YouTube link
  (`youtube.com/watch?v=…` or `youtu.be/…`) render an embedded player instead
  of the raw URL; surrounding text is preserved; non-embeddable URLs stay plain
  text. Client-only rendering feature. Spec:
  `psf-memo-client/specs/youtube-embed.feature`. Merged to `master` at `b63019c`.
- **Feed query performance (2026-09-05):** `GET /posts/recent` no longer does
  two full scans per request. Reply counts are computed per returned post
  (`countRepliesForTxids`) instead of a global `buildReplyCountMap()` scan, and
  the `total`/`hasMore` computation is a capped scan of the last
  `TOTAL_SCAN_CAP` (10) top-level posts instead of walking the whole
  `postHeights` index. `list-recent-posts.js` now uses
  `scanRecentPostTxidsAndCount()` which returns the page txids plus a capped
  total in one bounded scan. Spec:
  `psf-memo-db/specs/feed-query-performance.feature`. Merged to `master` at
  `2bcc965`.

---

## Research notes

- **Protocol reference**: `https://memo.sv/protocol` (Wayback Machine snapshot
  2025-12-15). It lists action bytes, payload shapes, and byte limits. The page
  is on the BSV fork (`memo.sv`) but the action codes match the BCH
  `memo.cash` implementation.
- **memo.cash access**: the live site is behind Cloudflare. Direct `curl` and
  headless Firefox login attempts from this environment were blocked, so the
  roadmap was derived from the protocol spec plus an audit of the existing
  mono-repo code.

---

## Architecture constraints

- **Identity/auth**: the auto-generated HD wallet (12-word mnemonic) persisted
  in browser Local Storage by the existing React app is the Memo identity.
- **Write path**: broadcasting is done via `minimal-slp-wallet.sendOpReturn()`.
  - Correct public API: `await wallet.sendOpReturn(message, prefix, bchOutput)`.
  - `prefix = '6d02'` posts a memo; other action bytes replace `02`.
  - Binary payloads (txid 32 bytes, address hash 20 bytes, topic/poll text)
    must be encoded correctly.
- **Read path**: `psf-memo-db` REST API (`/posts/*`, `/profile/*`, `/level/*`).
  API changes are in scope for specs.
- **Indexer path**: `psf-memo-indexer` scans blocks and mempool for Memo
  `OP_RETURN` outputs and writes structured records to `psf-memo-db`.
- The write path (broadcast), indexer path, and read path (DB) are
  asynchronous: a broadcasted action becomes visible only after confirmation +
  indexing.

---

## Memo protocol action codes

Reference: https://memo.sv/protocol (Wayback snapshot 2025-12-15)

| Action byte | Meaning | Payload |
|-------------|---------|---------|
| `0x6d01` | Set name | `name` (≤ 217 bytes) |
| `0x6d02` | Post memo | `message` (≤ 217 bytes) |
| `0x6d03` | Reply to memo | `txhash` (32 bytes) + `message` (≤ 184 bytes) |
| `0x6d04` | Like / tip memo | `txhash` (32 bytes) |
| `0x6d05` | Set profile text | `message` (≤ 217 bytes) |
| `0x6d06` | Follow user | `address` (20 bytes) |
| `0x6d07` | Unfollow user | `address` (20 bytes) |
| `0x6d0a` | Set profile picture | `url` (≤ 217 bytes) |
| `0x6d0b` | Repost memo | `txhash` (32 bytes) + `message` (≤ 184 bytes) — *planned* |
| `0x6d0c` | Post topic message | `topic_name` + `message` (combined ≤ 214 bytes) |
| `0x6d0d` | Topic follow | `topic_name` |
| `0x6d0e` | Topic unfollow | `topic_name` |
| `0x6d10` | Create poll | `poll_type` (1) + `option_count` (1) + `question` (≤ 209 bytes) |
| `0x6d13` | Add poll option | `poll_txhash` (32) + `option` (≤ 184 bytes) |
| `0x6d14` | Poll vote | `poll_txhash` (32) + `comment` (≤ 184 bytes) |
| `0x6d16` | Mute user | `address` (20 bytes) |
| `0x6d17` | Unmute user | `address` (20 bytes) |
| `0x6d24` | Send money | `address` (20) + `message` (≤ 194 bytes) |
| `0x6d30` | Sell tokens | MIP-0009 token exchange |
| `0x6d31` | Token buy offer | MIP-0009 token exchange |
| `0x6d32` | Attach token sale signature | MIP-0009 token exchange |
| `0x6d35` | Pin token post | MIP-0009 token exchange — *planned* |

---

## Component legend

| Code | Component | Typical changes |
|------|-----------|-----------------|
| C | `psf-memo-client` | React components, services, pages, unit/acceptance tests |
| I | `psf-memo-indexer` | Memo action handler, parser support, filter logic |
| D | `psf-memo-db` | LevelDB store, REST route, query adapter, tests |

---

## Process & tooling improvements

- **2026-09-16 process-efficiency pass:** architect always notifies the specifier;
  acceptance LevelDB temp dirs are cleaned up; the handoff daemon self-heals;
  APS is single-sourced at `tmp/aps`; acceptance generation is incremental;
  `verify.sh` emits machine-readable verification records; `mutate-file.sh`
  guards differential under-selection; `clean-builds.sh` keeps worker copies
  small; handoffs are blocked on a dirty tree. See `docs/process-improvements.md`
  for the what/why, commits, and verification evidence.

## Next up: TBD

Active work is the `psf-memo-cli` Memo-protocol backlog:
`psf-memo-cli/dev-docs/feature-backlog.md`. The foundation (F1–F6), all read
commands (R1–R16), and the shipped writes (W1–W10; W11–W13 dropped by user
decision) are done, and the full cross-cutting series X1–X7 (command reference
docs, error surfacing, secret hygiene, read-only safety, quality audit,
pagination fidelity, async visibility) is now complete. W14–W16 remain deferred
until the indexer/DB handle those action bytes. The open direction is the client
front-end backlog — front-end improvements to `psf-memo-client` (UI/UX polish,
accessibility, performance, responsiveness, state handling, error surfacing).
Ask the user for the next feature.

## Notes for future cycles

- Broadcast result (txid) is returned immediately; the action appears in the
  feed only after block confirmation + indexing. Specs must reflect this async
  visibility.
- Mutations/specs are Gherkin feature files under per-component `specs/` in
  the format defined by github.com/unclebob/Acceptance-Pipeline-Specification.
- Root `specs/` contains this backlog and cross-component architecture notes.
