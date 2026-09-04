# Review Summary: mute-feed-filtering

## Reviewed
- Batch handoff from refactorer: `git_handoff a2e0b7691b`, task `mute-feed-filtering`.
- Merged via fast-forward to `swarmforge-architect`; the full feature span includes the
  spec, the coder implementation (`448bddc`), the coder/refactorer merge (`bdf1de9`),
  and the refactorer's shared-helper refactor (`a2e0b76`).

## Architectural findings and fixes applied
- **Dependency-order bug (fixed)** in `psf-memo-db/src/adapters/index.js`:
  `PostQuery` was constructed *before* `this.muteQuery` was assigned, so
  `muteQuery: this.muteQuery` evaluated to `undefined` at construction time. The
  recent-feed mute filtering (`scanRecentPostTxids`, `countTopLevelPosts`) was therefore
  a silent no-op in the production wiring. Reordered so `MuteQuery` is built before
  `PostQuery` (a comment documents the construction-time dependency).
- **Key-fallback bug (fixed)** in `psf-memo-db/src/adapters/notifications-query.js`
  `_followNotificationAddr`: the fallback `record.followerAddr || key.split(':')[0]`
  yielded `"bitcoincash"` instead of the full cash address, because a cash address
  contains a `:` and the first segment is just the `bitcoincash:` network prefix. Now
  strips the trailing `:<followeePkHash>` suffix via `key.slice(0, key.lastIndexOf(':'))`.
- **New coverage** added for the shared `muted-posts.js` helper
  (`test/unit/adapters/lib/muted-posts.unit.js`) and for the follow key-fallback path in
  `notifications-query.unit.js`.
- Module structure: the refactorer's extraction of `loadMutedAddrs` / `isMutedPost`
  into `src/adapters/lib/muted-posts.js` is a sound, information-hiding improvement and
  correctly deduplicates the per-adapter `_mutedAddrs` / `_isMutedPost` lookups across
  post, topic, search, and notifications. No structural changes needed.

## Verification results
- Language mutation (differential, `--max-workers 8`, `--mutate-all`):
  - `lib/muted-posts.js`: 4 killed, 0 survived (new helper fully covered).
  - `notifications-query.js`: 18 killed, 4 survived — documented equivalents
    (line 23 env `RESTURL` default never exercised; line 135 `||&&` reply guard
    neutralized downstream; line 173 `seen ?? 0` sort-tie default preserves ordering).
  - `post-query.js`: 41 killed, 0 survived.
  - `search-query.js`: 19 killed, 2 survived (pre-existing `?? 0` defaults).
  - `topic-query.js`: 21 killed, 2 survived (pre-existing `>` and `0` defaults).
  - `adapters/index.js`: 2 uncovered (`openDatabases`/`start` entry points require
    real DBs; environmentally unsuitable boundary, covered by DB acceptance).
  - `list-recent-posts`/`list-topic-posts`/`search-all`: survivors are the dual-alias
    fallback `viewerAddr || viewer || null`; callers supply at most one alias, so `||`
    and `&&` select the same value (equivalents).
- Client services: `recent-feed-page` (6/0), `topic-feed-page` (15/0),
  `search-page` (11/0) — all mutations killed. (`memo-db.js` HTTP adapter remains
  excluded per standing precedent; read behavior exercised via DB acceptance.)
- DRY: 10 score-1.00 candidates, all in the pre-existing follow/mute layered-convention
  set (queries `follow-query`/`mute-query`; use-cases `follow-state`/`mute-state`/
  `topic-follow-state`). No task-scoped duplication; DRY clean for this handoff.
- Soft Gherkin acceptance mutation (`--level soft`): 48 mutations, 48 survived, 0
  errors. All are genuine equivalents for this read-only feature: single-character
  case/value mutations to example addresses/text/txids are referenced identically on
  both the setup and assertion sides of each scenario, so the mutated examples still
  pass exactly as documented for this feature.

## Suite status
- psf-memo-db: 343 unit passing, 40 property passing, 9 acceptance files passed, lint clean.
- psf-memo-client: 284 unit passing, 24 acceptance files passed, lint clean.

## Handoffs
- `git_handoff` to coder and refactorer (priority 00) with my review commit.
- No `git_handoff` to specifier (no functional spec change beyond the existing handoff;
  only manifest/non-functional review artifacts plus the two robustness fixes on the
  already-delivered work).

By architect.
