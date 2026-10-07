# cli-memo-thread — Architect Review

**Task:** `cli-memo-thread` (R2: read a Memo post and its nested reply tree)
**Component:** `psf-memo-cli`
**Architect review commit:** `aa75d60`
**Verification record:** `docs/reviews/cli-memo-thread-verification.json` (`git_sha` `aa75d60`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `7f39a1a` | specifier | Specify the memo-thread read command |
| `635e7b2` | coder | Implement the memo-thread read command (`src/lib/memo-thread.js`, `src/commands/memo-thread.js`, `MemoDb.getThread`, registration, acceptance steps, unit tests) |
| `2dd3266` | refactorer | Extract shared `src/lib/read-command.js` and `acceptance/lib/read-command.js` scaffolding from memo-feed/memo-thread; add memo-thread property tests |

The architect branch fast-forwarded `bbf680b -> 2dd3266`, then added review
commit `aa75d60`.

## Architectural findings and fixes applied

No structural change was needed; the delivered work was already sound. Findings:

1. **Shared read-command scaffolding (good, accepted).** `src/lib/read-command.js`
   now owns the dependency wiring (`initReadCommand`), the read-only MemoDb
   client construction (`createMemoDbClient`), and the reporter/exit-code
   plumbing (`runReadCommand`), mirroring `send-command.js` for the write path.
   `memo-feed.js` and `memo-thread.js` are now thin declarative subclasses that
   supply only their flag parser, their service read, and their renderer. This
   removes the duplicated constructor/client/`process.exitCode` code without
   forcing unrelated behaviors together.

2. **Dependency direction and testability (sound).** Commands depend inward on
   the pure helpers (`src/lib/memo-thread.js`), the shared read-command module,
   and the read-only `MemoDb` client. `MemoDbClass`, `fetchImpl`, and the output
   streams are injected, so both commands are exercised without network or
   wallet. `MemoDb.getThread` reuses `getJson` and resolves an unindexed txid to
   `null`, which the command maps to a named not-found failure (exit 1) — a
   clean split between transport and domain outcome.

3. **Acceptance-runner dedup (good).** `acceptance/lib/read-command.js` factors
   the JSON-mode capture used by both read features; the memo-feed and
   memo-thread step modules now only declare fixtures and assertions. Test
   fixtures and helpers remain separate from the step handlers.

4. **Local code quality (acceptable).** `parseThreadFlags` keeps an explicit
   `txid === ''` clause alongside `!txid`; it is redundant but harmless, the
   documented usage error is exact, and the mutation suite kills both the
   logical and equality mutants, so no change was warranted.

## Verification

**Language mutation** (`mutate4javascript`, `--mutate-all`, `--max-workers 8`),
one file at a time. `--mutate-all` was used because `memo-db.js` added a
function and the two command files gained/lost function sets:

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/read-command.js` | 1 | 0 | 0 |
| `src/lib/memo-thread.js` | 5 | 0 | 0 |
| `src/lib/memo-db.js` | 4 | 0 | 0 |
| `src/commands/memo-thread.js` | 0 | 0 | 0 |
| `src/commands/memo-feed.js` | 0 | 0 | 0 |

The manifest-only source diffs are the tool-written refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
read-command helpers, acceptance step modules, and unit/property tests): **no
duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-thread.feature`): **6 mutations, 6 killed, 0 survived, 0 errors**.
The tool wrote the full manifest and `# mutation-stamp`; there are no
equivalents to document.

**Suite status** (`verify.sh cli`, record `aa75d60`): unit **170 passing**,
property **32 pass / 0 fail**, acceptance **all 7 suites passed**, lint clean —
**pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task `cli-memo-thread`;
  review commit `aa75d60`.
- No follow-up work identified for the coder or refactorer.

By architect.
