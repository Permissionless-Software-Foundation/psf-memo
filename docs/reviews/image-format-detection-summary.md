# Architect review — `image-format-detection`

**Role**: architect
**Task**: `image-format-detection` (client-only, `psf-memo-client`)
**Reviewed commits**: `3e7544d` (specifier, spec) → `eef4478` (coder) → `30fd931`
(refactorer, format-list unification + property coverage)
**Merge**: fast-forward `swarmforge-architect` → `30fd931138`
**Review commit**: `ea720e9284` (tool-written manifests + property test rename)
**Verification record**: `docs/reviews/image-format-detection-verification.json`
(`git_sha` `ea720e928440bf09cd55fd455e7f14c6673a17c6`)

## Scope

Recognize image URLs whose path has no image extension but whose query string
carries an image format hint (`?format=jpg|jpeg|png|gif|webp|bmp`,
case-insensitive), so X/Twitter-style URLs such as
`https://pbs.twimg.com/media/HUDsd-2XAAA6KW7?format=jpg&name=small` render inline
instead of as plain links. The task extends `src/services/post-links.js`, adds
unit/property/acceptance coverage, widens the two rendering feature files, and
teaches the client acceptance adapter to compare React-escaped attributes.
Client-only rendering feature; no Memo action and no DB write.

## Architectural findings

- **One format list now owns both detection forms.** The refactorer replaced the
  independent `IMAGE_EXTENSION_RE` and `IMAGE_FORMAT_VALUES` literals with a
  single module-private `IMAGE_FORMATS` list that builds the path regex and the
  query `Set`. Before, adding or renaming a format required two edits that could
  drift; now there is exactly one source of truth. The list is not exported, so
  the representation stays hidden behind `isImageUrl`.
- **Dependency direction holds.** `post-links.js` is a pure module with no React,
  network, or persistence imports. `post-content.js` (UI), the acceptance
  adapter, and the tests all depend inward on it.
- **Query parsing delegates to the platform.** `isImageUrl` reuses the existing
  `new URL(url)` parse and reads `searchParams.get('format')`, so extra
  parameters (`&name=small`), ordering, and case are handled by the standard
  library rather than hand-rolled string splitting. Invalid URLs still return
  `false` from the existing `try/catch`.
- **Acceptance attribute decoding is a test-layer concern.** React escapes `&`
  as `&amp;` in `src`/`href`, which previously made URL-bearing attribute
  assertions fail. The new `decodeHtmlEntities` helper lives in the acceptance
  handler (test helper), not in production code; generated tests stay separate
  from the helper.
- **Accepted, not changed.** `isImageUrl` lets a format query win even when the
  path carries a different extension (e.g. `file.txt?format=jpg`). That is the
  specified intent — the query is treated as an explicit image hint — and is
  pinned by the format-hint property test. `IMAGE_EXTENSIONS` in the property
  test intentionally mirrors the production list as an independent oracle.

## Fixes applied

- **Renamed a contradictory property test.** `isImageUrl rejects non-image paths
  even when a query mentions an image` no longer describes the behavior after
  this feature (a non-image path *with* an image format query is now an image);
  its generated inputs never carried a `format` query anyway. Retitled to
  `isImageUrl rejects non-image paths with unrelated queries`.
- **Manifests.** Recorded the rewritten `mutate4javascript` manifest for
  `src/services/post-links.js` and the `gherkin-mutator` acceptance-mutation
  manifests for `specs/post-image-rendering.feature` and
  `specs/profile-post-rendering.feature`. Both new format-query scenarios are
  recorded at 16/16 killed.

## Verification

### Language mutation (`mutate4javascript`, `--mutate-all --max-workers 8`)

| File | Total | Covered | Selected | Killed | Survived | Uncovered |
|------|-------|---------|----------|--------|----------|-----------|
| `src/services/post-links.js` | 22 | 22 | 22 | 22 | 0 | 0 |

`--mutate-all` was used because the refactorer changed function bodies; the run
confirmed `Selected == Total`, so no differential under-selection.

### DRY (`dry4javascript`, scoped to the changed modules and tests)

`src/services/post-links.js`, `test/property/post-links.property.test.js`,
`test/unit/post-links.test.js`, `test/unit/post-content.test.js`: **No duplicate
candidates found.** The acceptance helper addition introduces no new duplicate.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)

| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/post-image-rendering.feature` | 42 | 41 | 1 | 0 |
| `specs/profile-post-rendering.feature` | 51 | 49 | 2 | 0 |

All three survivors are intrinsic equivalents: single-character case flips of an
example's surrounding text (`read … -> reaD …`, `visit … for details -> … For
details`). Each mutated value is used consistently on both the setup and the
assertion sides, and the non-image scenario never asserts the literal casing of
the example text, so no implementation gap is implied. The two new
format-query scenarios are fully killed (16/16 each) and recorded.

### CRAP / cyclomatic complexity (`crap4javascript`)

All changed functions are 100% covered. Highest: `parsePostLinks` (CC 6, CRAP
6.0), `isImageUrl` (CC 5, CRAP 5.0), `isBareDomainBoundary` (CC 4, CRAP 4.0),
`imageAltText` (CC 3, CRAP 3.0), `pushText` (CC 2, CRAP 2.0). Exit 0 (threshold
8.0).

### Canonical suite (`verify.sh client`, at `ea720e9284`)

| Command | Result |
|---------|--------|
| unit | 825 pass / 0 fail |
| property | 226 pass / 0 fail |
| acceptance | all 49 acceptance suites passed |
| lint | ok |
| build | ok |

`result: pass (5/5)`. Record:
`docs/reviews/image-format-detection-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `image-format-detection`, commit `ea720e9284`.
