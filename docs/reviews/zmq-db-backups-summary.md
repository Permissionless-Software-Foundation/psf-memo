# zmq-db-backups — Architect Review Summary

**By architect.**

## Task and commits reviewed
- Task: `zmq-db-backups` (refactorer handoff, `merge_and_process refactorer 89731964de`)
- Merged `swarmforge-refactorer` (fast-forward) — commits:
  - `edcb8c8` Spec ZMQ-mode DB backups every epoch
  - `2d193c6` Implement ZMQ-mode DB backups every epoch blocks (coder)
  - `8973196` Refactor ZMQ DB backups: add property coverage and constructor test (refactorer)

## Architectural findings and fixes
- **Cohesion / DRY (fixed):** In `psf-memo-block-indexer.js` the IBD catch-up path
  duplicated the backup decision (`if (nextBlockHeight % epoch === 0)`) that the
  `BackupDb.maybeBackupDb` use case already encapsulates, while the ZMQ live path
  correctly delegated the decision. Removed the redundant guard and now use the
  use case's boolean return to decide whether to log. The decision now lives in
  exactly one place.
- **Boundaries (confirmed good):** `BackupDb` (use case) is a pure decision
  function depending only on the `dbCtrl.backupDb` adapter interface; the HTTP
  IO lives in `src/adapters/backup-db.js`. The use case is fully testable without
  IO. No framework/persistence structures leak across the boundary.
- **Hardening (added):** Added a unit test for the `height === 1` boundary to kill
  a surviving mutation (`height > 0` → `height > 1`).

## Verification results
- **Language mutation** (`mutate4javascript`, `--max-workers 8`): `src/use-cases/backup-db.js`
  — **6 killed, 0 survived, 0 uncovered** (after adding the `height === 1` test).
- **CRAP** (`crap4javascript`): `BackupDb.maybeBackupDb` CC=3, 100% cov, CRAP=3.0
  (threshold 8.0). Pass.
- **DRY** (`dry4javascript`): no new duplication from this task. Pre-existing
  duplicates in `rpc.js` and `set-name/set-profile/set-profile-pic` are out of
  scope for this handoff.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft`): 11 killed,
  **4 survived — all documented equivalents**. The survivors (m8, m9, m14, m15)
  mutate height/epoch values in the two "0 backup" example rows to other
  non-multiple values; the observable result (0 backups) is unchanged, so the
  scenarios cannot distinguish them. No action needed.

## Suite status
- `psf-memo-indexer` unit: **54 passing** (was 53; +1 new boundary test)
- `psf-memo-indexer` property: **4 passing**
- `psf-memo-indexer` acceptance: **3 generated files, all passing**
- `psf-memo-indexer` lint (`standard`): clean

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the review commit
  for follow-up review.
