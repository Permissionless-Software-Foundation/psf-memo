# Review summary: set-bio

**Architect review of the refactorer handoff for task `set-bio`.**

## Commits reviewed
- `fcab46d` (specifier): Add Gherkin spec for Set Bio (`0x6d05`) client write path.
- `01a1676` (coder): Implement Set Bio (`0x6d05`) client write path — `memo-set-bio.js`,
  `set-bio-page.js`, account/set-bio React components, acceptance handlers, and unit tests.
- `9c5767d462` (refactorer): Refactor set-bio to share profile-text action and page bases —
  moved byte-limit and profile-store reflection into `MemoAction` via config (`maxBytes`,
  `profileMethod`), extracted a shared `ProfileTextPage` base for `SetBioPage`/`SetNamePage`,
  generalized `AccountPage._getProfileField`, and added byte-counting property tests.

Merged with the prior chain commits (`5926db1` specifier backlog update). The unrelated
`swarmforge.conf` specifier-model change carried on the refactorer branch was left out of
this review merge.

## Architectural findings and fixes applied
The refactorer's structure is sound. `MemoSetBio`/`MemoSetName` are now thin config-driven
subclasses of `MemoAction`; `SetBioPage`/`SetNamePage` share the `ProfileTextPage` base,
which stays free of UI/network concerns behind injected handler/navigate adapters.
UI/Core separation, dependency direction, and information hiding all hold. The client
remains the only component touched; no `psf-memo-db`/`psf-memo-indexer` changes.

I applied one hardening fix (test addition only; no production code changed):

- **`psf-memo-client/test/unit/set-bio-page.test.js`**: added a test asserting the page's
  in-flight flag (`settingBio`) initializes to `false`, killing the sole survivor in the
  shared `ProfileTextPage` base constructor.

## Verification results

### Language mutation (`mutate4javascript`, differential vs manifest, `--max-workers 8`)
Every changed testable source file is fully killed (0 survivors, 0 uncovered):
- `psf-memo-client/src/services/profile-text-page.js` — 3/3 killed (new base)
- `psf-memo-client/src/services/account-page.js` — 3/3 killed
- `psf-memo-client/src/services/memo-action.js` — 3/3 killed
- `psf-memo-client/src/services/profiles.js` — 1/1 killed
- `memo-set-bio.js`, `memo-set-name.js`, `set-bio-page.js`, `set-name-page.js` — 0 sites
  (thin config wrappers; their logic lives in the fully-killed `MemoAction`/`ProfileTextPage`)

The React components (`app-body/account`, `app-body/set-bio`, `app-body`) are JSX UI
modules the mutation tool cannot parse; per the constitution these environmentally
unsuitable UI modules are excluded from mutation testing, and their testable logic lives
in the services above.

### DRY (`dry4javascript`)
One structural match reported: `MemoSetBio` and `MemoSetName` class shells (score 1.00).
This is the expected residual pattern of two config-only sibling subclasses of the same
`MemoAction` base; the structural fingerprint normalizes away the distinguishing prefix,
messages, byte limits, and method names. Merging them into a single class would forfeit
the distinct protocol constants (`0x6d01` vs `0x6d05`, `MAX_NAME_BYTES` vs `MAX_BIO_BYTES`)
the pages rely on, with no runtime duplication to remove. Retained as intentional siblings.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions within threshold (max CC 4, CRAP 4.0, 100% branch coverage on all
except the defensive `MemoAction.isTooLong` guard at 66.7% / CRAP 2.1).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
**psf-memo-client** `set-bio.feature`: 13 discovered, 12 executed, **6 killed, 6 survived**.
- Scenario 1 (valid bio broadcast) `m1`,`m2`: mutated capitalization of the bio example
  survives because the assertion echoes the broadcast value from the same example
  (weak/tautological example-to-assertion connection). Specifier-side feature-quality item.
- Scenario 3 (over-long bio rejected) `m4`,`m5`: mutated chars still leave the bio over the
  217-byte limit, so rejection is unchanged — genuine equivalents.
- Scenario 4 (byte counter) `m9`,`m13`: mutated chars leave the byte length unchanged, so
  the remaining count is identical — genuine equivalents.

No implementation changes are warranted; the equivalents are intrinsic and the
tautological-assertion cases are specifier feature-quality improvements.

## Suite status
- `psf-memo-client`: unit **48 passing**, property **6 passing**, acceptance **pass**
  (7 feature files), lint **pass**, build **success**.

## Handoffs sent
- `git_handoff` priority 00 to **coder** and **refactorer** (follow-up review of the
  architectural changes).
- No specifier handoff: no specification changes in this commit (the set-bio feature-file
  mutation manifest is tool-generated metadata; the weak-scenario findings are recorded
  here for the specifier in the durable report).

By architect.
