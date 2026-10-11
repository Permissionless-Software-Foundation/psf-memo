# Architect review — `file-status`

**Role**: architect
**Task**: `file-status` (FH3, `psf-memo-cli` only)
**Reviewed commits**: `b2adce1` (specifier, `file-status.feature` + docs) →
`7b082d0` (coder, CID lookup + metadata/pins rendering) → `2d8fdad` (merge
coder into refactorer) → `3431ec7` (refactorer, property coverage for status,
reader, and lookup)
**Merge**: `cd067c4` `Merge refactorer file-status into architect`
**Review commit**: `94c671b68b` (tool-written manifests only)
**Verification record**: `docs/reviews/file-status-verification.json`
(`git_sha` `94c671b68b0ff80ada8433a20ec9bb368ea947aa`)

## Scope

Adds the read-only `file-status` command: look up a file record by CID
(`-c`) through `GET /files/:cid` and print its CID, name, size, status, hosting
window, and pins. Missing `-c` exits 2; an unknown CID or API error exits 1. The
route intentionally returns no download/view URLs, so the command renders
metadata and pins only; `file-check` (FH4) surfaces links. No wallet, no
payment. Only `psf-memo-cli` is touched.

## Architectural findings

- **Clean read-command shape.** `src/lib/file-status.js` is a pure renderer;
  `src/commands/file-status.js` is a thin wiring layer over it, the reporter,
  and the adapter. `validateFlags` resolves the CID before any request and
  returns `{ cid }` (not a bare boolean), so `run` has no second flag parse.
  The command is fully testable under Node with an injected API.
- **Adapter boundary stays cohesive.** `HostingApi.getStatus` joins `upload` and
  `checkPayment` on the single network boundary. It percent-encodes the CID
  path segment, which correctly prevents an unencoded value such as
  `../admin/invoices` from being URL-normalized into a different endpoint.
- **Information hiding holds.** GET-route fields that the command does not use
  are never surfaced; the renderer owns the "no hosting window means not paid"
  rule in one place. No framework, persistence, or delivery detail crosses a
  boundary.
- **Acceptance world was consolidated sensibly.** The shared fake API now backs
  `hostingFile` metadata for both the upload/quote and the status response, and
  the per-command JSON capture was renamed to a shared `hostingJson`. This
  removes duplicate per-feature JSON state without changing any rendered
  behavior.
- **Good follow-through on the prior review.** The refactorer added a property
  test for the shared `readLocalFile` helper extracted during the `file-host`
  review, so the new module has broad-input coverage in addition to its unit
  test.
- **No structural fix required.** No mutation survivors, no task-local DRY
  duplicates, and no module-boundary problem. The one embedded duplication —
  the optional `File name` / `Size` lines shared by the quote and status
  renderers — is a sub-threshold statement block the DRY tool does not flag; it
  was left inline to avoid coupling two small renderers.

## Fixes applied

- No production or test change was needed.
- **Recorded the tool-written manifests** for the three changed modules
  (`hosting-api.js` now including `getStatus`) and the `gherkin-mutator`
  stamp/manifest for `specs/file-status.feature`; also captured the
  timestamp-only refreshes of the `file-upload`/`file-host` feature manifests.
  No manifest was hand-edited.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/lib/file-status.js` | 2 | 2 | 2 | 2 | 0 |
| `src/lib/hosting-api.js` | 3 | 3 | 3 | 3 | 0 |
| `src/commands/file-status.js` | 0 | 0 | 0 | 0 | 0 |
| `psf-memo-cli.js` | 0 | 0 | 0 | 0 | 0 |

The `file-status` command and the registration module have no arithmetic,
comparison, logical, or constant mutation sites; their `!` guards and template
literals scan as structurally 0-site. **5/5 mutation sites killed, 0 survived.**

### DRY (`dry4javascript`, scoped to the file-hosting production files)

```
No duplicate candidates found.
```

Both the canonical scoped run and a lowered-threshold run
(`--min-lines 3 --min-nodes 12`) report no candidates.

### Cyclomatic complexity (`crap4javascript`, changed `src/` files)

All functions are 100% covered and below the CRAP threshold of 8.0:

| Function | Module | CC | Cov% | CRAP |
|----------|--------|----|------|------|
| `formatFileStatusMessage` | `src/lib/file-status.js` | 6 | 100% | 6.0 |
| `errorMessage` | `src/lib/hosting-api.js` | 4 | 100% | 4.0 |
| `FileStatus.validateFlags` | `src/commands/file-status.js` | 2 | 100% | 2.0 |
| `HostingApi.checkPayment` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `HostingApi.getStatus` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `HostingApi.upload` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `readJson` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `FileStatus.run` | `src/commands/file-status.js` | 1 | 100% | 1.0 |

Exit code 0 (threshold respected).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors | Skipped |
|---------|-------|--------|----------|--------|---------|
| `specs/file-status.feature` | 53 | 53 | 0 | 0 | — |
| `specs/file-upload.feature` | 0 | 0 | 0 | 0 | 5 / 64 |
| `specs/file-host.feature` | 0 | 0 | 0 | 0 | 5 / 70 |

`file-status` has no survivors or intrinsic equivalents. `file-upload` and
`file-host` were re-run because the shared acceptance world changed in this
task; the tool found their prior manifests clean and skipped every mutatable
scenario, confirming the refactor did not change their behavior. All
tool-written feature manifests are committed as-is.

### Canonical suite (`verify.sh cli`, at `94c671b68b`)

| Command | Result |
|---------|--------|
| unit | 643 passing |
| property | 134 pass / 0 fail |
| acceptance | all 41 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record: `docs/reviews/file-status-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `file-status`, review commit `94c671b68b`.
