# psf-memo-cli Feature Backlog — Memo Protocol Commands

**Status**: DRAFT — proposed.
**Owner**: specifier.
**Last updated**: 2026-10-08.

## Purpose

`psf-memo-cli` began as a pure BCH + SLP wallet (forked from
`psf-bch-wallet`). It now needs a second job: let **AI agents interact with the
Memo protocol** the way a human uses the `psf-memo-client` web UI — read the
social graph, broadcast posts/replies/likes, manage follows/mutes/profiles, and
check notifications.

Agents are a first-class consumer. Every command must be **non-interactive,
deterministic, and machine-readable**, with stable exit codes and a `--json`
mode, so an agent can chain commands and parse results without screen-scraping.

This document is the candidate list. Each item below becomes its own
specifier → coder → refactorer → architect cycle: a Gherkin spec, a coder
implementation, refactoring, and architect verification, per the SwarmForge
constitution. **Nothing here is approved to hand off yet.**

---

## Current state

The CLI today exposes only wallet/crypto commands:

| Command | Purpose |
|---------|---------|
| `wallet-create`, `wallet-list`, `wallet-addrs`, `wallet-balance`, `wallet-sweep` | Wallet management |
| `send-bch`, `send-tokens` | BCH / SLP transfers |
| `msg-sign`, `msg-verify` | Message signing |

The Memo-protocol foundation is in place (F1 DB client, F5 output contract, F4
wire encoding, F2/F3 wallet resolution + broadcast scaffolding) and **R1
`memo-feed`, the first read command, is DONE**. The reusable wallet plumbing is
`src/lib/wallet-util.js`
(`instanceWallet()`), `src/lib/flag-validator.js`, `src/lib/send-command.js`,
and `src/lib/bind-methods.js`; commands follow the
`run()` / `validateFlags()` contract documented in `src/commands/README.md`.

The web client already implements every behavior we need to mirror in
`psf-memo-client/src/services/` (CJS) and the DB read API already exposes the
needed routes in `psf-memo-db/src/controllers/rest-api/`. The CLI is ESM
(`"type": "module"`), so client services cannot be imported directly; logic
must be ported into `src/` and kept dependency-free where possible.

### Read APIs available for the CLI (`psf-memo-db`)

| Method | Route | Params |
|--------|-------|--------|
| GET | `/posts/recent` | `limit`, `offset`, `viewer` |
| GET | `/posts/by/:addr` | `limit`, `offset` |
| GET | `/posts/following/:addr` | `limit`, `offset` |
| GET | `/posts/notifications/:addr` | `limit`, `offset` |
| GET | `/posts/:txid/thread` | — |
| GET | `/level/post/:txid` | — |
| GET | `/level/name/:addr`, `/level/profile/:addr`, `/level/profilepic/:addr` | — |
| GET | `/profile/recent` | `limit`, `offset` |
| GET | `/profile/newest-post/:addr` | — |
| GET | `/follow/state` | `follower`, `followee` |
| GET | `/follow/following/:follower`, `/follow/followers/:followee` | — |
| GET | `/mute/state` | `muter`, `mutee` |
| GET | `/mute/muted/:muter` | — |
| GET | `/topics` | `limit`, `offset` |
| GET | `/topics/:room/posts` | `limit`, `offset`, `viewer` |
| GET | `/topics/:room/follow/state` | `addr` |
| GET | `/topics/:room/followers` | — |
| GET | `/search` | `q`, `limit`, `offset`, `viewer` |
| GET | `/polls/:txid`, `/polls/:txid/options`, `/polls/:txid/votes` | — |
| GET | `/level/status/status` | — |

The production DB URL is `https://memo-api.fullstackcash.net`; local
development is `http://localhost:5021`. The F1 config resolves it as the
production default (overridable via `MEMO_DB_URL` or `--db-url`).

---

## Design principles (apply to every feature)

1. **Non-interactive.** No prompts, no TTY assumptions. Anything that could
   require a confirmation takes a flag (`--yes`) or is split into a
   compose/wait command.
2. **Machine-readable on every command.** Every command accepts `--json`,
   which prints a single JSON document to stdout; human-readable output stays
   the default. Diagnostics go to stderr.
3. **Stable exit codes.** `0` success, `1` runtime/validation error, `2` usage
   error. Never swallow a broadcast failure.
4. **Wallet by name or WIF.** Wallet-relative commands accept either
   `-n <wallet>` (reuse `wallet-util.instanceWallet()`) or `--wif <wif>` for a
   one-shot identity. The resolved first address is the Memo identity, matching
   the web UI's HD wallet. A shared resolver requires exactly one source and
   derives the same cash address either way.
5. **Real limits and wire formats.** Enforce the Memo protocol limits and
   encodings server-side in the command, not by trusting the caller (see the
   protocol table and gotchas below).
6. **One command, one action.** Prefer small composable commands over a
   mega-command; a `--dry-run` may preview a composed action without
   broadcasting.
7. **Quality gates.** Unit + property tests, 100% coverage, CRAP ≤ 6, DRY
   clean, language mutation with no survivors, and lint — the
   `cli-quality-hardening` baseline. New logic must keep that green.

---

## Foundation features (enablers — do these first)

### F1 — Memo DB HTTP client and `MEMO_DB_URL` config
**Status: DONE** (2026-10-06, task `cli-memo-db-client`; merged at `346556f`;
acceptance 12/12). Spec: `psf-memo-cli/specs/memo-db-client.feature`; architect
summary: `docs/reviews/cli-memo-db-client-summary.md`.
Add a read-only HTTP client (`src/lib/memo-db.js`) covering the routes above,
plus config in `config/index.js` and `.env.example`:
`MEMO_DB_URL` (default `https://memo-api.fullstackcash.net`, the production
memo-db) and a per-command `--db-url` override; local development points it at
`http://localhost:5021`. Use Node 20's global `fetch` and avoid adding `axios`
unless a concrete need appears. A 404 on a `/level/*` lookup resolves to `null`, not an
error, mirroring the web client.

### F2 — Wallet resolution + shared Memo broadcast scaffolding
**Status: DONE** (2026-10-07, task `cli-wallet-broadcast`; merged at `d78fb09`;
acceptance 9/9 across the two features).
`psf-memo-cli/src/lib/wallet-source.js` is a pure resolver requiring exactly one
of `-n <wallet>`/`--wif <wif>` (zero or two is a `UsageError`);
`psf-memo-cli/src/lib/memo-broadcast.js` is the shared broadcast helper.
Specs: `psf-memo-cli/specs/wallet-source.feature`,
`psf-memo-cli/specs/memo-broadcast.feature`; architect summary:
`docs/reviews/cli-wallet-broadcast-summary.md`.
A shared resolver (`src/lib/wallet-source.js`) accepts exactly one of
`-n <wallet>` or `--wif <wif>` and returns an initialized wallet plus its cash
address. A shared module (`src/lib/memo-broadcast.js`) then validates flags,
refreshes UTXOs, encodes the action payload, calls `sendOpReturn`, and prints
the txid + `https://bch.loping.net/tx/<txid>`.
`sendOpReturn`'s public signature is
`sendOpReturn(msg='', prefix='6d02', bchOutput=[], satsPerByte=1.0)` — **not**
the low-level `lib/op-return.js` signature (gotcha #3). Reuse
`runSendCommand` where it fits, and add a JSON result shape.

### F3 — Multi-push OP_RETURN support (Node port of `memo-multipush.js`)
**Status: DONE** (2026-10-07, task `cli-wallet-broadcast`; merged at `d78fb09`).
`src/lib/memo-broadcast.js` exports pure `toPushBuffer`/`buildMemoPushes` and
confines the minimal-slp-wallet `Script.encode2` patch to
`broadcastMultiPush`/`attachMultiPushOpReturn`; multi-field actions become one
push per field. Spec: `psf-memo-cli/specs/memo-broadcast.feature`.
`minimal-slp-wallet`'s `sendOpReturn(msg, prefix)` hardcodes
`[OP_RETURN, prefix, msg]`, so multi-field actions (reply, topic message,
poll create/option/vote, and send-money) are silently flattened into one push
and dropped by the indexer (gotcha #35). Port the client's
`memo-multipush.js` approach into `src/lib/` (swap `bchjs.Script.encode2` for
one call so each protocol field is its own push). Node always has `Buffer`, but
if the port imports `buffer`, declare it as a direct dependency (gotcha #36).

### F4 — Little-endian txid wire encoding
**Status: DONE** (2026-10-07, task `cli-memo-wire-encoding`; merged at
`6f5c5ba`; acceptance 10/10). `psf-memo-cli/src/lib/wire-encoding.js` exposes
`txidToWireBytes` (32-byte little-endian, byte-reversed) and
`addressToHash160` (20-byte hash160 in display order, **not** reversed), backed
by the direct dependency `ecashaddrjs`. Spec:
`psf-memo-cli/specs/memo-wire-encoding.feature`; architect summary:
`docs/reviews/cli-memo-wire-encoding-summary.md`.
Every action that references a transaction (like `0x6d04`, reply `0x6d03`,
poll option `0x6d13`, poll vote `0x6d14`) must write the 32 bytes in
little-endian wire order (byte-reverse of the display txid). The 20-byte
hash160 follow/mute path is **not** reversed (gotcha #32). Provide
`txidToWireBytes` / `addressToHash160` helpers with unit + property tests.

### F5 — Output + exit-code contract
**Status: DONE** (2026-10-06, task `cli-output-contract`; merged at `e93afcf`;
acceptance 10/10). `psf-memo-cli/src/lib/reporter.js` is the pure, injectable
leaf every `memo-*` command uses: human-readable by default, `--json` prints one
object to stdout, failures report the real error on stderr, exit `0`/`1`/`2`.
Success JSON is the command's own result object; error JSON is
`{ "error": "<message>" }` on stderr. Unknown-option exit-2 handling is
deferred to a later hardening item. Spec: `psf-memo-cli/specs/cli-output-contract.feature`;
architect summary: `docs/reviews/cli-output-contract-summary.md`.

### F6 — Gherkin acceptance harness for the CLI
**Status: DONE** — landed with F1 in task `cli-memo-db-client`
(2026-10-06). `psf-memo-cli/acceptance/` now provides the generator, runtime,
step handlers, and `runner-worker`, and `verify.sh cli` runs acceptance; the
first CLI feature (`memo-db-client`) is acceptance-executable. New components
reuse the shared `runComponentAcceptance({ root, acceptanceDir, repoRoot })`
from `swarmforge/scripts/lib/acceptance-runner.cjs` rather than copying the
orchestration.

---

## Read features

Read commands never broadcast; they require no wallet unless the caller wants
viewer-relative results (mute filtering). Wallet-relative commands (R6, R11,
R12, R15) accept either `-n <wallet>` or `--wif <wif>` (see F2); commands that
only need an address take `--viewer`/`-a <addr>` instead.

| ID | Command | Behavior | Source / notes |
|----|---------|----------|----------------|
| R1 | `memo-feed [--limit --offset --viewer <addr> --json]` | One page of the recent top-level feed, newest first. | `GET /posts/recent`; fields `txid`, `addr`, `text`, `seen`, `blockHeight`, `replyCount`, `likeCount`, `pagination`. |
| R2 | `memo-thread -t <txid> [--json]` | A post and its reply tree with like counts. | `GET /posts/:txid/thread`. |
| R3 | `memo-get-post -t <txid> [--json]` | A single post document. | `GET /level/post/:txid`. |
| R4 | `memo-profile -a <addr> [--json]` | Composed identity: name, bio, avatar URL, follow state, recent posts, token count summary. | `/level/name|profile|profilepic`, `/posts/by/:addr`, `/follow/state`. |
| R5 | `memo-posts -a <addr> [--limit --offset --json]` | Posts authored by an address. | `GET /posts/by/:addr`. |
| R6 | `memo-notifications -n <wallet> [--limit --offset --json]` | Likes, replies, and follows for the wallet's address, newest first, within the notification block window. | `GET /posts/notifications/:addr`; window semantics in gotcha #21 / `notifications-query-performance`. |
| R7 | `memo-topics [--limit --offset --json]` | Topic list with last-post time, post count, follower count, ordered by recency. | `GET /topics`. |
| R8 | `memo-topic -r <room> [--limit --offset --json]` | A topic's posts (optionally viewer-filtered). | `GET /topics/:room/posts`. |
| R9 | `memo-search -q <query> [--limit --offset --viewer --json]` | Full-text post search. | `GET /search`. |
| R10 | `memo-profiles [--limit --offset --json]` | Recently active profiles with display name and avatar. | `GET /profile/recent`; identity join in `recent-profile-identity`. |
| R11 | `memo-following -n <wallet> [--json]` / `memo-followers -a <addr>` | Addresses the wallet follows / an address's followers. | `GET /follow/following/:addr`, `/follow/followers/:addr`. |
| R12 | `memo-muted -n <wallet> [--json]` | Addresses the wallet has muted. | `GET /mute/muted/:muter`. |
| R13 | `memo-poll -t <txid> [--json]` | A poll with options and current votes. | `GET /polls/:txid`, `/options`, `/votes`. |
| R14 | `memo-status [--json]` | Indexer sync state: `startBlockHeight`, `syncedBlockHeight`, `chainBlockHeight`. | `GET /level/status/status`. Lets an agent know whether its broadcast can be visible yet. |
| R15 | `memo-identity -n <wallet> [--json]` | The wallet's own Memo identity: cash address, name, bio, avatar, BCH/SLP balances. | Composes `wallet-balance` + R4 for the wallet address. |
| R16 | `memo-wait -t <txid> [--timeout --interval --json]` | Poll until a broadcast tx is indexed (visible via `/level/post` or thread), then print it; non-zero on timeout. | Makes the async write→index→read path scriptable (backlog "Notes for future cycles"). |

**R1 status: DONE** (2026-10-07, task `cli-memo-feed`; merged at `bbf680b`;
acceptance 11/11). Spec: `psf-memo-cli/specs/memo-feed.feature`; architect
summary: `docs/reviews/cli-memo-feed-summary.md`.

**R2 status: DONE** (2026-10-07, task `cli-memo-thread`; merged at `8fe83ce`;
acceptance 9/9). Spec: `psf-memo-cli/specs/memo-thread.feature`; architect
summary: `docs/reviews/cli-memo-thread-summary.md`.

**R3 status: DONE** (2026-10-07, task `cli-memo-get-post`; merged at `373912d`;
acceptance 5/5). Spec: `psf-memo-cli/specs/memo-get-post.feature`; architect
summary: `docs/reviews/cli-memo-get-post-summary.md`.

**R14 status: DONE** (2026-10-07, task `cli-memo-status`; merged at `a9aa65a`;
acceptance 5/5). Spec: `psf-memo-cli/specs/memo-status.feature`; architect
summary: `docs/reviews/cli-memo-status-summary.md`.

**R15 status: DONE** (2026-10-07, task `cli-memo-identity`; merged at `df32bc0`;
acceptance 11/11). Spec: `psf-memo-cli/specs/memo-identity.feature`; architect
summary: `docs/reviews/cli-memo-identity-summary.md`.

**R16 status: DONE** (2026-10-07, task `cli-memo-wait`; merged at `d4ca45a`;
acceptance 9/9). Spec: `psf-memo-cli/specs/memo-wait.feature`; architect
summary: `docs/reviews/cli-memo-wait-summary.md`.

**R6 status: DONE** (2026-10-07, task `cli-memo-notifications`; merged at
`8446473`; acceptance 11/11). Spec:
`psf-memo-cli/specs/memo-notifications.feature`; architect summary:
`docs/reviews/cli-memo-notifications-summary.md`.

**R4 status: DONE** (2026-10-07, task `cli-memo-profile`; merged at `dcf66fd`;
acceptance 12/12). Spec: `psf-memo-cli/specs/memo-profile.feature`; architect
summary: `docs/reviews/cli-memo-profile-summary.md`.

**R5 status: DONE** (2026-10-07, task `cli-memo-posts`; merged at `b6d7fac`;
acceptance 10/10). Spec: `psf-memo-cli/specs/memo-posts.feature`; architect
summary: `docs/reviews/cli-memo-posts-summary.md`.

**R7 status: DONE** (2026-10-07, task `cli-memo-topics`; merged at `5559269`;
acceptance 10/10). Spec: `psf-memo-cli/specs/memo-topics.feature`; architect
summary: `docs/reviews/cli-memo-topics-summary.md`.

**R8 status: DONE** (2026-10-07, task `cli-memo-topic`; merged at `085e873`;
acceptance 12/12). Spec: `psf-memo-cli/specs/memo-topic.feature`; architect
summary: `docs/reviews/cli-memo-topic-summary.md`.

**R9 status: DONE** (2026-10-08, task `cli-memo-search`; merged at `850674c`;
acceptance 11/11). Spec: `psf-memo-cli/specs/memo-search.feature`; architect
summary: `docs/reviews/cli-memo-search-summary.md`.

**R10 status: DONE** (2026-10-08, task `cli-memo-profiles`; merged at
`44e1c1e`; acceptance 12/12). Spec: `psf-memo-cli/specs/memo-profiles.feature`;
architect summary: `docs/reviews/cli-memo-profiles-summary.md`.

**R11 status: DONE** (2026-10-08, task `cli-follow-lists`; merged at `9bffb8a`;
acceptance 8/8 across `memo-following` and `memo-followers`). Specs:
`psf-memo-cli/specs/memo-following.feature`,
`psf-memo-cli/specs/memo-followers.feature`; architect summary:
`docs/reviews/cli-follow-lists-summary.md`.

**R12 status: DONE** (2026-10-08, task `cli-memo-muted`; merged at `7367b74`;
acceptance 5/5). Spec: `psf-memo-cli/specs/memo-muted.feature`; architect
summary: `docs/reviews/cli-memo-muted-summary.md`.

**R13 status: DONE** (2026-10-08, task `cli-memo-poll`; merged at `2a34ccc`;
acceptance 9/9). Spec: `psf-memo-cli/specs/memo-poll.feature`; architect
summary: `docs/reviews/cli-memo-poll-summary.md`. With R13, all read commands
(R1–R16) are complete.

---

## Write features (Memo broadcasts)

Each write command follows F2/F3/F4, requires a wallet via `-n <wallet>` or
`--wif <wif>`, enforces its protocol limit, and reports the txid (plus explorer
link in human mode, plus the txid in `--json`). All limits are byte counts
unless noted.

| ID | Command | Action | Payload / limit | Source / notes |
|----|---------|--------|-----------------|----------------|
| W1 | `memo-post -n <wallet> -m <text> [--json]` | `0x6d02` post | text ≤ 217 **characters** (UTF-16) | Mirrors `memo-post.js`; gotcha #7. |
| W2 | `memo-reply -n <wallet> -t <parent> -m <text> [--json]` | `0x6d03` reply | LE txid (32) + text ≤ 184 bytes | Multi-push (F3); mirrors `memo-reply.js`. |
| W3 | `memo-like -n <wallet> -t <post> [--tip <sats> --author <addr>] [--json]` | `0x6d04` like/tip | LE txid (32); tip ≥ 600 sats, ≤ 1 BCH, needs author address | Mirrors `memo-like.js`; dust rules and spendable-balance check. |
| W4 | `memo-name -n <wallet> -m <name> [--json]` | `0x6d01` set name | name ≤ 77 **bytes** | `memo-set-name.js`; byte counting for memo.cash parity (gotcha #7). |
| W5 | `memo-bio -n <wallet> -m <text> [--json]` | `0x6d05` set profile text | ≤ 217 bytes | `memo-set-bio.js`. |
| W6 | `memo-avatar -n <wallet> -u <url> [--json]` | `0x6d0a` set profile picture | ≤ 217 bytes | `memo-set-avatar-url.js`. |
| W7 | `memo-follow -n <wallet> -a <addr>` / `memo-unfollow ...` | `0x6d06` / `0x6d07` | 20-byte hash160 of the cash address | `memo-follow.js`; do **not** reverse the hash (gotcha #32). |
| W8 | `memo-mute -n <wallet> -a <addr>` / `memo-unmute ...` | `0x6d16` / `0x6d17` | 20-byte hash160 | `memo-mute.js`; persistence depends on the DB `mute` entity route (gotcha #60). |
| W9 | `memo-topic-post -n <wallet> -r <room> -m <text> [--json]` | `0x6d0c` topic message | room + text ≤ 214 bytes combined | Multi-push (F3); mirrors `memo-topic-post.js`. |
| W10 | `memo-topic-follow -n <wallet> -r <room>` / `memo-topic-unfollow ...` | `0x6d0d` / `0x6d0e` | topic name | `memo-topic-follow.js`. |

**W1 status: DONE** (2026-10-07, task `cli-memo-post`; merged at `756747e`;
acceptance 11/11). Spec: `psf-memo-cli/specs/memo-post.feature`; architect
summary: `docs/reviews/cli-memo-post-summary.md`.

**W2 status: DONE** (2026-10-07, task `cli-memo-reply`; merged at `89fe739`;
acceptance 14/14). Spec: `psf-memo-cli/specs/memo-reply.feature`; architect
summary: `docs/reviews/cli-memo-reply-summary.md`.

**W3 status: DONE** (2026-10-07, task `cli-memo-like`; merged at `aa617ed`;
acceptance 20/20). Spec: `psf-memo-cli/specs/memo-like.feature`; architect
summary: `docs/reviews/cli-memo-like-summary.md`.

**W4 status: DONE** (2026-10-08, task `cli-memo-name`; merged at `14d4407`;
acceptance 11/11). Spec: `psf-memo-cli/specs/memo-name.feature`; architect
summary: `docs/reviews/cli-memo-name-summary.md`.

**W5 status: DONE** (2026-10-08, task `cli-memo-bio`; merged at `ab6f909`;
acceptance 11/11). Spec: `psf-memo-cli/specs/memo-bio.feature`; architect
summary: `docs/reviews/cli-memo-bio-summary.md`.

**W6 status: DONE** (2026-10-08, task `cli-memo-avatar`; merged at `b7686b1`;
acceptance 11/11). Spec: `psf-memo-cli/specs/memo-avatar.feature`; architect
summary: `docs/reviews/cli-memo-avatar-summary.md`.

**W7/W8 status: DONE** (2026-10-08, task `cli-follow-mute`; merged at `0e89edc`;
acceptance 28/28 across `memo-follow`, `memo-unfollow`, `memo-mute`,
`memo-unmute`). Specs:
`psf-memo-cli/specs/memo-{follow,unfollow,mute,unmute}.feature`; architect
summary: `docs/reviews/cli-follow-mute-summary.md`.

**W9/W10 status: DONE** (2026-10-08, task `cli-topic-writes`; merged at
`c46a728`; acceptance 24/24 across `memo-topic-post`, `memo-topic-follow`,
`memo-topic-unfollow`). Specs:
`psf-memo-cli/specs/memo-{topic-post,topic-follow,topic-unfollow}.feature`;
architect summary: `docs/reviews/cli-topic-writes-summary.md`.

### Planned / deferred write actions

| ID | Command | Action | Status |
|----|---------|--------|--------|
| W14 | `memo-repost` | `0x6d0b` repost | Deferred: the v1 indexer does not handle `0x6d0b` yet. Needs indexer + DB read support first. |
| W15 | `memo-send-money` | `0x6d24` send money | Deferred: not in the v1 indexer handler set; would need indexer + DB support. The existing `send-bch` covers raw transfers. |
| W16 | `memo-token-*` | MIP-0009 `0x6d30`–`0x6d35` token exchange | Out of scope for now; needs protocol parity work across indexer and DB. |
| W11–W13 | `memo-poll-create` / `memo-poll-option` / `memo-poll-vote` | `0x6d10` / `0x6d13` / `0x6d14` | Dropped by user decision (2026-10-08); not planned. The read-only `memo-poll` (R13) remains. |

---

## Cross-cutting features and requirements

- **X1 — Command reference docs.** **DONE** (2026-10-08, task
  `cli-command-reference`; merged to `master` at `0541746`; docs-only, no
  Gherkin). `psf-memo-cli/README.md` and `src/commands/README.md` now document
  every `memo-*` command, flags (including `--json` and the `-n`/`--wif` wallet
  source), JSON shape, and exit codes; `.env.example` documents `MEMO_DB_URL`
  (production default). Spec: `psf-memo-cli/dev-docs/command-reference.md`;
  architect summary: `docs/reviews/cli-command-reference-summary.md`.
- **X2 — Error surfacing.** Broadcast failures print the real node/wallet error
  (`Failed to broadcast: <msg>`), never a generic "must not be empty"
  (gotcha #5). Validation errors name the exact flag and limit.
- **X3 — Secret hygiene.** Never print mnemonics, WIFs, or the wallet JSON.
  `--json` output must not include key material.
- **X4 — Read-only safety.** Read commands must not instantiate or unlock a
  wallet unless viewer-relative data is requested; a missing wallet file then
  does not break `memo-feed`/`memo-status`.
- **X5 — Quality and verification.** Every command ships unit tests, property
  tests where invariants exist (encoding, pagination, limit math), and Gherkin
  acceptance (F6 is in place). Keep `verify.sh cli` green and preserve the
  `cli-quality-hardening` baseline (CRAP ≤ 6, DRY clean, mutation 0 survivors,
  100% coverage, lint).
- **X6 — Pagination fidelity.** Read commands expose `limit`/`offset` and pass
  through `pagination` unchanged, including the documented total cap
  (`min(actual, 500)`; gotcha #21). Do not imply an exact total beyond the cap.
- **X7 — Async visibility contract.** Document that a broadcast is not visible
  until confirmed and indexed; `memo-wait` (R16) is the scriptable bridge.

---

## Suggested delivery order

1. **Foundation**: F1 **DONE**; F5 **DONE**; F4 **DONE**; F2/F3 (wallet
   resolution + broadcast scaffolding + multi-push) **DONE**. The foundation is
   complete. **R1 (`memo-feed`), R2 (`memo-thread`), R3 (`memo-get-post`), R14
   (`memo-status`), and R15 (`memo-identity`) DONE**.
2. **Read-first value**: R1 **DONE**, R2 **DONE**, R3 **DONE**, R14 **DONE**,
   R15 **DONE** — an agent can observe the protocol and its own identity before
   writing.
3. **Core write path**: W1 (post) **DONE**, W2 (reply) **DONE**, W3 (like)
   **DONE**, R4 (profile) **DONE**, R5 (posts) **DONE**, R6 (notifications)
   **DONE**, R7 (topics) **DONE**, R8 (topic posts) **DONE**, and R16 (wait)
   **DONE**. The foundation (F2/F3/F4), the shared write-command scaffolding,
   and the shared post-page read pipeline are in place. All read commands
   (R1–R16) are complete, and the profile writes W4–W6, the social-graph
   writes W7/W8, and the topic writes W9/W10 (`memo-topic-post`,
   `memo-topic-follow`/`memo-topic-unfollow`) are done. The poll writes
   W11–W13 were dropped by user decision (2026-10-08), so the shipped write set
   is complete; the remaining work is the cross-cutting X-series (below).
4. **Social graph**: W7/W8 (follow/mute) with R11/R12, R4/R5 (profiles).
5. **Topics and polls**: R7–R9, R13, W9–W10 (poll writes W11–W13 dropped).
6. **Hardening**: X1 **DONE**; X2–X7 remain, plus W14–W16 if protocol support is
   added upstream.

**Next up: X2 (error surfacing).** X1 command reference docs are DONE (merged
at `0541746`). Poll writes W11–W13 are intentionally not planned (user decision,
2026-10-08).

Each numbered item is delivered as its own specifier → coder → refactorer →
architect cycle.

---

## Resolved decisions (2026-10-06)

1. **Command naming**: flat `memo-<action>` (consistent with
   `wallet-*`/`send-*`). No nested `memo` group.
2. **Default DB**: production `https://memo-api.fullstackcash.net`
   (overridable via `MEMO_DB_URL` or `--db-url`; local dev uses
   `http://localhost:5021`).
3. **Wallet identity**: support both `-n <wallet>` and `--wif <wif>`.
4. **JSON scope**: `--json` on every command.
5. **F6 acceptance**: onboard CLI Gherkin acceptance after the first `memo-*`
   command. Satisfied at F1 — the harness landed with `cli-memo-db-client`
   (2026-10-06).
6. **Command naming collision (2026-10-07)**: the single-post read command is
   `memo-get-post` (`-t <txid>`, `GET /level/post/:txid`). The write command
   `memo-post` (W1, `-n`/`--wif` + `-m <text>`, broadcast `0x6d02`) keeps its
   name because "post" is its action; the two commands therefore never share a
   name.

## Out of scope

- Interactive/TUI flows, prompts, or confirmations.
- Reimplementing chain scanning; the CLI only reads `psf-memo-db` and
  broadcasts transactions.
- Protocol actions the v1 indexer does not handle (`0x6d0b`, `0x6d24`, MIP-0009)
  until indexer + DB support exists.
- Changing the web client or the DB/indexer as part of CLI-only features;
  cross-component changes get their own specs and task descriptions.

## Protocol reference

Action bytes and limits (full table in the root
`specs/feature-backlog.md` and `memo.sv/protocol`). The CLI must not exceed:

| Action | Limit |
|--------|-------|
| `6d01` set name | 77 bytes |
| `6d02` post | 217 characters |
| `6d03` reply | 32 + 184 bytes |
| `6d04` like/tip | 32 bytes |
| `6d05` set profile text | 217 bytes |
| `6d06`/`6d07` follow/unfollow | 20 bytes |
| `6d0a` set profile picture | 217 bytes |
| `6d0c` topic message | 214 bytes combined |
| `6d10` create poll | 1 + 1 + 209 bytes |
| `6d13` add poll option | 32 + 184 bytes |
| `6d14` poll vote | 32 + 184 bytes |
| `6d16`/`6d17` mute/unmute | 20 bytes |
