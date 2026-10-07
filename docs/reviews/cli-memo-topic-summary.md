# cli-memo-topic — Architect Review

**Task:** `cli-memo-topic` (R8: a single topic's posts)
**Component:** `psf-memo-cli`
**Architect review commit:** `405ab072ef`
**Verification record:** `docs/reviews/cli-memo-topic-verification.json`
(`git_sha` `405ab072ef`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `b5901a0` | specifier | Specify the memo-topic read command (`specs/memo-topic.feature`, 7 scenarios) |
| `d3dd070` | coder | Implement the command (`memo-topic.js` lib + command, `MemoDb.getTopicPosts`, acceptance steps, unit + property tests) |
| `de4d169` | refactorer | Route `MemoTopic.run` through the shared `runPostsPageCommand` pipeline |

The architect branch fast-forwarded `5559269 -> de4d169`, then added review
commit `405ab072ef` (default-page DB test consolidation and tool-written
manifests).

## Architectural findings and fixes applied

1. **Shared post-page read pipeline reused (good).** `MemoTopic.run` now uses
   `runPostsPageCommand` from `post-page-command.js`, so the feed, address-posts,
   topics-list, and topic-posts commands all share the validate -> read ->
   `{ posts, pagination }` -> post-page summary pipeline. Adding the fourth caller
   is exactly the payoff the earlier extraction was meant to enable; no new
   scaffolding was needed.

2. **Thin command + pure helper (good).** The pure `memo-topic.js` owns the
   required `-r` room, the optional `--viewer`, and the page defaults; the command
   is a constructor plus `run`/`validateFlags`/`createClient`/`readTopicPosts`, and
   the route stays in `MemoDb.getTopicPosts`.

3. **DB method (good).** `MemoDb.getTopicPosts(room, { limit, offset, viewer })`
   URL-encodes the room and omits `viewer` when absent, keeping the route shape in
   the adapter.

4. **DRY fix applied.** `dry4javascript` flagged a score-0.84 duplicate between the
   `getTopics` and `getTopicPosts` default-page tests. Routing those through the
   shared `recordingClient` helper surfaced a score-1.00 duplicate between the
   `getTopics` and `getRecentPosts` default-page tests (the same three-line
   "defaults the page to 50/0" shape). Consolidated the two plain default-page
   tests into one table-driven `default page` describe. Re-run: no duplicate
   candidates.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` for the new/changed modules). No survivors; a follow-up
`--scan` confirmed `Changed mutation sites: 0` and `Manifest exists: true` for
all three.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-topic.js` | 2 | 0 | 0 |
| `src/commands/memo-topic.js` | 0 | 0 | 0 |
| `src/lib/memo-db.js` | 7 | 0 | 0 |

The mutation suite runs `npm test` (unit only), so the property tests do not
contribute kills. The source diffs in the review commit are the tool-written
refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production modules, shared
acceptance/step modules, and the new unit/property tests): initially flagged the
two default-page pairs; after consolidation the re-run reports **no duplicate
candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-topic.feature`): **26 mutations, 24 killed, 2 survived, 0
errors**. The 24 kills are the page `limit`/`offset`/`txids`/`hasMore` mutations
and the per-post text/reply/like mutations. The 2 survivors are intrinsic
equivalents: case mutations of the `scenario[4]` viewer address, which is used
consistently on both the request and the reported query-parameter assertion. The
tool wrote a manifest recording `scenario[2]` and `scenario[3]` (all mutations
killed); the viewer scenario is intentionally re-mutated next run.

**Suite status** (`verify.sh cli`, record `405ab072ef`): unit **370 passing**,
property **68 pass / 0 fail**, acceptance **all 19 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-topic`, commit `405ab072ef`
  (end-of-chain merge notification; no coder/refactorer follow-up work was
  required).
