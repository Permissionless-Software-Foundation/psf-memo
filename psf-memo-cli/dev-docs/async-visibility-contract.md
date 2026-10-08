# psf-memo-cli Async Visibility Contract (X7)

**Task name:** `cli-async-visibility`
**Owner:** specifier (specification); coder (docs); architect (verification).
**Status:** DRAFT — awaiting user approval to hand off.
**Backlog item:** X7 in `psf-memo-cli/dev-docs/feature-backlog.md`.

X7 is a documentation deliverable, not runtime behavior. There is **no Gherkin
feature and no Gherkin acceptance mutation** for this task; the behavior is
already pinned by `psf-memo-cli/specs/memo-wait.feature` (R16) and
`psf-memo-cli/specs/memo-status.feature` (R14). `verify.sh cli` must still pass
unchanged (the change is Markdown only).

## Goal

Document the async visibility contract so a human or agent understands that a
Memo write is not immediately readable: a `memo-*` write command reports its
txid as soon as the wallet broadcasts, but the action only appears in the read
commands after the transaction is confirmed in a block and indexed by
`psf-memo-indexer` into `psf-memo-db`. Point readers at `memo-status` (to see
whether the indexer has caught up) and `memo-wait` (the scriptable
write -> index -> read bridge).

## Facts the documentation must state (verified against the code)

1. **Writes return before the action is visible.** Every `memo-*` write command
   broadcasts the OP_RETURN through the wallet and reports
   `{ message, txid, explorerUrl }` (explorer link
   `https://bch.loping.net/tx/<txid>`) as soon as the wallet accepts it. The
   txid is real, but the action is not yet stored or readable.
2. **Reads reflect indexed state only.** Read commands query `psf-memo-db`,
   which is populated by `psf-memo-indexer`. A just-broadcast action is absent
   from `memo-feed`, `memo-thread`, `memo-get-post`, `memo-profile`,
   `memo-posts`, `memo-search`, `memo-topic`, `memo-notifications`, etc. until
   (a) the transaction is confirmed in a BCH block and (b) the indexer has
   processed that block and written the store. There is no read-after-write
   consistency: an immediate read is expected to miss the action.
3. **Check the indexer with `memo-status`.** `memo-status` reports
   `startBlockHeight`, `syncedBlockHeight` (the last fully indexed block), and
   `chainBlockHeight` (the chain tip at the last sync), so an agent can tell
   whether the indexer has reached the block containing the transaction.
4. **Wait for the post with `memo-wait`.** `memo-wait -t <txid>` queries
   `GET /level/post/:txid` immediately, then every `--interval` (default 5000
   ms) until the post is stored, and reports it (exit 0). A timeout is a runtime
   error (exit 1); the default `--timeout` budget is 60000 ms. It is the
   scriptable bridge for the async write -> index -> read path.
   - Scope: it polls the **post store** only, so it waits for posts (`0x6d02`)
     and replies (`0x6d03`), which have a stored post document. Other actions
     (like `0x6d04`, follow/unfollow `0x6d06`/`0x6d07`, name `0x6d01`, profile
     text `0x6d05`, avatar `0x6d0a`, topic `0x6d0c`–`0x6d0e`) have no post
     document; wait for the containing block via `memo-status`, then re-run the
     relevant read command.
5. **A scriptable example.** Show a write, capture the txid from `--json`, wait,
   then read. For example:

   ```sh
   txid=$(node psf-memo-cli.js memo-post -n wallet1 -m "hello memo" --json | jq -r .txid)
   node psf-memo-cli.js memo-wait -t "$txid" --timeout 600000 --json
   node psf-memo-cli.js memo-get-post -t "$txid" --json
   ```

   (Use a long `--timeout` because BCH confirmation plus indexing can exceed the
   60 s default.)

## Deliverables

1. **`psf-memo-cli/README.md`** — add an "Async visibility" subsection under
   `## Memo Protocol Commands` (after "Shared contracts" and before the read
   table, or after the write table; pick the placement that reads best). It must
   cover items 1–5 above, and cross-reference the `memo-wait` and `memo-status`
   rows.
2. **`psf-memo-cli/src/commands/README.md`** — add a short note to the contract
   section: read commands reflect indexed state only; write commands return the
   txid before the action is readable; `memo-wait` is the shared bridge for the
   post store. Keep it brief; the README owns the full prose.
3. No other files. Do not edit `psf-memo-cli/dev-docs/command-reference.md`
   (the X1 specification) or any command source.

## Verification checklist (architect)

1. `README.md` documents the async visibility contract: immediate txid,
   read-after-write is expected to miss, confirmation + indexing dependency,
   `memo-status` sync fields, `memo-wait` usage/flags/timeout/post-only scope,
   and a scriptable example.
2. `src/commands/README.md` carries the short contract note and points at
   `memo-wait`.
3. Every claim matches the code: `memo-wait` polls `GET /level/post/:txid`;
   `memo-status` reports `startBlockHeight`/`syncedBlockHeight`/
   `chainBlockHeight`; write JSON is `{ message, txid, explorerUrl }`.
4. `verify.sh cli` still passes; no code or test files changed.
5. Note in the review summary that soft Gherkin mutation is not applicable
   (documentation-only task).

## Process

- Coder: apply the documentation, commit with `By coder.`, hand off to the
  refactorer.
- Refactorer: no code change expected; forward the handoff.
- Architect: verify against the checklist, emit
  `docs/reviews/cli-async-visibility-verification.json` and
  `docs/reviews/cli-async-visibility-summary.md`, then hand off to the specifier
  for merge.
