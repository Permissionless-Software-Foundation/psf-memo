# Review summary: set-avatar-url

**Architect review of the refactorer handoff for task `set-avatar-url`.**

## Commits reviewed
- `991053a` (specifier): Spec Set Avatar URL feature.
- `7bee85a` (coder): Implement Set Avatar URL client feature — `memo-set-avatar-url.js`,
  `set-avatar-url-page.js`, account/set-avatar-url React components, acceptance handlers,
  and unit tests.
- `131d31e` (refactorer): Merge coder set-avatar-url implementation.
- `58e21ff01a` (refactorer): Deduplicate Memo profile-text actions and add set-avatar-url
  property tests — extracted a shared `MemoProfileTextAction` base with a `profileTextConfig`
  factory so `MemoSetName`, `MemoSetBio`, and `MemoSetAvatarUrl` each become a thin data
  declaration, removing the duplicated config and broadcast method; added property tests
  covering the avatar URL byte limit, round trips, and byte budget conservation.

Merged with the prior chain commits (`2eb86e2` specifier backlog update, `e321c7f` revert of
an unrelated specifier-model change in `swarmforge.conf`).

## Architectural findings and fixes applied
The refactorer's structure is sound. `MemoSetName`/`MemoSetBio`/`MemoSetAvatarUrl` are now
thin config-driven subclasses of the shared `MemoProfileTextAction` base, which supplies the
config factory and the broadcast-method binding; the three actions differ only in their
protocol prefix, byte limit, error codes, and profile-store method. UI/Core separation,
dependency direction, and information hiding all hold: the wallet and profiles store are
injected, keeping the module free of network/UI concerns behind small adapter boundaries.
The client remains the only component touched; no `psf-memo-db`/`psf-memo-indexer` changes.

No hardening fix was required. The refactorer's property tests already cover the avatar URL
byte limit, UTF-8 round trips, byte-budget conservation, and the over-limit rejection path,
and language mutation reports no survivors in the changed source files.

## Verification results

### Language mutation (`mutate4javascript`, differential vs manifest, `--max-workers 8`)
Every changed testable source file is fully killed (0 survivors, 0 uncovered):
- `psf-memo-client/src/services/memo-profile-text-action.js` — 3/3 killed (new base)
- `memo-set-avatar-url.js`, `memo-set-bio.js`, `memo-set-name.js` — 0 sites (thin config
  wrappers; their logic lives in the fully-killed `MemoProfileTextAction`/`MemoAction` bases)

The React components (`app-body/account`, `app-body/set-avatar-url`, `app-body`) are JSX UI
modules the mutation tool cannot parse; per the constitution these environmentally
unsuitable UI modules are excluded from mutation testing, and their testable logic lives
in the services above.

### DRY (`dry4javascript`)
No duplicate candidates found in `src/services`.

### CRAP / cyclomatic complexity (`crap4javascript`)
All changed functions within threshold: `profileTextConfig` CC 1, 100% branch coverage,
CRAP 1.0. The three thin action subclasses expose no functions (config-only declarations).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)
**psf-memo-client** `set-avatar-url.feature`: 12 executed, **6 killed, 6 survived**.
- Scenario 1 (valid avatar URL broadcast) `m1`,`m2`: mutated capitalization of the URL
  example survives because the assertion echoes the broadcast value from the same example
  (weak/tautological example-to-assertion connection). Specifier-side feature-quality item.
- Scenario 3 (over-long URL rejected) `m4`,`m5`: mutated chars still leave the URL over the
  217-byte limit, so rejection is unchanged — genuine equivalents.
- Scenario 4 (byte counter) `m9`,`m13`: mutated chars leave the byte length unchanged, so
  the remaining count is identical — genuine equivalents.

The sibling features touched by the shared-base refactor were also re-verified:
`set-bio.feature` (6 killed, 6 survived) and `set-name.feature` (7 killed, 7 survived), all
survivors being the same capitalization/same-length equivalents or tautological-assertion
cases. No implementation changes are warranted; the equivalents are intrinsic and the
tautological-assertion cases are specifier feature-quality improvements.

## Suite status
- `psf-memo-client`: unit **74 passing**, property **11 passing**, acceptance **pass**
  (8 feature files), lint **pass**.

## Handoffs sent
- No coder/refactorer handoff: the architect made no functional changes requiring follow-up
  review (only the durable report and tool-generated mutation manifests).
- No specifier handoff: no specification changes in this commit (the feature-file mutation
  manifests are tool-generated metadata; the weak-scenario findings are recorded here for
  the specifier in the durable report).

By architect.
