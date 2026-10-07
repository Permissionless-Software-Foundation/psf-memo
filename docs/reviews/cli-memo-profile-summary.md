# cli-memo-profile — Architect Review

**Task:** `cli-memo-profile` (R4: composed profile read command)
**Component:** `psf-memo-cli`
**Architect review commit:** `78577b1ce6`
**Verification record:** `docs/reviews/cli-memo-profile-verification.json`
(`git_sha` `78577b1ce6`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `bcbca0d` | specifier | Specify the memo-profile read command (`specs/memo-profile.feature`, 7 scenarios) |
| `1faeaa1` | coder | Implement the command (`memo-profile.js` lib + command, `MemoDb.getPostsByAddr`/`getFollowState`, acceptance steps, unit + property tests) |
| `c17e1b4` | refactorer | Extract `resolveFollowing`/`identityField` (lower CRAP), extract `MemoDb.getAddrPage`, share identity acceptance steps, add missing-resource/no-follow unit cases |

The architect branch fast-forwarded `8446473 -> c17e1b4`, then added review
commit `78577b1ce6` (table-driven address-page tests and tool-written manifests).

## Architectural findings and fixes applied

1. **Composed read command (good).** `memo-profile` composes three `/level`
   identity resources, one page of the address's posts, and the optional viewer
   follow state with `Promise.all`, then merges them at the command boundary.
   The refactorer's `resolveFollowing` and `identityField` helpers keep
   `readComposedProfile` under the CRAP threshold and make the no-viewer and
   missing-document defaults explicit. The pure `memo-profile.js` owns the
   required `-a` flag, the page defaults, and the summary (`formatFeedMessage`
   is reused for the post page).

2. **Shared address-scoped DB page (good).** `MemoDb.getAddrPage(path, addr,
   page)` now backs `getNotifications` and `getPostsByAddr`, so the two
   paginated `/posts/:path/:addr` routes share one URL builder. This is the
   right place for the deduplication: it keeps the route shape in the adapter
   while each method keeps its own name and doc.

3. **Shared identity acceptance steps (good, with a note).** `identity-support.js`
   consolidates the serve-profile / no-profile / reported-identity steps used by
   both `memo-identity` and `memo-profile`, reading the generic `world.readJson`
   alias. The serve step matches either feature's wording via a single named-group
   alternation. The alternation is denser than two separate steps, but it is
   localized to one regex and removes real duplication; documented here as an
   accepted trade-off.

4. **DRY fix applied.** `dry4javascript` flagged a score-1.00 duplicate between
   the new `getPostsByAddr` request test and the existing `getNotifications`
   request test — both repeated the file's request-recording client boilerplate.
   Table-drove both address-scoped page tests (request and default/encode) through
   the existing `recordingClient` helper. Re-run: no duplicate candidates.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` for the new modules and the changed `memo-db` function set).
All sites killed; a follow-up `--scan` confirmed `Changed mutation sites: 0` and
`Manifest exists: true` for all three.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-profile.js` | 5 | 0 | 0 |
| `src/commands/memo-profile.js` | 5 | 0 | 0 |
| `src/lib/memo-db.js` | 5 | 0 | 0 |

The mutation suite runs `npm test` (unit only), so the property tests do not
contribute kills. The source diffs in the review commit are the tool-written
refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production, shared acceptance
step, and unit/property test modules): initially flagged the address-page test
pair; after table-driving the re-run reports **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-profile.feature`): **28 mutations, 17 killed, 11 survived, 0
errors**. The 17 kills are the page `limit`/`offset`/`txids`/`hasMore` mutations
that change the returned page and the follow-state mutations. The 11 survivors
are intrinsic equivalents:

- `scenario[1]` identity example values (8): each `<addr>`, `<name>`, `<bio>`,
  and `<url>` is used consistently on both the setup and assertion sides.
- `scenario[3]` limit `2 -> 5` (offset 4) and `5 -> 10` (offset 0) (2): both
  limits do not change the observable page because the five-post fixture is
  exhausted.
- `scenario[4]` expected `not followed -> not followEd` (1): the follow step
  maps any string other than `followed` to `false`, matching the actual
  `false`, so the expected-text mutation is unobservable.

The tool wrote an empty `"scenarios":[]` manifest because every scenario retained
at least one survivor; those scenarios are intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `78577b1ce6`): unit **328 passing**,
property **58 pass / 0 fail**, acceptance **all 16 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-profile`, commit `78577b1ce6`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
