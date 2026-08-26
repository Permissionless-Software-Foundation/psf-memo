# psf-memo — Prioritized Feature Backlog

**Status**: DRAFT — saved for future development cycles.
**Owner**: specifier
**Last updated**: 2026-08-26

---

## Goal

Make `psf-memo` feature-equivalent to [memo.cash](https://memo.cash), a Bitcoin
Cash (BCH) social network built on `OP_RETURN` transactions. Every social action
is a BCH transaction carrying a Memo protocol payload (`0x6d` + action byte) that
is broadcast from the client to the chain and later indexed by
`psf-memo-indexer` into `psf-memo-db`.

---

## Architecture constraints

- **Identity/auth**: the auto-generated HD wallet (12-word mnemonic) persisted in
  browser Local Storage by the existing React app is the Memo identity.
- **Write path**: broadcasting is done via `minimal-slp-wallet.sendOpReturn()`.
  - Correct public API: `await wallet.sendOpReturn(message, prefix)`.
  - `prefix = '6d02'` posts a memo; other action bytes replace `02`.
  - Binary payloads (txid, address hash) must be encoded correctly.
- **Read path**: `psf-memo-db` REST API (`/posts/*`, `/profile/*`, `/level/*`). API
  changes are in scope for specs.
- **Indexer path**: `psf-memo-indexer` scans blocks and mempool for Memo
  `OP_RETURN` outputs and writes structured records to `psf-memo-db`.
- The write path (broadcast), indexer path, and read path (DB) are asynchronous:
  a broadcasted action becomes visible only after confirmation + indexing.

---

## Memo protocol action codes

Reference: https://memo.sv/protocol

| Action byte | Meaning |
|-------------|---------|
| `0x6d01` | Set name |
| `0x6d02` | Post memo |
| `0x6d03` | Reply to memo |
| `0x6d04` | Like / tip memo |
| `0x6d05` | Set profile text |
| `0x6d06` | Follow user |
| `0x6d07` | Unfollow user |
| `0x6d0a` | Set profile picture |
| `0x6d0b` | Repost memo (planned) |
| `0x6d0c` | Post topic message |
| `0x6d0d` | Topic follow |
| `0x6d0e` | Topic unfollow |
| `0x6d10` | Create poll |
| `0x6d13` | Add poll option |
| `0x6d14` | Poll vote |
| `0x6d16` | Mute user |
| `0x6d17` | Unmute user |
| `0x6d24` | Send money |
| `0x6d30`–`0x6d35` | MIP-0009 token sell / buy / attach signature / pin |

---

## Component legend

| Code | Component | Typical changes |
|------|-----------|-----------------|
| C | `psf-memo-client` | React components, services, pages, unit/acceptance tests |
| I | `psf-memo-indexer` | Memo action handler, parser support, filter logic |
| D | `psf-memo-db` | LevelDB store, REST route, query adapter, tests |

---

## Tier P1 — Core social verbs (write + read)

These are the foundational posting and identity actions. Each is a broadcast
action plus its read/display surface and indexer support.

| # | Feature | Memo action | Components | Write | Read surface | Status |
|---|---------|-------------|------------|-------|--------------|--------|
| 1 | Post a Memo | `0x6d02` | C | Compose + `sendOpReturn` | Appears in recent feed & own profile after indexing | ✅ DONE |
| 2 | Set display name | `0x6d01` | C | Broadcast name | Name shown on posts, profiles, feed | ✅ DONE |
| 3 | Reply to a Memo | `0x6d03` | C | Broadcast reply to parent txid | Nested thread view | ✅ DONE |
| 4 | Like / tip a Memo | `0x6d04` | C, I, D | Broadcast like for a post txid; optional BCH tip | Like count + liked state on post | TODO |
| 5 | Set profile text (bio) | `0x6d05` | C, I, D | Broadcast bio | Shown on profile page | TODO |
| 6 | Set profile picture | `0x6d0a` | C, I, D | Broadcast avatar URL | Avatar on profile + posts | TODO |
| 7 | Follow a user | `0x6d06` | C, I, D | Broadcast follow of address | Follow button state; following list | TODO |
| 8 | Unfollow a user | `0x6d07` | C, I, D | Broadcast unfollow | Follow button state; following list | TODO |

### Priority order within P1

1. **Post a Memo** — the primary verb; unblocks all others. ✅ DONE
2. **Set display name** — makes the feed readable. ✅ DONE
3. **Reply to a Memo** — core conversation. ✅ DONE
   - **Decisions (2026-08-26, from memo.cash UI review):** reply max = **184 bytes**
     (UTF-8 byte count); reply form **inside the thread modal**; keep existing
     comment-icon behavior; live `[remaining]` byte counter (red when over);
     update thread **optimistically** after broadcast; **reply to a reply**
     (nested).
4. **Like / tip a Memo** — social signal; needs like-count API + indexer handler.
5. **Set profile text** — bio for the profile page.
6. **Set profile picture** — avatar for posts/profiles.
7. **Follow a user**.
8. **Unfollow a user**.

### Like / tip details

The like action (`0x6d04`) carries the liked post txid (32 bytes). A pure like
has no BCH output to the author; a tip adds a P2PKH output paying the author.
The indexer must:

- Store the like event in `likes` keyed by like txid.
- Update per-post like counts (likely a derived query or `likes` scan).
- Optionally store tip amount when the like tx pays the author.

The client must:

- Show a heart icon on each post.
- Open a like/tip modal with optional tip amount.
- Validate tip amount (dust limit, spendable balance).
- Broadcast `OP_RETURN 6d04 <postTxid>` plus any tip output.

---

## P2 — Topics

| # | Feature | Memo action | Components |
|---|---------|-------------|------------|
| 9 | Post a topic message | `0x6d0c` | C, I, D |
| 10 | Follow a topic | `0x6d0d` | C, I, D |
| 11 | Unfollow a topic | `0x6d0e` | C, I, D |
| 12 | Topic feed page | read | C, D |

Needs: topics index in `psf-memo-db`, topic feed endpoint, topic follow state.

---

## P3 — Polls (later)

| # | Feature | Memo action | Components |
|---|---------|-------------|------------|
| 13 | Create a poll | `0x6d10` | C, I, D |
| 14 | Add a poll option | `0x6d13` | C, I, D |
| 15 | Vote in a poll | `0x6d14` | C, I, D |

Needs: poll data model + rendering + vote aggregation in `psf-memo-db`.

---

## P4 — Moderation (later)

| # | Feature | Memo action | Components |
|---|---------|-------------|------------|
| 16 | Mute a user | `0x6d16` | C, D |
| 17 | Unmute a user | `0x6d17` | C, D |

Needs: per-wallet mute list applied to feed filtering.

---

## P5 — Money & tokens (later)

| # | Feature | Memo action | Components |
|---|---------|-------------|------------|
| 18 | Send money | `0x6d24` | C |
| 19 | Token sell / buy / pin | `0x6d30`–`0x6d35` (MIP-0009) | C, I, D |

---

## P6 — Discovery & UX (later)

| # | Feature | Components | Notes |
|---|---------|------------|-------|
| 20 | Search | C, D | posts / profiles / topics / tags |
| 21 | Tags / hashtags | C, D | link + filter by tag |
| 22 | Notifications | C, D | replies / likes / follows to my posts |
| 23 | Ranked feed | C, D | memo.cash "ranked" post ordering |
| 24 | Repost | C, I, D | `0x6d0b` (planned in protocol) |

---

## Read-only vs write capability by cycle

- **Cycle 0 (current)**: read-only display of recent posts, profiles, post threads.
- **Cycle 1 (P1)**: add write code paths (broadcast via `sendOpReturn`). UI is
  read-only until a broadcasted action is confirmed + indexed; then the feed/profile
  refresh.
- **Later cycles**: topics, polls, moderation, money/tokens, discovery.

---

## Notes for future cycles

- Broadcast result (txid) is returned immediately; the action appears in the feed
  only after block confirmation + indexing. Specs must reflect this async visibility.
- Mutations/specs are Gherkin feature files under per-component `specs/` in the
  format defined by github.com/unclebob/Acceptance-Pipeline-Specification.
- Root `specs/` contains this backlog and cross-component architecture notes.
