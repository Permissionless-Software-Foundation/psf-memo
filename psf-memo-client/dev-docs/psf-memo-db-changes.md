# psf-memo-db changes to support Like counts

**Status**: DRAFT — notes for a future session. The current Like/Tip feature
(`0x6d04`) focuses on the **UI to broadcast a like** (and an optional tip). The
read-side changes below are **not** implemented now; they are recorded here so the
like-count read path can be developed later.

Owner: specifier.
Last updated: 2026-08-26.

---

## Goal

Expose like counts (and, later, liked-state and a likers list) so the psf-memo-client
UI can show a real like count on each post and whether the viewing user already liked
it. Today `/posts/*` responses omit likes entirely.

## What the indexer already provides

The Memo **indexer** (`psf-memo-indexer`) already parses `0x6d04` like/tip actions into
the DB as social references: a **liker address** → a **liked post txid** (with an
optional tip value). This feature does not require indexer changes to record likes; it
requires the **DB query/API** layer to aggregate and expose them.

## Required psf-memo-db changes

1. **`likeCount` on post responses.**
   Add a `likeCount` field (number of distinct `0x6d04` references whose liked txid
   equals the post txid) to the objects returned by:
   - `/posts/recent` (feed items)
   - `/post/:txid` (thread root)
   - thread reply nodes (when replies are also likeable / shown with counts)
   Aggregate the count in the query rather than an N+1 per-post lookup.

2. **Liked-state for the viewing user (optional, later).**
   To render a filled heart when the current wallet has already liked a post, the
   read endpoints need to know the viewer. Add an optional `viewer=<address>` query
   param (or equivalent) to the relevant post endpoints and return
   `liked: true|false` per post based on whether `viewer` has a `0x6d04` reference to
   that txid. Until this exists, the client can track "liked" locally/optimistically
   for the current session only.

3. **Likers list endpoint (later).**
   memo.cash shows a modal listing who liked a post (its `post/likes`). Add an endpoint
   e.g. `GET /post/:txid/likes` returning `[{ address, name, profilePicUrl, tip }...]`
   for the addresses that liked the post, ordered by time/tip, joined with the profile
   store to avoid N+1 lookups. Used by a future "likes" modal.

4. **Join efficiency.**
   Like counts must be aggregated server-side (e.g. a counter derived from the
   reference index or a materialized count) and included in the same response as the
   post text, author, name, and avatar — avoid N+1 per-item like lookups in feed and
   thread responses.

## Out of scope (this session)

- The like-count **read surface** (count badge, liked-state, likers modal).
- `viewer` liked-state param.
- Likers list endpoint.

All of the above are future work; the UI spec for this session only broadcasts the
like/tip and increments a count **optimistically**.
