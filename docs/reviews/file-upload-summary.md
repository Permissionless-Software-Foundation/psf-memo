# Architect review — `file-upload`

**Role**: architect
**Task**: `file-upload` (FH1, `psf-memo-cli` only)
**Reviewed commits**: `bcacc9d` (specifier, `file-upload.feature` + docs) →
`fe8ca20` (coder, quote-only upload) → `1f7b29d` (merge coder into refactorer) →
`656453e` (refactorer, split quote renderer + property coverage)
**Merge**: `bcf8dbe` `Merge refactorer file-upload into architect`
**Review commit**: `af7cb4b013` (test + tool-written manifests)
**Verification record**: `docs/reviews/file-upload-verification.json`
(`git_sha` `af7cb4b0133cecaf2317a04cb3d0b35e003a0337`)

## Scope

Adds the `file-upload` command to `psf-memo-cli`: quote-only upload of a local
file to the `bch-file-hosting` REST API (`POST /files`, multipart field
`file`). It prints either the price quote (file name, size, billed size when it
differs, price, payment address, expiry) or the `alreadyHosted` download/view
links. No wallet and no payment. A missing `-f` flag exits 2; a missing local
file or API rejection exits 1. Human and one-JSON-object output follow the
shared reporter contract. The API base URL comes from `HOSTING_API_URL`
(default `http://localhost:5050`). Only `psf-memo-cli` is touched.

## Architectural findings

- **Pure renderer split from wiring and IO.** `src/lib/file-upload.js` owns the
  human-readable rendering (`formatFileUploadMessage` → `formatHostedMessage` /
  `formatQuoteMessage`) and depends on nothing. `src/commands/file-upload.js`
  is a thin wiring layer over the shared reporter, the HTTP adapter, and an
  injected file reader. This is the correct UI/core boundary: the command is
  fully testable under Node with no network or disk.
- **HTTP adapter is the only IO boundary.** `src/lib/hosting-api.js` wraps
  `fetch`, `FormData`, and `Blob`, exposes `upload` plus the `HostingApiError`
  type, and injects the transport so tests can stub it. It binds the injected
  `fetch` to `globalThis`, matching the browser-receiver fix documented in the
  bch-file-hosting request.
- **Dependency direction is inward.** `commands/file-upload.js` →
  `lib/{reporter,hosting-api,file-upload,bind-methods}.js` → `config`; the pure
  renderer depends on nothing and the adapter only on web/Node globals. No
  low-level module reaches back into a high-level one.
- **Information hiding holds.** The adapter exposes only `upload` and the error
  type; the billed-size rule and expiry presence live entirely in the pure
  renderer; persistence, framework, and delivery details do not leak across
  boundaries.
- **The refactorer's split improved cohesion without changing boundaries.**
  Separating the already-hosted renderer from the quote renderer removed the
  intermixed branching from a single function. No further structural change was
  warranted; the module shape matches the existing `lib` + thin-command
  convention used by the other commands.

## Fixes applied

- **Killed a `validateFlags` mutation survivor.** `FileUpload.validateFlags`
  returned `true` on success but no caller used the value, so a
  `true -> false` mutant survived. A `psf-memo-cli` convention (see
  `send-bch`, `wallet-sweep`, `msg-verify`, `memo-status`) is to pin the
  validator's success return with a unit test; added
  `returns true from validateFlags when the file flag is present` to
  `test/unit/commands/file-upload.unit.js`. Re-running `mutate4javascript`
  killed the mutant. No production-code change.
- **Recorded the tool-written manifests** for the five changed modules and the
  `gherkin-mutator` stamp/manifest for `specs/file-upload.feature`. No manifest
  was hand-edited.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/lib/file-upload.js` | 1 | 1 | 1 | 1 | 0 |
| `src/lib/hosting-api.js` | 3 | 3 | 3 | 3 | 0 |
| `src/commands/file-upload.js` | 2 | 2 | 2 | 2 | 0 |
| `config/index.js` | 3 | 3 | 3 | 3 | 0 |
| `psf-memo-cli.js` | 0 | 0 | 0 | 0 | 0 |

`src/commands/file-upload.js` first reported `Selected 0 / Covered 2`
(differential under-selection after the test-only change), so `mutate-file.sh`
reran it with `--mutate-all` and killed both sites on the second pass.
`config/index.js` likewise auto-reran `--mutate-all` (`Selected 0 / Covered 3`)
and killed all three `||` sites. `psf-memo-cli.js` is a pure command-registration
module; `Total mutation sites: 0` is structural, not an under-selected run.
**9/9 mutation sites killed, 0 survived.**

### DRY (`dry4javascript`, scoped to the changed production files)

```
No duplicate candidates found.
```

No task-local production duplication. The broad-repo duplicate floor noted in
prior reviews is unchanged and out of scope.

### Cyclomatic complexity (`crap4javascript`, changed `src/` files)

All changed functions are at 100% coverage and below the CRAP threshold of 8.0:

| Function | Module | CC | Cov% | CRAP |
|----------|--------|----|------|------|
| `formatQuoteMessage` | `src/lib/file-upload.js` | 6 | 100% | 6.0 |
| `errorMessage` | `src/lib/hosting-api.js` | 4 | 100% | 4.0 |
| `FileUpload.readLocalFile` | `src/commands/file-upload.js` | 2 | 100% | 2.0 |
| `FileUpload.validateFlags` | `src/commands/file-upload.js` | 2 | 100% | 2.0 |
| `formatFileUploadMessage` | `src/lib/file-upload.js` | 2 | 100% | 2.0 |
| `HostingApi.upload` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `readJson` | `src/lib/hosting-api.js` | 2 | 100% | 2.0 |
| `FileUpload.run` | `src/commands/file-upload.js` | 1 | 100% | 1.0 |
| `formatHostedMessage` | `src/lib/file-upload.js` | 1 | 100% | 1.0 |

Exit code 0 (threshold respected).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

Ran from `tmp/aps` against the `psf-memo-cli` runner-worker with `--json`
captured to a file.

| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/file-upload.feature` | 64 | 64 | 0 | 0 |

Scenario 1 (24), 2 (8), 4 (6), 6 (8), and 7 (18) mutations all killed. Scenarios
3 and 5 are plain scenarios (no `Examples:`), so they contribute no
example-value mutations. There are **no survivors and no intrinsic
equivalents**. The tool wrote a `# mutation-stamp` and manifest into the
feature; committed as-is.

### Canonical suite (`verify.sh cli`, at `af7cb4b013`)

| Command | Result |
|---------|--------|
| unit | 601 passing |
| property | 118 pass / 0 fail |
| acceptance | all 39 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record:
`docs/reviews/file-upload-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `file-upload`, review commit `af7cb4b013`.
