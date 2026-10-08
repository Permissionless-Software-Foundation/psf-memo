# cli-error-surfacing — Architect Review

**By architect.**

**Task:** `cli-error-surfacing` (X2: broadcast error surfacing)
**Component:** `psf-memo-cli`
**Merged refactorer tip:** `bbb64256b9`
**Architect review commit:** `dc5a389c57` (tool-written mutation manifests)
**Verification record:** `docs/reviews/cli-error-surfacing-verification.json`
(`git_sha` `dc5a389c57`)

## Commits reviewed

The `swarmforge-refactorer` one-item `BATCH` carried the X1 completion record,
the X2 spec, the coder change, and the refactorer consolidation. The architect
branch fast-forwarded `0541746 -> bbb6425`.

| Commit | Role | Summary |
|--------|------|---------|
| `3ba8161` | specifier | Record `cli-command-reference` (X1) completion and merge |
| `f5a55df` | specifier | Specify broadcast error surfacing (X2) — 14 write/broadcast features now expect `Failed to broadcast: <error>` |
| `e3b8189` | coder | Prefix rejected Memo broadcasts with the wallet error (`memo-broadcast.js` + unit tests; acceptance `resolveTemplate` for error templates) |
| `f685051` | refactorer | Merge coder `cli-error-surfacing` into refactorer |
| `bbb6425` | refactorer | Drop the redundant `resolveUrlTemplate` alias so the step layer has one template resolver |

The architect review commit `dc5a389c57` carries only the tool-written
`mutate4javascript` and acceptance-mutation manifests; no production behavior
changed during review.

## Architectural findings and fixes applied

1. **Error-surfacing concern lives in the broadcast adapter (good).** The
   `Failed to broadcast: <wallet error>` prefix is added once in
   `src/lib/memo-broadcast.js`, the shared boundary that all 13 `memo-*` write
   commands cross. None of the command modules or the generic
   `write-command.js` pipeline needed a change, so the 13 commands cannot drift
   apart. The reporter already maps the thrown `Error` to
   `{ error: err.message }` on stderr with exit 1, so the prefixed message is
   what an agent sees.

2. **Pre-broadcast errors are deliberately left unprefixed (good).** The
   try/catch wraps only `wallet.sendOpReturn`; `wallet.initialize()` and
   `attachMultiPushOpReturn()` keep their own messages (for example a missing
   wallet file). The `{ cause: err }` preserves the original error for
   diagnostics without leaking it into stdout. Both paths are pinned by the two
   new unit tests.

3. **Acceptance template handling unified (good, refactorer).** Error
   expectations now use the same `resolveTemplate` helper as URL templates, so
   the step layer has a single `<placeholder>` resolver instead of a
   URL-specific name plus alias. No behavior change; the acceptance suite still
   passes.

4. **No fixes needed.** The change is small, cohesive, and fully specified; DRY
   found no task-local duplication. The only review churn was tool-written
   manifests (see Verification).

## Verification

**Language mutation** (`mutate4javascript`, `--max-workers 8`). The differential
run selected 2 of 6 covered sites; `mutate-file.sh` detected the
under-selection and reran with `--mutate-all`:

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/memo-broadcast.js` | 6 | 0 | 0 |

**DRY** (`dry4javascript`, scoped to the changed production file, its unit test,
and the three changed acceptance step/helper modules): **no duplicate candidates
found.**

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`,
one work dir per feature; all 14 changed features):

| Feature | Total | Killed | Survived | Errors |
|---------|------:|-------:|---------:|-------:|
| `memo-broadcast` | 22 | 9 | 13 | 0 |
| `memo-avatar` | 14 | 4 | 10 | 0 |
| `memo-bio` | 14 | 4 | 10 | 0 |
| `memo-follow` | 8 | 4 | 4 | 0 |
| `memo-like` | 36 | 10 | 26 | 0 |
| `memo-mute` | 8 | 4 | 4 | 0 |
| `memo-name` | 14 | 4 | 10 | 0 |
| `memo-post` | 14 | 5 | 9 | 0 |
| `memo-reply` | 20 | 6 | 14 | 0 |
| `memo-topic-follow` | 6 | 0 | 6 | 0 |
| `memo-topic-post` | 20 | 7 | 13 | 0 |
| `memo-topic-unfollow` | 6 | 0 | 6 | 0 |
| `memo-unfollow` | 8 | 4 | 4 | 0 |
| `memo-unmute` | 8 | 4 | 4 | 0 |
| **Total** | **198** | **65** | **133** | **0** |

Kills are the meaningful mutations: action-prefix/byte changes that the
assertions check (`6d02 -> 6D02`, `6d10 -> 6dx0`), txid mutations in the
broadcast-push scenario, and the byte/character-limit boundaries in the write
outlines. Every survivor is an intrinsic equivalent of the established gotcha
#12 class — a single-character case or off-by-one change to an example value
(`error`, `txid`, `post`, `parent`, `room`, `text`, `name`, `url`, `message`,
`length`, `tip`, `balance`, `option_count`, `poll_type`) that is used
consistently on both the setup and assertion sides, so the scenario cannot
distinguish it. In particular the `error` values survive because the setup
wallet rejection and the expected `Failed to broadcast: <error>` use the same
example text. No implementation gap; no survivors were chased, consistent with
prior reviews.

The tools wrote an empty `scenarios:[]` manifest to each feature (intrinsic
survivors only) and refreshed the `memo-broadcast.js` `mutate4javascript`
manifest; those tool-written changes are committed as-is.

**Suite status** (`verify.sh cli`, record `dc5a389c57`): unit **570 passing**
(two new broadcast tests), property **110 pass / 0 fail**, acceptance **all 35
suites passed**, lint **ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-error-surfacing`, commit `dc5a389c57`
  (end-of-chain merge notification; no coder or refactorer follow-up work was
  required).
