# cli-topic-writes — Architect Review

**Task:** `cli-topic-writes` (W9/W10: `memo-topic-post`, `memo-topic-follow`, `memo-topic-unfollow`)
**Component:** `psf-memo-cli`
**Architect review commit:** `8bfdfa47ec`
**Verification record:** `docs/reviews/cli-topic-writes-verification.json`
(`git_sha` `8bfdfa47ec`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's three feature specs,
the coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `68ddd95` | specifier | Specify memo-topic-post, memo-topic-follow, memo-topic-unfollow (W9/W10) (`specs/memo-topic-*.feature`) |
| `83fff6e` | coder | Implement the three commands (`room-flag.js`, `topic-room-write-command.js`, `memo-topic-post.js`, command declarations, acceptance steps, unit/property tests) |
| `698095f` | refactorer | Share the multi-field write-command pipeline (`defineFieldsWriteCommand`; `memo-reply` migrated) |

The architect branch fast-forwarded `0e89edc -> 698095f`, then added review
commit `8bfdfa47ec` (combined-byte boundary coverage, shared room-text
generator, tool-written manifests and feature mutation manifests).

## Architectural findings and fixes applied

1. **Multi-field write factory generalized (good).** `write-command.js` now
   exposes `defineFieldsWriteCommand` for ordered multi-field actions, with
   `defineFieldWriteCommand` as its one-field case. `memo-reply` was migrated to
   it, and `memo-topic-post` declares `fields: ['room', 'message']`; all write
   commands share one validate -> resolve wallet -> broadcast -> report flow.

2. **Topic-room writes consolidated (good).** `room-flag.js` owns the required
   `-r` room presence check and message; `topic-room-write-command.js` composes
   the single-field factory with that parser, so `memo-topic-follow` and
   `memo-topic-unfollow` declare only `prefix`/`verb`. The room is broadcast as
   plain UTF-8 (no cashaddr conversion).

3. **Combined topic limit kept local (good).** `memo-topic-post.js` owns the
   `0x6d0c` combined room + message limit of 214 UTF-8 bytes, which cannot reuse
   `memoTextFlagParser` (that measures one flag). The multi-push `[6d0c, room,
   message]` path is the shared `defineFieldsWriteCommand`.

4. **Mutation survivor fixed.** The first run left `>` -> `>=` alive at the
   combined 214-byte boundary: the "exactly at the limit" unit test used
   `'é'.repeat(103)` + `general` = 213 bytes, one short of the boundary. Corrected
   it to a true 214-byte payload (`'a'.repeat(207)` + `general`) and added an
   exact-limit/one-over property case. Re-run: 3 killed, 0 survived.

5. **DRY fix applied.** Extracted the duplicated random-string generator into
   `test/property/harness.js` (`randomText(rng, alphabet, maxLength)`) and used
   it in the topic-post and topic-room property tests. Scoped DRY re-run:
   **no duplicate candidates found.**

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` where differential under-selected). No survivors.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/write-command.js` | 3 | 0 | 0 |
| `src/lib/topic-room-write-command.js` | 0 | 0 | 0 |
| `src/lib/room-flag.js` | 0 | 0 | 0 |
| `src/lib/memo-topic-post.js` | 3 | 0 | 0 |
| `src/commands/memo-topic-post.js` | 0 | 0 | 0 |
| `src/commands/memo-topic-follow.js` | 0 | 0 | 0 |
| `src/commands/memo-topic-unfollow.js` | 0 | 0 | 0 |
| `src/commands/memo-reply.js` | 0 | 0 | 0 |

`write-command.js` reran with `--mutate-all` after the multi-field factory was
added; the command modules are declarations only.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance modules, the shared property harness, and the changed unit/property
tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on each of the three features):

- `memo-topic-post`: **21 mutations, 8 killed, 13 survived, 0 errors**. The kills
  are the byte/room-byte/message-byte mutations in the combined-limit outline
  and the empty-message mutation. Survivors are intrinsic equivalents:
  `room`/`message`/`txid`/`error` case changes are used on both the setup and
  assertion side, and the `length` mutation (200 -> 195) stays over the limit.
- `memo-topic-follow` / `memo-topic-unfollow`: **6 mutations, 0 killed, 6
  survived, 0 errors** each; all survivors are intrinsic `room`/`txid`/`error`
  case equivalents used on both sides.

The tool wrote an acceptance-mutation manifest to each feature recording the
killed scenarios (e.g. `memo-topic-post` records the empty-message scenario).

**Suite status** (`verify.sh cli`, record `8bfdfa47ec`): unit **568 passing**,
property **110 pass / 0 fail**, acceptance **all 35 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-topic-writes`, commit `8bfdfa47ec`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
