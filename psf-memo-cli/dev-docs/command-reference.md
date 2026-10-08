# psf-memo-cli Command Reference (X1)

**Task name:** `cli-command-reference`
**Owner:** specifier (specification); coder (docs); architect (verification).
**Status:** DONE (2026-10-08); merged to `master` at `0541746` (docs-only, no
Gherkin; architect verification record
`docs/reviews/cli-command-reference-verification.json`).
**Backlog item:** X1 in `psf-memo-cli/dev-docs/feature-backlog.md`.

X1 is a documentation deliverable, not runtime behavior. There is no Gherkin
feature and no acceptance mutation for this task; the architect verifies by
inspection against the checklist below. `verify.sh cli` must still pass
unchanged (the change is Markdown only).

## Goal

The `memo-*` command set is live but undocumented. `README.md` documents only
the pre-existing wallet/crypto commands, and `src/commands/README.md` documents
the output contract but not the commands. Every `memo-*` command must be
documented so a human or agent can discover the command, its flags, its JSON
result, and its exit codes without reading source.

## Deliverables

1. **`psf-memo-cli/README.md`** — add a user-facing reference covering every
   command, grouped (Wallet, Send, Cryptography, Memo reads, Memo writes).
   Existing wallet/crypto sections stay; add the memo sections.
2. **`psf-memo-cli/src/commands/README.md`** — keep the structure/output
   contract and add a complete developer-facing index of every `memo-*`
   command: name, action byte (writes), required flags, and JSON data keys,
   linking to `README.md` for usage examples.
3. **`psf-memo-cli/.env.example`** — `MEMO_DB_URL` is already present with the
   production default. Verify it is described correctly; no other change
   expected.

## Shared contracts to document once and reference per command

- Invocation: `node psf-memo-cli.js <command> [flags]`.
- `--json` prints exactly one JSON object to stdout; human-readable text is the
  default.
- Success JSON: `{ "message": "<human summary>", ...data }` — `message` plus
  the command's data fields.
- Failure JSON: `{ "error": "<message>" }` printed to stderr. Diagnostics never
  go to stdout.
- Exit codes: `0` success, `1` runtime/not-found failure, `2` usage (missing or
  invalid required flag). A broadcast failure always surfaces the real wallet
  error (exit `1`), never a generic message (gotcha #5).
- Wallet source: wallet-relative commands require exactly one of
  `-n, --name <wallet>` or `--wif <wif>`; neither or both is exit `2`.
- DB endpoint: `--db-url <url>` overrides `MEMO_DB_URL`; default production
  `https://memo-api.fullstackcash.net`; local dev `http://localhost:5021`.
- Page flags: `-l, --limit` (default 50) and `-o, --offset` (default 0). The
  service pagination object `{ limit, offset, total, hasMore }` is passed
  through unchanged; `total` is capped at 500 (gotcha #21), so do not claim an
  exact total beyond the cap.
- Read-only safety: read commands never unlock a wallet unless viewer-relative
  data is requested.

## Command inventory (all must be documented)

### Memo read commands

| Command | Required flag(s) | Optional flags | Route |
|---------|------------------|----------------|-------|
| `memo-feed` | — | `-l/--limit`, `-o/--offset`, `--viewer`, `--db-url`, `--json` | `GET /posts/recent` |
| `memo-thread` | `-t/--txid` | `--db-url`, `--json` | `GET /posts/:txid/thread` |
| `memo-get-post` | `-t/--txid` | `--db-url`, `--json` | `GET /level/post/:txid` |
| `memo-status` | — | `--db-url`, `--json` | `GET /level/status/status` |
| `memo-identity` | `-n/--name` or `--wif` | `--db-url`, `--json` | wallet balances + `/level/(name\|profile\|profilepic)` |
| `memo-wait` | `-t/--txid` | `--timeout` (60000), `--interval` (5000), `--db-url`, `--json` | polls `GET /level/post/:txid` |
| `memo-notifications` | `-n/--name` or `--wif` | `-l/--limit`, `-o/--offset`, `--db-url`, `--json` | `GET /posts/notifications/:addr` |
| `memo-profile` | `-a/--addr` | `--viewer`, `-l/--limit`, `-o/--offset`, `--db-url`, `--json` | `/level/*` + `GET /posts/by/:addr` + `GET /follow/state` |
| `memo-posts` | `-a/--addr` | `-l/--limit`, `-o/--offset`, `--db-url`, `--json` | `GET /posts/by/:addr` |
| `memo-topics` | — | `-l/--limit`, `-o/--offset`, `--db-url`, `--json` | `GET /topics` |
| `memo-topic` | `-r/--room` | `--viewer`, `-l/--limit`, `-o/--offset`, `--db-url`, `--json` | `GET /topics/:room/posts` |
| `memo-search` | `-q/--query` | `--viewer`, `-l/--limit`, `-o/--offset`, `--db-url`, `--json` | `GET /search` |
| `memo-profiles` | — | `-l/--limit`, `-o/--offset`, `--db-url`, `--json` | `GET /profile/recent` |
| `memo-following` | `-n/--name` or `--wif` | `--db-url`, `--json` | `GET /follow/following/:addr` |
| `memo-followers` | `-a/--addr` | `--db-url`, `--json` | `GET /follow/followers/:addr` |
| `memo-muted` | `-n/--name` or `--wif` | `--db-url`, `--json` | `GET /mute/muted/:addr` |
| `memo-poll` | `-t/--txid` | `--db-url`, `--json` | `GET /polls/:txid` |

### Memo write commands

Every write command also requires a wallet source (`-n/--name` or `--wif`) and
accepts `--json`.

| Command | Action byte | Required field flags | Protocol limit |
|---------|-------------|----------------------|----------------|
| `memo-post` | `0x6d02` | `-m/--memo` | ≤ 217 UTF-16 code units |
| `memo-reply` | `0x6d03` | `-t/--txid`, `-m/--memo` | 32-byte LE txid + ≤ 184 UTF-8 bytes |
| `memo-like` | `0x6d04` | `-t/--txid` | 32-byte LE txid; `--tip` 600–100000000 sats and `--author` required with `--tip` |
| `memo-name` | `0x6d01` | `-m/--memo` | ≤ 77 UTF-8 bytes |
| `memo-bio` | `0x6d05` | `-m/--memo` | ≤ 217 UTF-8 bytes |
| `memo-avatar` | `0x6d0a` | `-u/--url` | ≤ 217 UTF-8 bytes |
| `memo-follow` | `0x6d06` | `-a/--addr` | 20-byte hash160 (display order, not reversed) |
| `memo-unfollow` | `0x6d07` | `-a/--addr` | 20-byte hash160 |
| `memo-mute` | `0x6d16` | `-a/--addr` | 20-byte hash160 |
| `memo-unmute` | `0x6d17` | `-a/--addr` | 20-byte hash160 |
| `memo-topic-post` | `0x6d0c` | `-r/--room`, `-m/--memo` | room + message ≤ 214 UTF-8 bytes combined |
| `memo-topic-follow` | `0x6d0d` | `-r/--room` | topic room name |
| `memo-topic-unfollow` | `0x6d0e` | `-r/--room` | topic room name |

Write commands that reference a transaction (`memo-reply`, `memo-like`) write
the txid in little-endian wire order (gotcha #32). All multi-field writes are
one OP_RETURN push per field (gotcha #35).

## JSON data shapes to document per command

`message` is always present; the listed keys are the additional data fields:

| Command(s) | Data fields |
|------------|-------------|
| all write commands | `txid`, `explorerUrl` |
| `memo-feed`, `memo-posts`, `memo-topic` | `posts`, `pagination` |
| `memo-notifications` | `notifications`, `pagination` |
| `memo-topics` | `topics`, `pagination` |
| `memo-profiles` | `profiles`, `pagination` |
| `memo-search` | `posts`, `profiles`, `pagination` |
| `memo-thread`, `memo-get-post`, `memo-wait` | `post` |
| `memo-status` | `status` |
| `memo-poll` | `poll` |
| `memo-following` | `following` |
| `memo-followers` | `followers` |
| `memo-muted` | `muted` |
| `memo-identity` | `address`, `bchBalance`, `tokens`, `name`, `bio`, `avatar` |
| `memo-profile` | `address`, `name`, `bio`, `avatar`, `following`, `posts`, `pagination` |

`tokens` entries are `{ ticker, tokenId, qty }`.

## Verification checklist (architect)

1. `README.md` documents every command in the inventory above, grouped, with
   flags, defaults, JSON shape, exit codes, and at least one example per
   command.
2. `src/commands/README.md` indexes every `memo-*` command and retains the
   shared output/exit-code contract.
3. Flags, defaults, and JSON data keys match `psf-memo-cli.js` and the
   command/lib data objects (no invented fields, no missing flags).
4. `.env.example` documents `MEMO_DB_URL` with the production default.
5. `verify.sh cli` still passes; no code or test files changed.
6. Note in the review summary that soft Gherkin mutation is not applicable
   (documentation-only task).

## Process

- Coder: apply the documentation, commit with `By coder.`, hand off to the
  refactorer.
- Refactorer: no code change expected; forward the handoff.
- Architect: verify against the checklist, emit
  `docs/reviews/cli-command-reference-verification.json` and
  `docs/reviews/cli-command-reference-summary.md`, then hand off to the
  specifier for merge.
