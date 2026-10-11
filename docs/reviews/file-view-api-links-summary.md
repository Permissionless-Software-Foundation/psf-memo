# Architect review — `file-view-api-links`

**Role**: architect
**Task**: `file-view-api-links` (client-only, `psf-memo-client`)
**Reviewed commits**: `7ece84f` (specifier, specs) → `9729477` (coder, view-URL
port) → `7a5f607` (merge coder into refactorer) → `df89647` (refactorer,
single-source `loadPage` + URL-fallback property)
**Merge**: `ecd3eb5` `Merge refactorer file-view-api-links into architect`
**Review commit**: `f793e525e4` (tool-written language and Gherkin manifests)
**Verification record**: `docs/reviews/file-view-api-links-verification.json`
(`git_sha` `f793e525e453b26047b4e47b6ab942aa504320cb`)

## Scope

Client-only port of the upstream `bch-file-hosting-web` file-view update. The
dashboard **View** cell and the upload already-hosted/paid results now render
the hosting API's own `/view/<cid>` URL carried by the feed / paid /
already-hosted payloads instead of the first third-party IPFS gateway URL. The
paid result drops the separate download and gateway links, and the dashboard
uses the feed's `downloadUrl` when present with the configured base as a
fallback. The feature broadcasts no Memo action and changes no DB data.

## Architectural findings

- **One mapping path for the first page and Load more.** The refactorer
  extracted `DashboardPage.loadPage(page, priorFiles)`, so `load` and `loadMore`
  share the field projection, URL fallback, cursor update, and page-state
  construction. `toDashboardFile` remains the single place that selects the
  feed URL or the base fallback, so the two entry points can no longer drift.
- **URL-source policy is encapsulated.** The feed now owns the download and
  view URLs; the service keeps the configured base only as a download fallback
  (trailing slashes trimmed) and derives no view URL from third-party gateways.
  The presentational views render whatever `downloadUrl`/`viewUrl` the view
  model carries, so the core stays free of the URL policy.
- **UI/core boundary unchanged.** The acceptance handlers were updated in place
  to configure `viewUrl`/`downloadUrl` on feed and paid payloads; the removed
  gateway/base handlers have no remaining references in the specs. No framework
  or IO detail leaks into the services, and both views remain renderable under
  Node.
- **No structural fix required.** The refactorer's extraction improves cohesion
  and information hiding without changing the module boundaries; the
  service/view/adapter split is consistent with the rest of the client.

## Fixes applied

- **Recorded `mutate4javascript` manifests** for the four changed modules after
  the verification mutation run (`dashboard-page.js`, `file-upload-page.js`,
  `dashboard-view.js`, `upload-quote-view.js`).
- **Recorded `gherkin-mutator` metadata** for `specs/host-file.feature` and
  `specs/hosted-files.feature`.
- No production-code change: the refactorer's single-sourcing is sound, and no
  task-local production duplication was found.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/services/dashboard-page.js` | 5 | 5 | 5 | 5 | 0 |
| `src/services/file-upload-page.js` | 12 | 12 | 12 | 12 | 0 |
| `src/components/app-body/dashboard/dashboard-view.js` | 9 | 9 | 9 | 9 | 0 |
| `src/components/app-body/file-hosting/upload-quote-view.js` | 2 | 2 | 2 | 2 | 0 |

Every file was a differential under-selection on the first pass (selected
0/5, 1/12, 0/9, 0/2), so `mutate-file.sh` reran each with `--mutate-all` and
`Selected == Total`. **28/28 mutation sites killed, 0 survived.**

### DRY (`dry4javascript`, scoped to changed modules/tests/adapters)

Scoped to the four changed modules, their unit and property tests, and
`acceptance/lib/handlers.js`. Every reported duplicate is a pre-existing
pattern — per-scenario acceptance step boilerplate (the "the page shows the
X" family) and duplicated idle-state render tests across
`dashboard-view.test.js`/`upload-quote-view.test.js` — or local test-fixture
repetition between the two already-hosted upload tests. No task-local
production duplication; left as-is per prior reviews.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors | Skipped (scenarios/mutations) |
|---------|-------|--------|----------|--------|-------------------------------|
| `specs/hosted-files.feature` | 36 | 33 | 3 | 0 | 3 / 6 |
| `specs/host-file.feature` | 30 | 25 | 5 | 0 | 10 / 113 |

Every mutation of the new `api_view_url` / `shown_view_url` / `paid_view_url`
and the new `api_download_url` / `shown_download` cells was **killed**. The
eight survivors are the known scenario-level intrinsic equivalents already
documented for these features, not implementation gaps:

- **Hosted Files — 2** `cid` case flips (examples 1–2): the `cid` column selects
  the row and is also the setup URL, so both sides of the assertion move
  together.
- **Hosted Files — 3** `api_size 1024→1025`: both render the example's
  two-decimal `1.02 KB`.
- **Host File — 14** `paid_cid`/`paid_name` case flips and `shown_target
  none→value`: the CID is not asserted in this scenario, `isImageName` is
  case-insensitive, and the step handler distinguishes only `_blank` from
  non-`_blank`.

Both tool-written feature manifests are committed as-is.

### Canonical suite (`verify.sh client`, at `f793e525e4`)

| Command | Result |
|---------|--------|
| unit | 916 pass / 0 fail |
| property | 253 pass / 0 fail |
| acceptance | all 51 acceptance suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/file-view-api-links-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `file-view-api-links`, review commit `f793e525e4`.
