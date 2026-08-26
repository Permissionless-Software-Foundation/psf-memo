# psf-memo-client — Prioritized Feature Backlog

**Status**: DRAFT — saved for future development cycles.
**Owner**: specifier
**Last updated**: 2026-05-25

---

## Goal

Make psf-memo-client feature-equivalent to [memo.cash](https://memo.cash). Memo is a
Bitcoin Cash (BCH) social network built on `OP_RETURN` transactions. Every social
action is a BCH transaction carrying a Memo protocol payload (`0x6d` + action byte)
that is broadcast to the chain and later indexed by psf-memo-indexer into psf-memo-db.

## Architecture constraints

- **Identity/auth**: the auto-generated HD wallet (12-word mnemonic) already
  persisted in browser Local Storage by the existing React app is the Memo identity.
  The wallet's first derived key pair is the posting/identification key.
- **Write path**: broadcasting is done via `minimal-slp-wallet.sendOpReturn(wallet, bchUtxos, msg, prefix, bchOutput, satsPerByte)`.
  - Default `prefix = '6d02'` posts a Memo.
  - `msg` carries the Memo payload for the selected action.
  - Reference tutorial: https://fullstack-agents.github.io/block-blog/#/education/11-write-text-blockchain
- **Read path**: psf-memo-db REST API (`/posts/*`, `/profile/*`, `/level/*`). API may be
  refactored (in scope) to support a good UX.
- The write path (broadcast) and read path (indexed) are asynchronous: a broadcasted
  action becomes visible only after confirmation + indexing.

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

## Tier P1 — Core social verbs (write + read)

These are the foundational posting and identity actions. Each is a broadcast
action plus its read/display surface. This is the recommended first development slice.

| # | Feature | Memo action | Write | Read surface |
|---|---------|-------------|-------|--------------|
| 1 | Post a Memo | `0x6d02` | Compose + `sendOpReturn` | Appears in recent feed & own profile after indexing |
| 2 | Set display name | `0x6d01` | Broadcast name | Name shown on posts, profiles, feed | ✅ DONE |
| 3 | Reply to a Memo | `0x6d03` | Broadcast reply to parent txid | Nested thread view |
| 4 | Like a Memo | `0x6d04` | Broadcast like for a post txid | Like count + liked state on post |
| 5 | Set profile text (bio) | `0x6d05` | Broadcast bio | Shown on profile page |
| 6 | Set profile picture | `0x6d0a` | Broadcast avatar URL | Avatar on profile + posts |
| 7 | Follow a user | `0x6d06` | Broadcast follow of address | Follow button state |
| 8 | Unfollow a user | `0x6d07` | Broadcast unfollow | Follow button state; following list |

**API/DB needs (P1):** like counts + liked-state per post; my follow status per user;
follower/following lists; name + profile + avatar joined into feed/profile responses
(avoid N+1 lookups). Current `/posts/recent` omits name/avatar/likes.

## Priority order within P1

1. **Post a Memo** — the primary verb; unblocks all others. ✅ DONE
2. **Set display name** — makes the feed readable and gives identity. ✅ DONE
3. **Reply to a Memo** — core conversation; extends the existing thread modal. ✅ DONE
   - **Decisions (2026-08-26, from memo.cash UI review):** reply max = **184 bytes**
     (UTF-8 byte count); reply form **inside the thread modal**; keep the existing
     comment-icon behavior (opens the thread modal); replicate the live `[remaining]`
     byte counter (turns red when over); update the thread **optimistically** after
     broadcast; users can **reply to a reply** (nested).
4. **Like a Memo** — social signal; needs like-count API.
5. **Set profile text** — bio for the profile page.
6. **Set profile picture** — avatar for posts/profiles.
7. **Follow a user**.
8. **Unfollow a user**.

## P2 — Topics

| # | Feature | Memo action |
|---|---------|-------------|
| 9 | Post a topic message | `0x6d0c` |
| 10 | Follow a topic | `0x6d0d` |
| 11 | Unfollow a topic | `0x6d0e` |
| 12 | Topic feed page | read |

Needs: topics index in psf-memo-db, topic feed endpoint, topic follow state.

## P3 — Polls (later)

| # | Feature | Memo action |
|---|---------|-------------|
| 13 | Create a poll | `0x6d10` |
| 14 | Add a poll option | `0x6d13` |
| 15 | Vote in a poll | `0x6d14` |

Needs: poll data model + rendering + vote aggregation in psf-memo-db.

## P4 — Moderation (later)

| # | Feature | Memo action |
|---|---------|-------------|
| 16 | Mute a user | `0x6d16` |
| 17 | Unmute a user | `0x6d17` |

Needs: per-wallet mute list applied to feed filtering.

## P5 — Money & tokens (later)

| # | Feature | Memo action |
|---|---------|-------------|
| 18 | Send money | `0x6d24` |
| 19 | Token sell / buy / pin | `0x6d30`–`0x6d35` (MIP-0009) |

## P6 — Discovery & UX (later)

| # | Feature | Notes |
|---|---------|-------|
| 20 | Search (posts / profiles / topics / tags) | needs DB search index |
| 21 | Tags / hashtags | link + filter by tag |
| 22 | Notifications | replies / likes / follows to my posts |
| 23 | Ranked feed | memo.cash "ranked" post ordering |
| 24 | Repost | `0x6d0b` (planned in protocol) |

---

## Read-only vs write capability by cycle

- **Cycle 0 (current)**: read-only display of recent posts, profiles, post threads.
- **Cycle 1 (P1)**: add write code paths (broadcast via `sendOpReturn`). UI is
  read-only until a broadcasted action is confirmed + indexed; then the feed/profile
  refresh.
- **Later cycles**: topics, polls, moderation, money/tokens, discovery.

## Notes for future cycles

- Broadcast result (txid) is returned immediately; the action appears in the feed
  only after block confirmation + indexing. Specs must reflect this async visibility.
- Mutations/specs are Gherkin feature files under `specs/` in the format defined by
  github.com/unclebob/Acceptance-Pipeline-Specification.
