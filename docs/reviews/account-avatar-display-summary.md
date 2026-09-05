# Review summary: account-avatar-display

**Architect review of the refactorer handoff for task `account-avatar-display`.**

## Commits reviewed
- `c849c41` (specifier): Specify account avatar image display on the account page
  (`account-avatar-display.feature`).
- `afd4585` (coder): Implement account avatar image display — pure
  `AvatarImage` component, `AccountPage` display helpers, account view wiring,
  acceptance handlers/adapter, unit tests.
- `8088d73` (refactorer): Add property tests for the account page avatar display
  logic (`account-page.property.test.js`).

Merged onto the architect worktree on `swarmforge-architect`.

## Architectural findings and fixes applied
The structure is sound and consistent with the codebase's layered layout.
UI/Core separation and the dependency rule hold:

- **UI/Core separation:** `AvatarImage` (`src/components/account/avatar-image.js`)
  is a pure presentational component written in plain `React.createElement` style
  (no JSX, no I/O), so the same module is usable by the browser build and by the
  Node acceptance adapter. The display logic lives in the testable
  `AccountPage` service (`getDisplayAvatarUrl` / `hasAvatarImage` /
  `getAvatarImageUrl`), and the `Account` view wires the two together.
- **Dependency rule:** the acceptance adapter
  (`acceptance/lib/render-account-avatar.js`) depends inward on the pure
  component; the component has no outward dependencies.
- **Information hiding:** the service exposes clear semantic methods and the
  component hides the `<img>` markup (src/alt/class). The `hasAvatarImage` and
  `getAvatarImageUrl` methods are thin wrappers over `getDisplayAvatarUrl`, but
  they give the acceptance handlers distinct, readable names and their
  consistency is pinned by the property tests — left as-is.

No structural changes were required. The only non-test source diffs are
tool-generated mutation manifests (see below).

**Constitution note:** the refactorer also updated
`swarmforge/constitution/articles/engineering.prompt` to make the Language
Defaults section JavaScript-specific (mocha/chai/standard/c8/semantic-release
as preferred dev deps), replacing the Clojure/Java defaults that do not apply to
this project. This is a reasonable governance cleanup for a JavaScript monorepo
and is a soft "prefer" recommendation, so it was kept. It is unrelated to the
feature itself and is called out here for the human.

## Verification results

### Language mutation (`mutate4javascript`, full coverage, `--max-workers 8`)
- **`account-page.js`**: 11 killed, **0 survived**, 0 uncovered. The refreshed
  embedded manifest now includes the new `getAvatarUrl`, `getDisplayAvatarUrl`,
  `hasAvatarImage`, `getAvatarImageUrl`, `hasSetAvatarUrlButton`, and
  `clickSetAvatarUrl` functions.
- **`avatar-image.js`**: 0 mutation sites found — a tool limitation with this
  simple React component (a conditional return plus a `React.createElement` call).
  The component is well covered by 6 unit tests (undefined/null/empty/valid URL,
  alt text, class) and the acceptance suite, so no coverage gap exists.

### DRY (`dry4javascript`)
- Changed files (`account-page.js`, `avatar-image.js`): **no duplicate
  candidates**.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions are well below the 8.0 threshold and 100% covered. Highest:
`AccountPage._getProfileField` (CC 4, CRAP 4.0), `getDisplayAvatarUrl` (CC 3,
CRAP 3.0), `AvatarImage` (CC 2, CRAP 2.0); the rest are CC 1.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
- **`account-avatar-display.feature`**: 2 executed, **2 survived** — both are
  single-character case mutations of the example avatar URLs
  (`https://example.com/avatar.png` → `https://exaMple.com/avatar.png`). Each
  example URL is used consistently on both the setup (set-avatar-url broadcast)
  and assertion (account page displays) sides of its scenario, so the mutated
  value is still displayed correctly. These are intrinsic equivalents, not
  implementation gaps; no change warranted.

## Suite status
- `psf-memo-client`: unit **298 passing**, property **43 passing**, acceptance
  **pass** (all 25 feature files, including the new `account-avatar-display`
  suite), lint **pass**, build **pass**.

## Handoffs sent
- `git_handoff` to coder and refactorer (`priority: 00`) with the account-avatar
  display review commit (refreshed mutation manifest, Gherkin acceptance-mutation
  stamp, and this summary).
- No specifier handoff: no functional or spec change in this commit (only
  tool-generated manifests/stamps and the review summary).

By architect.
