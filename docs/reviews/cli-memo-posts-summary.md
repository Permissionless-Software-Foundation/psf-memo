# cli-memo-posts — Architect Review

**Task:** `cli-memo-posts` (R5: top-level posts authored by an address)
**Component:** `psf-memo-cli`
**Architect review commit:** `382485b5f2`
**Verification record:** `docs/reviews/cli-memo-posts-verification.json`
(`git_sha` `382485b5f2`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `0ade7f2` | specifier | Specify the memo-posts read command (`specs/memo-posts.feature`, 6 scenarios) |
| `7ddeb47` | coder | Implement the command (`memo-posts.js` lib + command, shared `address-flag.js`, acceptance steps, unit + property tests) |
| `ceaff68` | refactorer | Add `post-page-command.js`, move the address-page request assertion and `findReportedPost` into `read-result.js` |

The architect branch fast-forwarded `dcf66fd -> ceaff68`, then added review
commit `382485b5f2` (tool-written manifests and the acceptance mutation stamp;
no manual code changes were required this time).

## Architectural findings and fixes applied

1. **Shared post-page read pipeline (good).** `src/lib/post-page-command.js`
   owns the validate -> read -> `{ posts, pagination }` -> summary pipeline that
   `memo-feed` and `memo-posts` both need. Each command supplies its own flag
   parser (`validateFlags`) and `readMethod`, so the command still owns its read
   signature while the reporter/exit-code and summary plumbing is shared. This
   mirrors `read-command.js` for the generic path and `write-command.js` for the
   write path, keeping the three families consistent.

2. **Shared required `-a` address flag (good).** `address-flag.js` now owns the
   required-address validation; `memo-profile` and `memo-posts` share it and pass
   their own role-specific message. This is the read-side analogue of
   `txid-flag.js` and `page-flags.js`.

3. **Thin command (good).** `MemoPosts` is a constructor plus `run`/`validateFlags`/
   `createClient`/`readPosts`; the pure `memo-posts.js` owns the flag parsing and
   defaults, and the DB route stays in `MemoDb.getPostsByAddr`.

4. **Shared acceptance steps (good).** `findReportedPost` and a single
   address-page request step (matching `notifications` or `address-posts`) moved
   into `read-result.js`, removing the duplicated step bodies from `memo-feed`,
   `memo-posts`, and `memo-notifications`.

5. **No manual fixes needed.** The first `--mutate-all` pass left no survivors,
   and the scoped `dry4javascript` run reported no duplicate candidates, so the
   review commit contains only the tool-written manifests and the clean
   acceptance mutation stamp.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` for the new/changed modules). No survivors; a follow-up
`--scan` confirmed `Changed mutation sites: 0` and `Manifest exists: true` for
all six.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/address-flag.js` | 0 | 0 | 0 |
| `src/lib/memo-posts.js` | 1 | 0 | 0 |
| `src/lib/post-page-command.js` | 0 | 0 | 0 |
| `src/commands/memo-posts.js` | 0 | 0 | 0 |
| `src/commands/memo-feed.js` | 0 | 0 | 0 |
| `src/lib/memo-profile.js` | 5 | 0 | 0 |

`address-flag.js` and `post-page-command.js` scan as 0 sites because they are
built from a guard, destructuring defaults, and spreads with no arithmetic,
comparison, equality, boolean, or logical site (the documented structural-zero
case). The mutation suite runs `npm test` (unit only), so the property tests do
not contribute kills.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, and the new unit/property tests): **no duplicate
candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-posts.feature`): **22 mutations, 22 killed, 0 survived, 0
errors**. The page-size/offset outline (16 mutations) and the per-post
text/reply-count outline (6 mutations) are all observable, so the tool wrote a
clean manifest with a `# mutation-stamp`.

**Suite status** (`verify.sh cli`, record `382485b5f2`): unit **342 passing**,
property **61 pass / 0 fail**, acceptance **all 17 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-posts`, commit `382485b5f2`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
