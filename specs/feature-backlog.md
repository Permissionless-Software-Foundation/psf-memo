# psf-memo — Feature Backlog

**Status**: DRAFT — refreshed 2026-09-03.
**Owner**: specifier.
**Last updated**: 2026-09-03

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

- **YouTube embed (2026-09-04):** posts whose text contains a YouTube link
  (`youtube.com/watch?v=…` or `youtu.be/…`) render an embedded player instead
  of the raw URL; surrounding text is preserved; non-embeddable URLs stay plain
  text. Client-only rendering feature. Spec:
  `psf-memo-client/specs/youtube-embed.feature`. Merged to `master` at `b63019c`.

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

## Notes for future cycles

- Broadcast result (txid) is returned immediately; the action appears in the
  feed only after block confirmation + indexing. Specs must reflect this async
  visibility.
- Mutations/specs are Gherkin feature files under per-component `specs/` in
  the format defined by github.com/unclebob/Acceptance-Pipeline-Specification.
- Root `specs/` contains this backlog and cross-component architecture notes.
