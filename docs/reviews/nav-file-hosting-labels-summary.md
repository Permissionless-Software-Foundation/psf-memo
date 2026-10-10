# Architect review — `nav-file-hosting-labels`

**Role**: architect
**Task**: `nav-file-hosting-labels` (client-only, `psf-memo-client`)
**Reviewed commits**: `2d21be9` (specifier, specs) → `93160a7` (coder) →
`6f36e04` (merge coder into refactorer) → `20c6c62` (refactorer, nav-menu
model + property coverage)
**Merge**: fast-forward `swarmforge-architect` → `20c6c624a1`
**Review commit**: `b3deb8bc7a` (manifests + orphaned menu-model cleanup)
**Verification record**: `docs/reviews/nav-file-hosting-labels-verification.json`
(`git_sha` `b3deb8bc7a3e6d0e4aae0bc64c797ce6eac1f94c`)

## Scope

Rename the two file-hosting navigation entries (**Host → File Upload**,
**Dashboard → File Dashboard**) and move them so they sit after Account and
before BCH, and make the navigation menu data-driven so the component, tests,
and acceptance run share one ordered source of truth.

## Architectural findings

- **Navigation is now a data model, not markup.** The refactorer extracted the
  ordered entries into `src/services/nav-menu.js` (`NAV_MENU_ENTRIES`,
  `findMenuEntry`, `isMenuEntryActive`) and rewrote `nav-menu/index.js` to map
  over that list. Label, path, order, and active-path logic now live in one
  testable module; the component is purely presentational. The home route still
  selects the Posts entry through `activePaths`, and the JSX shell stays thin.
- **The acceptance run consults the real menu model.** The former handler used a
  `NewPostPage` stand-in menu list (`addMenuLink`/`hasMenuLink`), which could
  drift from the real menu. It now calls `findMenuEntry`/`NAV_MENU_ENTRIES`, so
  the Gherkin label/order assertions exercise the same data the component
  renders. This is consistent with how the rest of the harness drives production
  page controllers and views.
- **Removed a now-orphaned parallel model.** Once the acceptance handler stopped
  using `NewPostPage.hasMenuLink`, the `menuLinks`/`addMenuLink`/`hasMenuLink`
  trio in `src/services/new-post.js` (plus the `menuLinks` constructor arg in the
  acceptance world) had no consumer except its own unit test. Navigation menu
  ownership belongs to `nav-menu.js`, so I removed the trio and its redundant
  test. `NewPostPage` no longer models a menu it does not own, and the
  `NEW_POST_PATH` constant/tests remain.
- **Order/labels are pinned independently.** Unit tests fix the four-label
  window and adjacency; the property suite pins shape/uniqueness, lookup round
  trip, and active-set invariants over generated entries; the two Gherkin
  scenarios pin the labels and order end to end.

## Fixes applied

- **Recorded `mutate4javascript` manifests** for the new `src/services/nav-menu.js`
  and for the trimmed `src/services/new-post.js`.
- **Removed the orphaned `NewPostPage` menu-link model** and its redundant unit
  test; dropped the unused `menuLinks: []` argument from the acceptance world's
  `NewPostPage` construction.
- **Recorded `gherkin-mutator` manifests** for the two changed navigation
  scenarios (`Host File - 17`, `Hosted Files - 8`).

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived |
|------|-------|---------|----------|--------|----------|
| `src/services/nav-menu.js` | 1 | 1 | 1 | 1 | 0 |
| `src/services/new-post.js` | 9 | 9 | 9 | 9 | 0 |

`new-post.js` was run with `--mutate-all` because the menu-model functions were
removed (a function-set change); `Selected == Total`, so nothing was skipped.
`src/components/nav-menu/index.js` is JSX and stays outside the Node mutation
boundary.

### DRY (`dry4javascript`, scoped to changed modules/tests)

`nav-menu.js`, `new-post.js`, `test/unit/nav-menu.test.js`,
`test/unit/new-post-page.test.js`, and the nav property suite report **No
duplicate candidates found**.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors | Skipped (recorded) |
|---------|-------|--------|----------|--------|--------------------|
| `specs/hosted-files.feature` | 39 | 35 | 4 | 0 | 3 scenarios / 6 mutations |
| `specs/host-file.feature` | 10 | 5 | 5 | 0 | 12 scenarios / 137 mutations |

The two new navigation mutations — `Host File - 17`
(`File Upload → File UpLoad`) and `Hosted Files - 8` — are **killed**. The nine
remaining survivors are the same scenario-level intrinsic equivalents already
documented for `host-file-pages`:

- **Hosted Files — 2** (`filename` case flips): row identified by CID; the
  example `filename` column is setup-only here.
- **Hosted Files — 3** (`api_size 1024→1025`): still renders the example's
  two-decimal `1.02 KB`.
- **Host File — 14** (`paid_cid`/`paid_name` case flips; `shown_target
  none→value`): the CID is not asserted in this scenario, `isImageName` is
  case-insensitive, and the step handler distinguishes only `_blank` from
  non-`_blank`, so `none` and `value` are the same assertion.

No implementation gap is implied; the tool-written manifests are committed
as-is.

### Canonical suite (`verify.sh client`, at `b3deb8bc7a`)

| Command | Result |
|---------|--------|
| unit | 916 pass / 0 fail |
| property | 252 pass / 0 fail |
| acceptance | all 51 acceptance suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/nav-file-hosting-labels-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `nav-file-hosting-labels`, commit `b3deb8bc7a`.
