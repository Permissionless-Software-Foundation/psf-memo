# Architect review — `file-host`

**Role**: architect
**Task**: `file-host` (FH2, `psf-memo-cli` only)
**Reviewed commits**: `7180fc9` (specifier, `file-host.feature` + docs) →
`5fc59f2` (coder, upload + pay + poll; `minimal-slp-wallet` 7.1.5) →
`b47da4a` (merge coder into refactorer) → `cdea96d` (refactorer, property
coverage + default-timer test)
**Merge**: `f815e51` `Merge refactorer file-host into architect`
**Review commit**: `d09f22296b` (shared local-file reader + survivor kill +
tool-written manifests)
**Verification record**: `docs/reviews/file-host-verification.json`
(`git_sha` `d09f22296b2f0308467cd766036a8cd559ee0115`)

## Scope

Adds the `file-host` command: upload a local file to the `bch-file-hosting`
REST API, pay the quote from a resolved wallet (`-n`/`--wif`), then poll
`POST /files/check-payment` (10 attempts, 3,000 ms apart, sleep injected) until
paid. Prints the CID, download/view/gateway URLs, and payment txid. An
already-hosted upload short-circuits without paying. Missing `-f` or wallet
source exits 2; missing local file, API rejection, or an unconfirmed payment
exits 1. Only `psf-memo-cli` is touched. The task also upgrades
`minimal-slp-wallet` (5.12.1 → 7.1.5; `@psf/bch-js` → 7.1.14).

## Architectural findings

- **The pipeline is split along the right seams.** `src/lib/file-host.js` owns
  the pure rendering and the injected poll loop; `src/lib/send-payment.js` is
  the wallet-send adapter; `src/lib/hosting-api.js` gains `checkPayment` and
  remains the only network boundary; `src/commands/file-host.js` is a thin
  wiring layer over those, the reporter, and the wallet source. The command is
  fully testable under Node with injected API, wallet, reader, and clock.
- **Payment and polling are decoupled from the command.** `sendPayment`
  validates the txid and encapsulates `initialize()` → `send()`;
  `pollPayment` takes the check call, attempt budget, delay, and `sleep`, so no
  test ever sleeps or touches the network.
- **`wallet-source` reuse is correct.** `validateWalletSource` was split out and
  is reused by `file-host` to reject a bad source before any upload or payment,
  keeping the usage-error policy in one place.
- **A real duplicate existed across the two file-hosting commands.**
  `readLocalFile` was copied verbatim into both `file-upload` and `file-host`
  (DRY reported it as a score-1.00 duplicate at `--min-lines 3 --min-nodes 12`).
  It is a shared IO boundary, so it belongs in one module.
- **No other structural change was warranted.** The dependency direction is
  inward (`commands` → `lib` → web/Node globals), information hiding holds
  (adapters expose only their operation plus the error type), and the
  already-hosted two-line render shared with `file-upload` is below the DRY
  tool's canonical threshold; left inline rather than coupling the two
  renderers for two lines.

## Fixes applied

- **Extracted `src/lib/read-local-file.js`** (`readLocalFile(readFile, filePath)`)
  and switched both `file-upload` and `file-host` to it, removing the
  duplicated method. Added `test/unit/lib/read-local-file.unit.js`. Behavior is
  unchanged (same `Cannot read file: <path>` mapping).
- **Killed a `sendPayment` mutation survivor.** The unit test only covered a
  `null` txid, so a `|| -> &&` mutant survived on the `txid === ''` branch.
  Added an empty-string case to `test/unit/lib/send-payment.unit.js`; the
  re-run killed it. (The property test already covered it, but property tests
  are excluded from the language mutation baseline by design.)
- **Installed the upgraded dependency tree.** The merge changed
  `package.json`/`package-lock.json` but the architect worktree still had the
  old `node_modules`; ran `npm ci` in `psf-memo-cli` before any verification so
  the suite ran against `minimal-slp-wallet` 7.1.5 / `@psf/bch-js` 7.1.14.
- **Recorded the tool-written manifests** for the six language-mutated modules
  and the `gherkin-mutator` stamp/manifest for `specs/file-host.feature` (and
  the timestamp-only refresh of `specs/file-upload.feature`). No manifest was
  hand-edited.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/commands/file-host.js` | 4 | 4 | 4 | 4 | 0 |
| `src/lib/file-host.js` | 6 | 6 | 6 | 6 | 0 |
| `src/lib/send-payment.js` | 1 | 1 | 1 | 1 | 0 |
| `src/lib/hosting-api.js` | 3 | 3 | 3 | 3 | 0 |
| `src/lib/wallet-source.js` | 3 | 3 | 3 | 3 | 0 |
| `src/commands/file-upload.js` (dedup follow-up) | 2 | 2 | 2 | 2 | 0 |
| `src/lib/read-local-file.js` | 0 | 0 | 0 | 0 | 0 |
| `psf-memo-cli.js` | 0 | 0 | 0 | 0 | 0 |

`src/lib/hosting-api.js` and `src/lib/send-payment.js` first reported
`Selected 0` after the test-only change, so `mutate-file.sh` reran them with
`--mutate-all`; both then killed every site. `read-local-file.js` and
`psf-memo-cli.js` are structurally 0-site (the latter is pure command
registration). **19/19 mutation sites killed, 0 survived.**

### DRY (`dry4javascript`, scoped to the changed files and their peers)

Before the fix, `--min-lines 3 --min-nodes 12` reported a score-1.00 duplicate
(`src/commands/file-host.js:115-121` vs `src/commands/file-upload.js:76-82`,
the copied `readLocalFile`). After the extraction, both the canonical scoped run
and the lower-threshold run report:

```
No duplicate candidates found.
```

### Cyclomatic complexity (`crap4javascript`, changed `src/` files)

All functions are 100% covered and below the CRAP threshold of 8.0:

| Function | Module | CC | Cov% | CRAP |
|----------|--------|----|------|------|
| `validateWalletSource` | `src/lib/wallet-source.js` | 5 | 100% | 5.0 |
| `errorMessage` | `src/lib/hosting-api.js` | 4 | 100% | 4.0 |
| `formatFileHostMessage` | `src/lib/file-host.js` | 4 | 100% | 4.0 |
| `pollPayment` | `src/lib/file-host.js` | 4 | 100% | 4.0 |
| `sendPayment` | `src/lib/send-payment.js` | 3 | 100% | 3.0 |
| `FileHost.validateFlags` | `src/commands/file-host.js` | 2 | 100% | 2.0 |
| `FileUpload.validateFlags` | `src/commands/file-upload.js` | 2 | 100% | 2.0 |
| `HostingApi.checkPayment` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `HostingApi.upload` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `readJson` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `readLocalFile` | `src/lib/read-local-file.js` | 2 | 100% | 2.0 |
| `resolveWalletSource` | `src/lib/wallet-source.js` | 2 | 100% | 2.0 |
| `FileHost.{run,resolveWallet,pollForPayment}` | `src/commands/file-host.js` | 1 | 100% | 1.0 |
| `FileUpload.run` | `src/commands/file-upload.js` | 1 | 100% | 1.0 |

Exit code 0 (threshold respected).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors | Skipped |
|---------|-------|--------|----------|--------|---------|
| `specs/file-host.feature` | 70 | 70 | 0 | 0 | — |
| `specs/file-upload.feature` | 0 | 0 | 0 | 0 | 5 scenarios / 64 mutations |

`file-host` mutations are all killed — no survivors or intrinsic equivalents.
`file-upload` was re-run because its command changed in this review; the tool
found its prior manifest clean and skipped all 5 mutatable scenarios (the
extraction left its rendered behavior identical), so the existing stamp carries
forward. Both tool-written feature manifests are committed as-is.

### Canonical suite (`verify.sh cli`, at `d09f22296b`)

| Command | Result |
|---------|--------|
| unit | 630 passing |
| property | 126 pass / 0 fail |
| acceptance | all 40 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record: `docs/reviews/file-host-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `file-host`, review commit `d09f22296b`.
