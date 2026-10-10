# Architect review — `host-file-pages`

**Role**: architect
**Task**: `host-file-pages` (client-only, `psf-memo-client`)
**Reviewed commits**: `e422c92` (specifier, specs) → `a8c8953` (coder) →
`dc98e01` (merge coder into refactorer) → `d0f7c2c` (refactorer, single-source
the empty message + property coverage)
**Merge**: fast-forward `swarmforge-architect` → `d0f7c2c27b`
**Review commit**: `a6770e2b5a` (tool-written manifests + test DRY reduction)
**Verification record**: `docs/reviews/host-file-pages-verification.json`
(`git_sha` `a6770e2b5af740dc33f5c68a73cd12b1579f4121`)

## Scope

Two new client pages for the bch-file-hosting REST API:

- **`/host`** — choose a browser file, POST it to `<base>/files`, show the
  returned quote (price, payment address, QR, expiry countdown, size/billed
  size), pay it from the browser wallet, poll `POST /files/check-payment`, and
  show the hosted result (CID, download link, gateway links, txid) or the
  expired/pending/error message.
- **`/dashboard`** — list the public feed from `GET /files` in a Bootstrap
  table (name, size, paid, hosted-until, truncated CID + copy control, download
  and gateway links), with Refresh and Load-more pagination.

Base URL comes from `REACT_APP_FILE_HOSTING_URL` (default
`https://file-hosting-api.blippost.com`). Client-only read/write feature: it
broadcasts no Memo action and changes no `psf-memo-db` data; the `/status` page
is intentionally not ported.

## Architectural findings

- **UI/core separation is clean and testable.** Seven core services own the
  behavior — `hosting-api` (network boundary), `browser-wallet` (wallet
  boundary), `clipboard` (environment boundary), `errors` (shared failure
  mapping), `quote-countdown` (pure formatter), and the two page controllers
  `file-upload-page` and `dashboard-page`. The views
  (`upload-quote-view`, `dashboard-view`, `shared/status-view`) are presentational
  `React.createElement` modules renderable under Node, so the browser page, the
  unit tests, and the acceptance runner share one view. The JSX containers
  (`file-hosting/index.js`, `dashboard/index.js`) are thin browser-only shells
  that inject `config`/`appData.wallet` and hold the page instance; they are the
  minimal environmentally unsuitable boundary.
- **Dependency rule holds.** No service imports a component. The only
  view→service edge is `dashboard-view` reading `DashboardPage.EMPTY_MESSAGE`;
  that is the established inward pattern (`AccountPage.NO_POSTS_MESSAGE`) that
  keeps the empty message single-sourced between controller and view.
- **Information hiding is deliberate.** `HostingApi` hides `fetch`, `FormData`,
  and base-URL construction, and percent-encodes the CID as one path segment so
  a value such as `../admin/invoices` cannot retarget the endpoint.
  `BrowserWallet` hides the wallet library behind `send({ address, amountSats })`.
  `clipboard` hides `navigator` and no-ops outside a browser. Countdown
  formatting is a pure function behind `formatCountdown`.
- **Boundaries are separated.** Mutation/acceptance manifests are tool-written;
  acceptance step handlers and helpers stay in the test layer, distinct from the
  production modules they exercise.
- **Accepted, not changed.** `dashboard-view` formats sizes in decimal units
  and dates in UTC minutes; `file-upload-page` treats a quote without
  `quoteExpiresAt` as having no countdown. Both are pinned by the feature files
  and unit/property tests.

## Fixes applied

- **Recorded `mutate4javascript` manifests** for the eight new mutation-bearing
  modules (all sites killed) and empty manifests for the two zero-site modules
  (`browser-wallet.js`, `shared/status-view.js`), matching the repo convention
  that every tested module carries a manifest.
- **Reduced local test duplication found by `dry4javascript`.** Added
  `makeApi` / `assertHostingError` helpers in `test/unit/hosting-api.test.js`
  (removing 11 repeated constructor blocks and 4 repeated error-validator
  blocks) and a `paidState` builder in `test/unit/upload-quote-view.test.js`
  (removing 4 repeated paid-state literals). The remaining candidates are
  intentionally parallel test cases or the pre-existing acceptance-handler
  boilerplate noise floor; no production duplication was reported.
- **Recorded `gherkin-mutator` acceptance manifests** for `host-file.feature`
  and `hosted-files.feature` (tool-written; committed as-is).

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/services/clipboard.js` | 2 | 2 | 2 | 2 | 0 |
| `src/services/dashboard-page.js` | 8 | 8 | 8 | 8 | 0 |
| `src/services/errors.js` | 1 | 1 | 1 | 1 | 0 |
| `src/services/hosting-api.js` | 6 | 6 | 6 | 6 | 0 |
| `src/services/quote-countdown.js` | 9 | 9 | 9 | 9 | 0 |
| `src/services/file-upload-page.js` | 13 | 13 | 13 | 13 | 0 |
| `src/components/app-body/dashboard/dashboard-view.js` | 9 | 9 | 9 | 9 | 0 |
| `src/components/app-body/file-hosting/upload-quote-view.js` | 5 | 5 | 5 | 5 | 0 |

**53/53 killed, 0 survived, 0 uncovered.** `Selected == Covered` everywhere, so
no differential under-selection. `src/services/browser-wallet.js` and
`src/components/app-body/shared/status-view.js` scan as structurally 0-site
(`--scan` confirmed); both now carry an empty manifest.

### DRY (`dry4javascript`, scoped to changed modules/tests/adapters)

Changed production modules, their unit tests, and the three new property tests:
the production set is clean and the property set reports **No duplicate
candidates found**. The only remaining candidates are parallel unit-test cases
(the `fakeFetch`-plus-`assertHostingError` shape repeated across the four error
tests, and the two `FileUploadPage` filename tests) and one cross-file
empty-container assertion; these are intentional independent test cases, not
drift.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/hosted-files.feature` | 44 | 40 | 4 | 0 |
| `specs/host-file.feature` | 146 | 141 | 5 | 0 |

All nine survivors are intrinsic equivalents:

- **Hosted Files — 2** (`filename` case flips `photo.jpg→phOto.jpg`,
  `notes.txt→nOtes.txt`, `archive.tar→archive.Tar`): the scenario identifies its
  row by CID and asserts the CID/download/view cells; the example `filename`
  column is setup-only, so flipping its case cannot change any assertion. (The
  filename *is* asserted in Hosted Files — 1, which killed there.)
- **Hosted Files — 3** (`api_size 1024→1025`): the format assertion pins two
  decimals, and `(1025/1000).toFixed(2)` still renders `1.02 KB`, the example's
  expected display.
- **Host File — 14** (`paid_cid` case flips): the scenario asserts only the
  gateway link target; the CID is not asserted here.
- **Host File — 14** (`paid_name` case flips `photo.jpg→photO.jpg`,
  `archive.tar→arcHive.tar`): `isImageName` uses a case-insensitive extension
  regex, so the `_blank`/default decision is unchanged.
- **Host File — 14** (`shown_target none→value`): the step handler distinguishes
  only `_blank` from non-`_blank`; `none` and `value` are therefore the same
  assertion, and the archive row has no `_blank` target.

No implementation gap is implied; these are scenario-level equivalents, so the
tool-written manifests are committed as-is.

### CRAP / cyclomatic complexity (`crap4javascript`)

All changed service and view functions are 100% covered by the unit suite; the
canonical suite passes with no CRAP threshold failure.

### Canonical suite (`verify.sh client`, at `a6770e2b5a`)

| Command | Result |
|---------|--------|
| unit | 911 pass / 0 fail |
| property | 247 pass / 0 fail |
| acceptance | all 51 acceptance suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/host-file-pages-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `host-file-pages`, commit `a6770e2b5a`.
