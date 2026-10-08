# cli-memo-avatar — Architect Review

**Task:** `cli-memo-avatar` (W6: `0x6d0a` set-profile-picture write command)
**Component:** `psf-memo-cli`
**Architect review commit:** `2771df6039`
**Verification record:** `docs/reviews/cli-memo-avatar-verification.json`
(`git_sha` `2771df6039`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `236b07a` | specifier | Specify memo-avatar (W6) set-profile-picture write command (`specs/memo-avatar.feature`, 7 scenarios) |
| `77dc9d4` | coder | Implement the command (`src/lib/memo-avatar.js`, `src/commands/memo-avatar.js`, acceptance steps, unit + property tests) |
| `a9e1352` | refactorer | Extend the shared property tests to the `-u` flag |

The architect branch fast-forwarded `ab6f909 -> a9e1352`, then added review
commit `2771df6039` (tool-written manifests and the feature mutation manifest).

## Architectural findings and fixes applied

1. **Shared text-flag parser generalized (good).** `memoTextFlagParser` gained a
   `flag` parameter (default `memo`) so the avatar command validates the `-u`
   URL while reusing the same missing / empty / over-long contract as the `-m`
   text commands. `memo-avatar` keeps its own `0x6d0a` prefix and 217-UTF-8-byte
   limit in its pure module.

2. **Shared test registrars extended (good).** `test/support/memo-text-flag-tests.js`
   and `test/property/memo-text-flag-property.js` now take `flag` / `missingHint`,
   so `memo-avatar` reuses the shared validation, exact-boundary, and byte-limit
   property tests without duplicating them.

3. **Write scaffolding reused (good).** `memo-avatar` is a declaration of
   `parse`/`format`/`prefix`/`field` over `defineFieldWriteCommand`, so it shares
   the whole validate -> resolve wallet -> broadcast -> report pipeline.

4. **No production structural fix required.** The review commit is manifest-only
   (the refactorer's shared helpers already carry the exact 217-byte boundary
   assertion). The scoped DRY run reports only the per-command `memo-bio` /
   `memo-name` unit-test wrapper pair previously documented and accepted in
   `docs/reviews/cli-memo-bio-summary.md`; it is not introduced or worsened here.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` where differential under-selected). No survivors.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-avatar.js` | 0 | 0 | 0 |
| `src/commands/memo-avatar.js` | 0 | 0 | 0 |
| `src/lib/memo-text-flag.js` | 2 | 0 | 0 |

Only the shared parser carries mutation sites; the avatar module is config and
format only. The 217-byte exact boundary is covered by the shared registrar.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance modules, the changed shared test registrars, and the avatar/bio/name
tests): only the previously documented and accepted `memo-bio` / `memo-name`
per-command unit-test wrapper pair remains.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-avatar.feature`): **15 mutations, 5 killed, 10 survived, 0 errors**.
The 5 kills are the byte/length mutations in the byte-limit outline and the
empty-URL mutation. The 10 survivors are intrinsic equivalents: `txid`/`url`/
`error` case changes are used on both the setup and assertion side, and the
`length` mutations (109/150 -> 115/145) remain above the 217-byte limit so the
same usage error is raised. The tool wrote an acceptance-mutation manifest
recording `scenario[4]` (the empty-URL scenario); the equivalent scenarios are
re-mutated next run.

**Suite status** (`verify.sh cli`, record `2771df6039`): unit **493 passing**,
property **103 pass / 0 fail**, acceptance **all 28 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-avatar`, commit `2771df6039`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
