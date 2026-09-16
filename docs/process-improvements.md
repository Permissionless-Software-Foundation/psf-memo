# SwarmForge Process Improvements — 2026-09-16

**Owner:** specifier.
**Scope:** process and tooling changes only; no product feature behavior.
**Base commit:** `f44de33` → **end commit:** `8153f6f` (10 commits).
**Verification:** per-changeset evidence below; each change was committed on its
own so it can be reviewed or reverted independently.

This document is the durable "what and why" for the process pass requested after
the `thread-query-bounds` feature. It complements, and does not replace, the Git
history, which remains the authoritative log.

## Changes

| # | Change | Why | Commit | Key files |
|---|--------|-----|--------|-----------|
| 1 | Architect always sends an end-of-chain `git_handoff` to the specifier | The architect's terminal handoff only reached coder/refactorer, so the specifier was never notified to merge and a human had to bridge the gap every feature | `0bc73ec` | `swarmforge/roles/architect.prompt` |
| 2 | Delete acceptance LevelDB dirs in `close()` and sweep `tmp/acceptance` per run | Each scenario leaked an isolated LevelDB dir; `psf-memo-db/tmp/acceptance` had reached 961 dirs / 293 MB and bloats mutation worker copies | `eb308d2` | `psf-memo-db/acceptance/lib/handlers.js`, `psf-memo-db/acceptance/acceptance.js` |
| 3 | Self-healing handoff daemon | Queued handoffs sat undelivered when `handoffd` was not running; recovery was manual | `053e8e3` | `swarmforge/scripts/ensure_handoff_daemon.sh`, `swarm_handoff.sh`, `ready_for_next.sh` |
| 4 | Single canonical APS checkout at `tmp/aps` | Up to four copies (`tmp/aps`, `tmp/aps-spec`, `tmp/aps-fresh`, client-local) and the docs/wrappers/runners disagreed; the runners never updated, so tools could be stale | `66a791b` | `ensure-aps.sh`, `gherkin-parser`, `architect-startup.sh`, all three `acceptance/acceptance.js`, `docs/architect-startup.md` |
| 5 | Incremental acceptance generation | Every run re-parsed and regenerated every feature even when only one changed | `5bbe276` | all three `acceptance/acceptance.js` and `acceptance/lib/generate.js` |
| 6 | Canonical `verify.sh` + machine-readable verification record | The same commands were transcribed in several places and the full suite was re-run by every role | `0db351a` | `swarmforge/scripts/verify.mjs`, `verify.sh`, `swarmforge/roles/architect.prompt`, `swarmforge/roles/specifier.prompt` |
| 7 | Mutation guards: `mutate-file.sh`, `clean-builds.sh` | The default differential run can silently under-select after a function-set change; stale build dirs make worker copies huge | `752bf2c` | `swarmforge/scripts/mutate-file.sh`, `clean-builds.sh`, `docs/architect-startup.md` |
| 8 | Block handoffs from a dirty working tree | Unrelated tracked changes could ride along with a handoff | `0942b2e` | `swarmforge/scripts/swarm_handoff.bb` |
| 9 | `state.sh` helper | Refreshing the briefing HEAD lines required manual git inspection | `a5f8967` | `swarmforge/scripts/state.sh` |
| 10 | Briefing refresh (APS, daemon, verify, gotchas #24/#25, §11) | Keep the standing specifier briefing aligned with the new tooling | `a5f8967`, `8153f6f` | `specifier-prompt.md` |

## Verification evidence

- **#2:** `tmp/acceptance` measured at 961 dirs / 293 MB before, 4 KB after; acceptance 11/11 still pass.
- **#3:** daemon stopped, `ensure_handoff_daemon.sh` restarted it (pid observed), `ready_for_next.sh` works.
- **#4:** `ensure-aps.sh` clone and `--update` verified; `gherkin-parser` wrapper parsed a feature; duplicate checkouts removed.
- **#5:** a second acceptance run left the generated test mtime unchanged (generation skipped) while 11/11 passed.
- **#6:** `verify.mjs db --record …` emitted `result: pass` for unit/property/acceptance/lint with `git_sha`.
- **#7:** `mutate-file.sh` reported `Selected 0 / Covered 10`, auto-reran `--mutate-all`, result 10 killed / 0 survived.
- **#8:** a handoff attempt with a dirty tree was blocked (exit 3), listed the files, retained the draft, and queued nothing.
- **#9:** `state.sh` printed each role branch HEAD and main-checkout status.

## How to use

- Refresh tools: `swarmforge/scripts/ensure-aps.sh --update`.
- Verify a component and record it: `swarmforge/scripts/verify.sh <client|db|indexer> --record docs/reviews/<task>-verification.json --task <task>`.
- Mutate a file safely: from the component dir, `../swarmforge/scripts/mutate-file.sh src/<file>.js --max-workers 8`.
- Clean worker-copy bloat: `swarmforge/scripts/clean-builds.sh`.
- Refresh state: `swarmforge/scripts/state.sh`.
- Handoffs: `swarm_handoff.sh` now self-heals the daemon and refuses a dirty tree (`SWARMFORGE_ALLOW_DIRTY=1` overrides).

## Known remaining work

- Acceptance execution is ~9 minutes (546 s) for the 11 `psf-memo-db` suites, dominated by running generated test files sequentially; generation is now incremental. Parallelizing the generated test files (with isolated `tmp/` per worker) is the next efficiency candidate and is not yet specified.
- APS `gherkin-mutator` exposes no project mutation-filter hook, so intrinsic upper-bound survivors (`at most N`) cannot be filtered out; documented in `docs/architect-startup.md` and specifier gotcha #23.

By specifier.
