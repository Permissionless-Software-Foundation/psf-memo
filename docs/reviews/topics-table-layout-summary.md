# Topics Table Layout — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `topics-table-layout` (refactorer handoff
  `merge_and_process refactorer ec753a9c88`).
- Merged `swarmforge-refactorer` (fast-forward). Commits:
  - `41af8f9` Spec topics table layout
  - `ac4d9ea` Render topics page as a table (coder)
  - `ec753a9` Add property tests for the topics table view model (refactorer)
- Architect review commit: `d1f0f76` (tool-written mutation manifests only).
- Verification record `git_sha`: `d1f0f76cca`.
- Records/summary commit: (this commit).

The feature replaces the topics page flexbox list with a react-bootstrap
`Table` so the four columns line up, driven by a pure `buildTopicsTable` view
model (headers, per-row cells, feed link, horizontal-scroll wrapper). Client
only.

## Architectural findings

- **UI/Core separation (good).** `src/services/topics-table.js` is a pure view
  model with no DOM or React dependency, so the header order, per-row cell
  order, link encoding, and scroll wrapper are all testable without a DOM. The
  React `Topics` component is a thin shell that maps the model into
  `<Table>`/`<thead>`/`<tbody>`; it is the environmentally unsuitable boundary
  and stays excluded from language mutation, consistent with the established UI
  precedent.
- **Dependency direction (good).** The view model reuses `relative-time.js`
  for the label and `TopicDiscoveryPage.topicFeedPath` for the row link, so the
  path encoder is not re-implemented. `TopicDiscoveryPage` remains the
  load/pagination controller and the component's only data dependency.
- **Information hiding (good).** The component consumes only `headers`,
  `rows[].cells`, `rows[].href`, `rows[].room`, and `wrapperClass`; the model
  hides the column order and percent-encoding. The horizontal-scroll contract
  is represented as `wrapperClass = 'table-responsive'` rather than left to
  JSX inspection.
- **Local quality (good).** `buildTopicsTable` scans at CC 1 / CRAP 1.0 with
  100% coverage. `?? 0` defaults and `relativeTime` cover omitted count and
  last-seen fields for legacy topics.
- **Observation, not changed.** The component recomputes the feed path in
  `handleClick` while each row already carries `href`; both produce the
  identical encoded path, so the redundancy is harmless.

## Fixes applied

None required. Language mutation killed every site, `dry4javascript` reported no
candidates, CRAP is 1.0 at 100% coverage, and soft Gherkin mutation killed every
mutation. The architect commit contains only the tool-written
`mutate4javascript` manifest and the `gherkin-mutator` stamp/manifest.

## Verification

Record:

| File | Component |
|------|-----------|
| `docs/reviews/topics-table-layout-verification.json` | psf-memo-client |

Suite status (all `pass`): **psf-memo-client** 447 unit, 94 property,
34 acceptance suites, lint ok, build ok.

- **Language mutation** (`mutate4javascript`, `--max-workers 8`):
  `topics-table.js` 2/2 killed, 0 survived.
- **DRY** (`dry4javascript`, scoped to the changed service, component, unit and
  property tests): no candidates.
- **CRAP** (`crap4javascript`): `buildTopicsTable` CC 1 / CRAP 1.0 / 100%
  coverage.
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`): `topics-table-layout.feature` 16 total, **16 killed**, 0
  survived → the tool wrote a `# mutation-stamp` plus the per-scenario manifest
  (committed as-is).

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using the records/summary commit.
- No coder/refactorer follow-up: the commit is tool-written mutation metadata
  only, with no production or test change.
