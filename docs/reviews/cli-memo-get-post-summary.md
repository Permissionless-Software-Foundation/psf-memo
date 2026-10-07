# cli-memo-get-post — Architect Review

**Task:** `cli-memo-get-post` (R3: read a single stored Memo post document)
**Component:** `psf-memo-cli`
**Architect review commit:** `e91506a`
**Verification record:** `docs/reviews/cli-memo-get-post-verification.json` (`git_sha` `e91506a`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `8cd44be` | specifier | Specify the memo-get-post read command |
| `a4093d4` | coder | Implement the memo-get-post read command (`src/lib/memo-get-post.js`, `src/commands/memo-get-post.js`, `MemoDb.getPost`, registration, acceptance steps, unit tests) |
| `86b2de5` | refactorer | Extract shared `src/lib/txid-flag.js` and acceptance error-assertion helpers; add memo-get-post property tests |

The architect branch fast-forwarded `8fe83ce -> 86b2de5`, then added review
commit `e91506a`.

## Architectural findings and fixes applied

No structural change was needed; the delivered work was already sound. Findings:

1. **Required-txid parsing is now single-sourced (good, accepted).** The
   refactorer moved the `-t` validation and its exact usage message into
   `src/lib/txid-flag.js`; `memo-thread`'s `parseThreadFlags` and
   `memo-get-post`'s `validateFlags` both delegate to it. The previous redundant
   `txid === ''` clause is gone without changing the documented error.

2. **Shared read-command scaffolding reused (good).** `memo-get-post.js` is a
   thin subclass of `src/lib/read-command.js` (same wiring/client/reporter path
   as memo-feed and memo-thread), and the pure `formatGetPostMessage` summary
   sits in `src/lib/memo-get-post.js`. Dependencies point inward and the command
   is testable via injected `MemoDbClass`/streams.

3. **Domain key applied at the boundary (good).** The `/level/post/:txid` body is
   not txid-keyed, so the command merges the request `txid` into the reported
   post. That keeps the transport (`MemoDb.getPost`) and the pure formatter
   ignorant of the request, and `getPost` resolves a missing document to `null`
   for the command's named not-found failure (exit 1).

4. **Acceptance assertion helpers shared (good).** `acceptance/lib/read-command.js`
   now also owns `parseStderrError`, `assertNotFound`, and
   `assertReadCommandError`; the memo-feed and memo-thread step modules were
   migrated onto them, removing three copies of the same stderr/exit assertion.

## Verification

**Language mutation** (`mutate4javascript`, `--mutate-all`, `--max-workers 8`),
one file at a time:

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/txid-flag.js` | 0 | 0 | 0 |
| `src/lib/memo-get-post.js` | 0 | 0 | 0 |
| `src/commands/memo-get-post.js` | 0 | 0 | 0 |
| `src/lib/memo-thread.js` | 4 | 0 | 0 |
| `src/lib/memo-db.js` | 4 | 0 | 0 |

The new memo-get-post modules are built from `!` guards, template literals, and
`||` defaults, so they scan as 0 mutation sites — a structural zero confirmed
with `--scan`, not an under-selected run. The manifest-only source diffs are the
tool-written refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
read-command/txid-flag helpers, acceptance step modules, and unit/property
tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-get-post.feature`): **10 mutations, 10 killed, 0 survived,
0 errors**. The tool wrote the full manifest and `# mutation-stamp`; there are
no equivalents to document.

**Suite status** (`verify.sh cli`, record `e91506a`): unit **185 passing**,
property **35 pass / 0 fail**, acceptance **all 8 suites passed**, lint clean —
**pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task `cli-memo-get-post`;
  review commit `e91506a`.
- No follow-up work identified for the coder or refactorer.

By architect.
