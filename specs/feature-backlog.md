# psf-memo — Feature Backlog

**Status**: DRAFT — refreshed 2026-09-03.
**Owner**: specifier.
**Last updated**: 2026-09-20

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

- **Profile ordering by last post (2026-09-20):** `/profile/recent` should
  list only profiles that have posted, ordered by their most recent qualifying
  post instead of their most recent profile update. A qualifying post is a
  top-level post (`0x6d02`) or a topic message (`0x6d0c`); replies (`0x6d03`)
  and poll creations (`0x6d10`) do not qualify. Profiles that have never posted
  are dropped. Ordering is by last post's block height descending, then seen
  descending, then address ascending, considering confirmed blocks only. The
  Block and Seen columns report the last post's block height and timestamp
  rather than the set-profile transaction's. The indexer maintains a
  `profileRecency` index (mirroring `topicRecency`) so the read never scans
  `addrPostHeights` or sorts every profile; a backfill builds it from existing
  data. Indexer + DB (the client renders the returned block/seen unchanged).
  Specs: `psf-memo-indexer/specs/profile-recency-indexing.feature`,
  `psf-memo-db/specs/recent-profile-ordering.feature`,
  `psf-memo-db/specs/backfill-profile-recency.feature`.

## Recently completed

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

Current direction is front-end improvements to `psf-memo-client` (UI/UX polish,
accessibility, performance, responsiveness, state handling, error surfacing).
Ask the user for the next feature.

## Notes for future cycles

- Broadcast result (txid) is returned immediately; the action appears in the
  feed only after block confirmation + indexing. Specs must reflect this async
  visibility.
- Mutations/specs are Gherkin feature files under per-component `specs/` in
  the format defined by github.com/unclebob/Acceptance-Pipeline-Specification.
- Root `specs/` contains this backlog and cross-component architecture notes.
