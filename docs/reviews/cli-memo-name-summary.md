# cli-memo-name — Architect Review

**Task:** `cli-memo-name` (W4: `0x6d01` set-name write command)
**Component:** `psf-memo-cli`
**Architect review commit:** `a020de3ade`
**Verification record:** `docs/reviews/cli-memo-name-verification.json`
(`git_sha` `a020de3ade`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `57b3c3d` | specifier | Specify memo-name (W4) set-name write command (`specs/memo-name.feature`, 7 scenarios) |
| `c3ddeac` | coder | Implement the command (`src/lib/memo-name.js`, `src/commands/memo-name.js`, acceptance steps, unit + property tests) |
| `1e7c63c` | refactorer | Share the single-field write-command pipeline (`defineFieldWriteCommand`, `memo-post` migrated) |

The architect branch fast-forwarded `2a34ccc -> 1e7c63c`, then added review
commit `a020de3ade` (77-byte boundary coverage, tool-written manifests and the
feature mutation manifest).

## Architectural findings and fixes applied

1. **Single-field write factory (good).** `defineFieldWriteCommand` in
   `src/lib/write-command.js` owns the run/validate/post wiring for
   single-field Memo actions; `memo-post` and `memo-name` are now declarations
   of `parse`/`format`/`prefix`/`field`. `runWriteCommand` remains the shared
   pipeline for the multi-field commands (`memo-reply`, `memo-like`), so the
   write path has one validate -> resolve wallet -> broadcast -> report flow.

2. **Protocol rules stay in their own pure modules (good).** `memo-name.js`
   owns the `0x6d01` prefix and the 77 **UTF-8 byte** limit
   (`Buffer.byteLength`), distinct from `memo-post.js`'s 217 UTF-16 code-unit
   limit; the command is a thin declaration over the factory and the shared
   wallet-source / broadcast scaffolding.

3. **Mutation survivor fixed.** The first mutation run left `>` -> `>=` alive at
   the 77-byte boundary in `parseMemoNameFlags`: the tests covered 76 bytes
   (accepted) and 78 bytes (rejected) but never exactly 77. Added a 77-byte
   ASCII acceptance assertion to the unit test and to the property test's
   "inclusive at 77 bytes" check. Re-run: 2 killed, 0 survived.

4. **No production structural change needed** beyond the boundary fix; the DRY
   run is clean.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` where differential under-selected). No survivors.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-name.js` | 2 | 0 | 0 |
| `src/commands/memo-name.js` | 0 | 0 | 0 |
| `src/commands/memo-post.js` | 0 | 0 | 0 |
| `src/lib/write-command.js` | 3 | 0 | 0 |

`write-command.js` reran with `--mutate-all` after `defineFieldWriteCommand` was
added; the command modules with zero sites are declarations only.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance modules, and the new/changed unit/property tests): **no duplicate
candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-name.feature`): **15 mutations, 5 killed, 10 survived, 0 errors**.
The 5 kills are the byte/length mutations in the byte-limit outline and the
empty-name mutation. The 10 survivors are intrinsic equivalents:
`name`/`txid`/`error` single-character case changes are used on both the setup
and the assertion side of their scenario (`... returns the txid "<txid>"` then
`... reported the transaction id "<txid>"`), and the `length` mutations (39/100
-> 42/102) remain above the 77-byte limit, so the same usage error is raised.
The tool wrote an acceptance-mutation manifest recording `scenario[4]` (the
empty-name scenario, all killed); the equivalent scenarios are intentionally
re-mutated next run.

**Suite status** (`verify.sh cli`, record `a020de3ade`): unit **458 passing**,
property **97 pass / 0 fail**, acceptance **all 26 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-name`, commit `a020de3ade`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
