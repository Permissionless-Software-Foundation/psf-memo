# Architect review — `file-check`

**Role**: architect
**Task**: `file-check` (FH4, `psf-memo-cli` only)
**Reviewed commits**: `13bfd94` (specifier, `file-check.feature` + docs) →
`7f42724` (coder, paid/unpaid/expired rendering by address) → `98bc3d6` (merge
coder into refactorer) → `bf90819` (refactorer, shared read-command pipeline)
**Merge**: `0b1dbe2` `Merge refactorer file-check into architect`
**Review commit**: `dea6b87b70` (shared hosted-result renderer + manifests)
**Verification record**: `docs/reviews/file-check-verification.json`
(`git_sha` `dea6b87b7054404629e6f87a82c97e986c58d587`)

## Scope

Adds the read-only `file-check` command: look up a hosting payment by address
(`-a`) through `POST /files/check-payment` and report `paid` (CID plus
download/view/gateway links), `unpaid` (received/required sats and quote
expiry), or `expired`. This closes the URL asymmetry of `GET /files/:cid`
(FH3): a caller who kept only the payment address recovers the links. Missing
`-a` exits 2; an unknown address or API error exits 1. No wallet, no payment.
Only `psf-memo-cli` is touched.

## Architectural findings

- **The refactorer's shared read-command pipeline is sound.** `HostingCommand`
  plus the `createHostingCommand` factory single-source the
  validate → look-up → report sequence, so `file-check` and `file-status` are
  now short declarative specs (required flag + look-up + renderer) over one
  implementation. Dependency direction stays inward (command → lib → adapter),
  the reporter contract is reused unchanged, and both commands remain fully
  testable with an injected API, stdout, and stderr.
- **The adapter boundary stayed cohesive.** `file-check` reuses
  `HostingApi.checkPayment`; no second HTTP path was introduced.
- **A real cross-command duplication existed in the renderers.** The
  `file-check` paid result and the `file-host` confirmed result render the same
  CID / download / view / gateway block. It is one shared concept, so it was
  extracted to `src/lib/hosted-result.js`. This is a sub-threshold duplicate the
  DRY tool does not flag (the two enclosing functions differ by the host
  transaction line), so it was found by inspection rather than the tool.
- **The `file-status` command is re-expressed through the same pipeline**, so
  the two read commands can no longer drift on flag validation, error mapping,
  or exit-code handling. Its acceptance output is unchanged (re-verified).
- **Minor, left as-is:** `hosting-command.js` also exports the base
  `HostingCommand` and `requireUsageFlag`, which no current consumer imports.
  They are a small, harmless extension/utility surface; removing them was not
  worth the manifest churn.

## Fixes applied

- **Extracted `src/lib/hosted-result.js`** (`hostedResultLines(result)`), used by
  `src/lib/file-check.js` (`formatPaidMessage`) and `src/lib/file-host.js`
  (`formatFileHostMessage`). Added `test/unit/lib/hosted-result.unit.js`. The
  rendered line order is unchanged (CID, Download, View, gateways, then the
  host transaction where applicable).
- **Recorded the tool-written language and Gherkin manifests** for the changed
  modules and `specs/file-check.feature`; no manifest was hand-edited.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/lib/hosted-result.js` | 1 | 1 | 1 | 1 | 0 |
| `src/lib/file-host.js` | 5 | 5 | 5 | 5 | 0 |
| `src/lib/file-check.js` | 0 | 0 | 0 | 0 | 0 |
| `src/lib/hosting-command.js` | 0 | 0 | 0 | 0 | 0 |
| `src/commands/file-check.js` | 0 | 0 | 0 | 0 | 0 |
| `src/commands/file-status.js` | 0 | 0 | 0 | 0 | 0 |

Before the extraction, `file-check.js` and `file-host.js` each carried the
shared gateway `||` site; after it, that single site lives only in
`hosted-result.js`, where it is killed. The shared pipeline and the two
declarative commands contain only `!` guards and template/spread expressions,
which scan as structurally 0-site. **6/6 mutation sites killed, 0 survived.**

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
| `pollPayment` | `src/lib/file-host.js` | 4 | 100% | 4.0 |
| `formatFileCheckMessage` | `src/lib/file-check.js` | 3 | 100% | 3.0 |
| `hostedResultLines` | `src/lib/hosted-result.js` | 3 | 100% | 3.0 |
| `formatFileHostMessage` | `src/lib/file-host.js` | 2 | 100% | 2.0 |
| `requireUsageFlag` | `src/lib/hosting-command.js` | 2 | 100% | 2.0 |
| `createHostingCommand` / `HostingCommand.{run,validateFlags}` | `src/lib/hosting-command.js` | 1 | 100% | 1.0 |
| `formatPaidMessage` / `formatUnpaidMessage` | `src/lib/file-check.js` | 1 | 100% | 1.0 |

Exit code 0 (threshold respected).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors | Skipped |
|---------|-------|--------|----------|--------|---------|
| `specs/file-check.feature` | 50 | 50 | 0 | 0 | — |
| `specs/file-status.feature` | 0 | 0 | 0 | 0 | 4 / 53 |
| `specs/file-host.feature` | 0 | 0 | 0 | 0 | 5 / 70 |

`file-check` has no survivors or intrinsic equivalents. `file-status` and
`file-host` were re-run because their command/renderer implementations changed
in this task; the tool found their prior manifests clean and skipped every
mutatable scenario, and the full acceptance suite re-validated both behaviors.
All tool-written feature manifests are committed as-is.

### Canonical suite (`verify.sh cli`, at `dea6b87b70`)

| Command | Result |
|---------|--------|
| unit | 659 passing |
| property | 140 pass / 0 fail |
| acceptance | all 42 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record: `docs/reviews/file-check-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `file-check`, review commit `dea6b87b70`.
