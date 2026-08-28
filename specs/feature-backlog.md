# psf-memo — Prioritized Feature Backlog

**Status**: DRAFT — research refresh 2026-08-27.
**Owner**: specifier.
**Last updated**: 2026-08-28

---

## Goal

Make `psf-memo` feature-equivalent to [memo.cash](https://memo.cash), a Bitcoin
Cash (BCH) social network built on `OP_RETURN` transactions. Every social action
is a BCH transaction carrying a Memo protocol payload (`0x6d` + action byte)
that is broadcast from the client to the chain and later indexed by
`psf-memo-indexer` into `psf-memo-db`.

---

## Research notes

- **Protocol reference**: `https://memo.sv/protocol` (Wayback Machine snapshot
  2025-12-15). It lists action bytes, payload shapes, and byte limits. The page
  is on the BSV fork (`memo.sv`) but the action codes match the BCH
  `memo.cash` implementation.
- **memo.cash access**: the live site is behind Cloudflare. Direct `curl` and
  headless Firefox login attempts from this environment were blocked, so the
  roadmap is derived from the protocol spec plus an audit of the existing
  mono-repo code.
- **Implementation audit** (2026-08-27):
  - Indexer already has handlers for: `setName`, `post`, `reply`, `like`,
    `setProfile`, `follow`/`unfollow`, `setProfilePic`, `topicMessage`,
    `topicFollow`/`topicUnfollow`.
  - `psf-memo-db` already has LevelDB stores for all of those actions and raw
    `/level/*` CRUD routes.
  - Client already supports: posting, replying, setting name, and the like/tip
    broadcast UI.
  - **Main gaps**: client UI for setting profile text/picture and
    follow/unfollow; high-level read APIs for like counts, follow state, topic
    feeds, polls, and mutes.

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

## Tier P0 — Already shipped to `master`

| # | Feature | Memo action | Components | Status |
|---|---------|-------------|------------|--------|
| 0.1 | Post a Memo | `0x6d02` | C, I, D | ✅ |
| 0.2 | Set display name | `0x6d01` | C, I, D | ✅ |
| 0.3 | Reply to a Memo | `0x6d03` | C, I, D | ✅ |
| 0.4 | Efficient post pagination | read | D, I | ✅ |

---

## Tier P1 — Core social verbs (close the read loop)

These features already have indexer storage and (for like/tip) client
broadcast. The remaining work is exposing the read side in `psf-memo-db` and
adding/editing the client UI.

| # | Feature | Memo action | Components | Status | Next work |
|---|---------|-------------|------------|--------|-----------|
| 1.1 | Like / tip a Memo — read side | `0x6d04` | D | ✅ | `likeCount` returned on `/posts/*` and `/posts/:txid/thread` |
| 1.2 | Like / tip a Memo — client display | `0x6d04` | C | ✅ | Feed/Profile/Thread read `likeCount` from API instead of defaulting to 0 |
| 1.3 | Set profile text (bio) | `0x6d05` | C | ✅ | C: "Set Bio" UI on Account page broadcasts `0x6d05` (217-byte limit) |
| 1.4 | Set profile picture | `0x6d0a` | C, I, D | ✅ | C: "Set Avatar URL" UI broadcasts `0x6d0a` (217-byte limit); I/D already read |
| 1.5 | Follow a user | `0x6d06` | C, I, D | ✅ | C: follow button on profile; D: follow state + following/followers lists |
| 1.6 | Unfollow a user | `0x6d07` | C, I, D | ✅ | C: unfollow button; D: follow state |

### Priority order within P1

1. **Like / tip a Memo — read side** ✅ DONE.
2. **Like / tip a Memo — client display** ✅ DONE. The feed, profile, and
   thread views now read `likeCount` from the API (profile shows a read-only
   like button).
3. **Set profile text** ✅ DONE. Account page "Set Bio" UI broadcasts `0x6d05` with a 217-byte limit and byte counter (task `set-bio`).
4. **Set profile picture** ✅ DONE. Account page "Set Avatar URL" UI broadcasts `0x6d0a` with a 217-byte limit and byte counter (task `set-avatar-url`).
5. **Follow / Unfollow user** ✅ DONE. Profile page Follow/Unfollow button broadcasts `0x6d06`/`0x6d07`; DB exposes follow state and following/followers lists (task `follow-user`).

### Like / tip details

- The like action carries the liked post txid (32 bytes). A pure like has no
  BCH output to the author; a tip adds a P2PKH output paying the author.
- `psf-memo-indexer` stores each like in `likesDb` and records `tip` (sats)
  when the like tx pays the author.
- `psf-memo-db` aggregates `likesDb` into per-post `likeCount` in
  `/posts/recent`, `/posts/by/:addr`, and `/posts/:txid/thread` responses.
- The client already has `MemoLike`, `LikeTipPage`, `LikeButton`, and
  `LikeTipModal`; the feed/profile/thread views now read `likeCount` from the
  API (profile renders a read-only `LikeButton`).

---

## Tier P2 — Topics

Topics add a second feed axis. The indexer already stores topic messages and
follows in `roomsDb`; the DB and client need query/render support.

| # | Feature | Memo action | Components | Status |
|---|---------|-------------|------------|--------|
| 2.1 | Topic list / discovery | read | D, C | ✅ |
| 2.2 | Topic feed page | read | D, C | ✅ |
| 2.3 | Post a topic message | `0x6d0c` | C, I, D | ✅ shipped (task `topic-actions`) |
| 2.4 | Follow a topic | `0x6d0d` | C, I, D | ✅ shipped (task `topic-actions`) |
| 2.5 | Unfollow a topic | `0x6d0e` | C, I, D | ✅ shipped (task `topic-actions`) |

---

## Tier P3 — Polls

Polls require a new data model and rendering. The indexer has no handler yet.

| # | Feature | Memo action | Components | Status |
|---|---------|-------------|------------|--------|
| 3.1 | Create a poll | `0x6d10` | C, I, D | 🔄 specs written (task `poll-actions`) |
| 3.2 | Add a poll option | `0x6d13` | C, I, D | 🔄 specs written (task `poll-actions`) |
| 3.3 | Vote in a poll | `0x6d14` | C, I, D | 🔄 specs written (task `poll-actions`) |

---

## Tier P4 — Moderation

| # | Feature | Memo action | Components | Status |
|---|---------|-------------|------------|--------|
| 4.1 | Mute a user | `0x6d16` | C, D | 🔴 missing |
| 4.2 | Unmute a user | `0x6d17` | C, D | 🔴 missing |

---

## Tier P5 — Money & token exchange

| # | Feature | Memo action | Components | Status |
|---|---------|-------------|------------|--------|
| 5.1 | Send money with memo | `0x6d24` | C | 🔴 missing |
| 5.2 | Token sell offer | `0x6d30` (MIP-0009) | C, I, D | 🔴 missing |
| 5.3 | Token buy offer | `0x6d31` (MIP-0009) | C, I, D | 🔴 missing |
| 5.4 | Attach token sale signature | `0x6d32` (MIP-0009) | C, I, D | 🔴 missing |
| 5.5 | Pin token post | `0x6d35` (MIP-0009) | C, I, D | 🔴 missing |

---

## Tier P6 — Advanced social & discovery (later)

| # | Feature | Components | Notes |
|---|---------|------------|-------|
| 6.1 | Repost a memo | C, I, D | `0x6d0b` is marked *planned* in the protocol |
| 6.2 | Ranked feed | C, D | memo.cash "ranked" post ordering |
| 6.3 | Notifications | C, D | replies / likes / follows to my posts |
| 6.4 | Search | C, D | posts / profiles / topics |
| 6.5 | Tags / hashtags | C, D | link + filter by tag |
| 6.6 | Following feed | C, D | feed filtered to followed users |

---

## Suggested next spec

**Polls (P3.1 / P3.2 / P3.3)** — create a poll / add an option / vote:
- `psf-memo-client`: a poll composer that broadcasts `0x6d10` (create poll),
  an add-option composer that broadcasts `0x6d13`, and a vote composer that
  broadcasts `0x6d14`.
- `psf-memo-indexer`: new handlers that parse and store create-poll, add-option,
  and vote transactions (no poll handler exists yet).
- `psf-memo-db`: expose the read side — poll question/options/votes via
  `/polls/:txid`, `/polls/:txid/options`, `/polls/:txid/votes`.

### Poll payloads

- `0x6d10` create poll: `poll_type` (1 byte) + `option_count` (1 byte) + `question` (≤ 209 bytes).
- `0x6d13` add option: `poll_txhash` (32 bytes) + `option` (≤ 184 bytes).
- `0x6d14` vote: `poll_txhash` (32 bytes) + `comment` (≤ 184 bytes).

The poll txid is a 32-byte binary hash reversed to hex, like other Memo txid
payloads. Specs are written (task `poll-actions`, handed off to the coder).

---

## Notes for future cycles

- Broadcast result (txid) is returned immediately; the action appears in the
  feed only after block confirmation + indexing. Specs must reflect this async
  visibility.
- Mutations/specs are Gherkin feature files under per-component `specs/` in
  the format defined by github.com/unclebob/Acceptance-Pipeline-Specification.
- Root `specs/` contains this backlog and cross-component architecture notes.

## Completed fixes (not roadmap features)

- **ZMQ-mode DB backups** (2026-08-28, task `zmq-db-backups`): the block
  indexer only created zip backups during IBD; the ZMQ live loop never called
  `backupDb()`. Fixed by centralizing the `height % epoch === 0` decision in a
  `BackupDb.maybeBackupDb` use case called from both the IBD and ZMQ paths.
  Spec: `psf-memo-indexer/specs/zmq-mode-db-backups.feature`.
