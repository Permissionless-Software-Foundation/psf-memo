# cli-async-visibility — Architect Review

**By architect.**

**Task:** `cli-async-visibility` (X7: async visibility contract)
**Component:** `psf-memo-cli`
**Merged refactorer tip:** `2fd3e2edb7`
**Architect review commit:** `b5663c7fd3` (merge; no code changes)
**Verification record:** `docs/reviews/cli-async-visibility-verification.json`
(`git_sha` `b5663c7fd3`)

## Commits reviewed

The `swarmforge-refactorer` one-item `BATCH` carried the X6 completion record,
the X7 specification, and the coder's documentation. This is a
documentation-only deliverable; the refactorer made no code change and simply
merged the coder branch.

| Commit | Role | Summary |
|--------|------|---------|
| `d8f15ee` | specifier | Record `cli-pagination-fidelity` (X6) completion and merge |
| `5861c56` | specifier | Specify async visibility contract (X7) — `psf-memo-cli/dev-docs/async-visibility-contract.md` |
| `f6b8594` | coder | Document the async visibility contract in `README.md` and `src/commands/README.md` (docs only) |
| `2fd3e2e` | refactorer | Merge coder `cli-async-visibility` into refactorer |
| `b5663c7` | architect | Merge refactorer `cli-async-visibility` into architect |

No tool-written manifests were produced (no production source changed), so the
architect review commit carries no review churn — only the merge.

## Architectural findings and fixes applied

1. **Documentation-only task; no runtime behavior changed (confirmed).** The
   diff touches only Markdown: `psf-memo-cli/README.md`,
   `psf-memo-cli/src/commands/README.md`, the new
   `dev-docs/async-visibility-contract.md`, and the backlog/specifier docs. No
   `.js` or test file changed, so there is nothing to mutate, dry, or re-verify
   behaviorally.

2. **Every documented claim matches the code (verified against source):**
   - `memo-wait` polls `GET /level/post/:txid` (`MemoWait.readPost` ->
     `MemoDb.getPost`), default `--interval` **5000 ms**
     (`DEFAULT_WAIT_INTERVAL_MS`) and default `--timeout` **60000 ms**
     (`DEFAULT_WAIT_TIMEOUT_MS`), a timeout throwing a runtime error (exit 1),
     and it is **post-store only**.
   - `memo-status` reports `startBlockHeight`, `syncedBlockHeight`, and
     `chainBlockHeight`.
   - Write JSON is `{ message, txid, explorerUrl }`: `runWriteCommand` returns
     `{ message, data: { txid, explorerUrl } }` and `Reporter.result` writes
     `{ message, ...data }`.
   - The explorer link is `https://bch.loping.net/tx/<txid>`
     (`MEMO_EXPLORER_URL` + txid in `src/lib/memo-broadcast.js`).

3. **Placement and cross-reference are correct.** The `### Async visibility`
   subsection sits under `## Memo Protocol Commands`, and the
   `src/commands/README.md` note links to it as
   `../../README.md#async-visibility` — the correct relative path and GitHub
   anchor. The contract note points readers at `memo-wait` and `memo-status`
   without duplicating the full prose.

4. **No structural fix needed.** The docs live at the right boundary
   (component README for the full contract, command README for the short note)
   and describe existing behavior rather than introducing new guarantees.

## Verification

- **Language mutation:** no production file changed. The X5 full-`src/` sweep
  (183 sites / 180 killed / 3 documented intrinsic survivors) remains current.
- **DRY:** no code changed; nothing to analyze.
- **Soft Gherkin acceptance mutation is not applicable to this task** (X7 has
  no Gherkin feature; the behavior is already pinned by
  `specs/memo-wait.feature` and `specs/memo-status.feature`, per the X7 spec).
- **Contract verification:** all five X7 spec checklist items confirmed against
  the code (see findings above), including the scriptable
  write → index → read example's commands and flags.

### Suite status

`verify.sh cli`, record `b5663c7fd3`: unit **580 passing**, property
**110 pass / 0 fail**, acceptance **all 38 suites passed**, lint **ok** —
result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-async-visibility`, final tip below
  (end-of-chain merge notification; no coder or refactorer follow-up work was
  required).
