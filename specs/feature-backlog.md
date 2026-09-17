# psf-memo — Feature Backlog

**Status**: DRAFT — refreshed 2026-09-03.
**Owner**: specifier.
**Last updated**: 2026-09-17

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

## Recently completed

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

Current direction is front-end improvements to `psf-memo-client` (UI/UX polish,
accessibility, performance, responsiveness, state handling, error surfacing).

## Notes for future cycles

- Broadcast result (txid) is returned immediately; the action appears in the
  feed only after block confirmation + indexing. Specs must reflect this async
  visibility.
- Mutations/specs are Gherkin feature files under per-component `specs/` in
  the format defined by github.com/unclebob/Acceptance-Pipeline-Specification.
- Root `specs/` contains this backlog and cross-component architecture notes.
