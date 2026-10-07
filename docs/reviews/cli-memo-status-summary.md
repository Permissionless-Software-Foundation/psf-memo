# cli-memo-status — Architect Review

**Task:** `cli-memo-status` (R14: report the psf-memo-db indexer's sync state)
**Component:** `psf-memo-cli`
**Architect review commit:** `f842955`
**Verification record:** `docs/reviews/cli-memo-status-verification.json` (`git_sha` `f842955`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `c05ae45` | specifier | Specify the memo-status read command |
| `5c9b028` | coder | Implement the memo-status read command (`src/lib/memo-status.js`, `src/commands/memo-status.js`, `MemoDb.getStatus`, registration, acceptance steps, unit tests) |
| `889a4e4` | refactorer | Reuse the shared acceptance error assertions; add status property tests |

The architect branch fast-forwarded `373912d -> 889a4e4`, then added review
commit `f842955`.

## Architectural findings and fixes applied

1. **Read-command scaffolding reused (good, accepted).** `memo-status.js` is a
   thin subclass of `src/lib/read-command.js`; the pure `formatStatusMessage`
   sits in `src/lib/memo-status.js`; `MemoDb.getStatus` reuses `getJson` and
   resolves a missing `/level/status/status` record to `null`, which the command
   maps to a named not-found failure (exit 1). Dependencies point inward and the
   command is testable via injected `MemoDbClass`/streams.

2. **Flag-less command interface (reviewed, left as-is).** `memo-status` has no
   required flags, so its `validateFlags()` returns a constant `true` purely to
   satisfy the shared read-command binding. That mutation site is killed by an
   explicit unit test (`validateFlags({}) === true`), so it is not a dead
   equivalent; keeping the uniform interface was simpler than making the shared
   binder tolerant of a missing method.

3. **Duplicated 404 tests consolidated (fixed).** `dry4javascript` flagged three
   identical "a 404 resolves to null" test blocks in
   `test/unit/lib/memo-db.unit.js` (added incrementally by the thread, post, and
   status tasks). Extracted one local `assertMissingResource(method, arg)` helper
   and reduced each test to a single call; DRY is now clean.

## Verification

**Language mutation** (`mutate4javascript`, `--mutate-all`, `--max-workers 8`),
one file at a time:

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/commands/memo-status.js` | 1 | 0 | 0 |
| `src/lib/memo-status.js` | 0 | 0 | 0 |
| `src/lib/memo-db.js` | 4 | 0 | 0 |

`src/lib/memo-status.js` is a single template literal, so it scans as 0
mutation sites (confirmed with `--scan`). The manifest-only source diffs are the
tool-written refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production modules, acceptance
step module, and unit/property tests): initially flagged the three memo-db 404
test blocks; after finding 3 they are consolidated and the re-run is **no
duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-status.feature`): **9 mutations, 0 killed, 9 survived, 0 errors**.
All nine are intrinsic equivalents: each `startBlockHeight`/
`syncedBlockHeight`/`chainBlockHeight` example value is parsed from the same
cell in both the `Given the Memo DB service serves the indexer status ...`
setup and the `Then the command reported ...` assertion, so any mutation applies
consistently to both sides. The tool wrote the expected empty
`"scenarios":[]` manifest (no `# mutation-stamp`); those scenarios are
intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `f842955`): unit **194 passing**,
property **38 pass / 0 fail**, acceptance **all 9 suites passed**, lint clean —
**pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task `cli-memo-status`;
  review commit `f842955`.
- No follow-up work identified for the coder or refactorer.

By architect.
