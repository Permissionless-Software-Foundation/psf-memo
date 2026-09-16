# like-result-modal — Architect Review

Task: `like-result-modal`
Component: `psf-memo-client`
Base: `3486da3` (last merged architect review); inbound refactorer commit `e978516`

## What was reviewed

Inbound refactorer batch (priority 50), merged onto `swarmforge-architect` by
fast-forwarding `3486da3` -> `e978516`. The linear chain reviewed:

- **`efe7a6c`** — specifier: *Record post-options-menu completion in backlog and briefing*.
- **`3af0d42`** — specifier: *Add like broadcast result specification*. Adds
  `psf-memo-client/specs/like-broadcast-result.feature` (3 scenario outlines).
- **`a0040f9`** — coder: *Implement like broadcast result modal*. Keeps the
  like/tip modal open after a successful like and shows the success message, the
  like txid, and a block-explorer link. Adds the pure `LikeTipPage` result state,
  the presentational `like-result.js`, the acceptance render adapter, step
  handlers, and unit tests.
- **`e978516`** — refactorer: *Refactor like result modal and share the block
  explorer link*. Extracts `src/services/block-explorer.js` as the single source
  of the `bch.loping.net/tx` URL shared by the New Post result modal, the post
  options menu, and the like/tip result; DRYs the new acceptance steps behind
  `renderLikeBroadcastResult`; adds property tests.

**Architect review commit: `e071881ea0`** — the `mutate4javascript` footer
manifests, the soft `gherkin-mutator` acceptance-mutation manifest stamp, and the
hardening changes below. The summary and verification record are committed on
top, so `git diff e071881ea0 HEAD` touches only `docs/`. The record's `git_sha`
is `e071881ea0`, the commit that contains the verified source state.

## Architectural findings and fixes applied

The refactorer's structure is sound: a framework-free controller, a
server-renderable presentational component, a pure shared URL module, and a
separate acceptance render adapter. The hardening work was mutation- and
duplication-driven.

1. **UI/Core separation.** `src/services/block-explorer.js` is a pure leaf
   (`if (!txid) return ''` + a template literal) with no React, DOM, or IO.
   `LikeTipPage` owns the broadcast-result state machine and is exercised with no
   browser; `LikeResult` only maps props to markup and is reached by the
   acceptance adapter through `acceptance/lib/render-like-result.js`, which
   server-renders the actual component.
2. **Dependency rule.** `new-post.js`, `post-options.js`, and `like-tip-page.js`
   depend inward on `block-explorer.js`; nothing in the pure modules reaches out
   to React, the router, or the wallet. No framework or persistence structure
   leaks across the boundary.
3. **Information hiding / DRY.** The block-explorer base URL and link shape now
   have exactly one definition. The old `EXPLORER_TX_BASE` literals in
   `new-post.js`, `post-options.js`, and `like-tip-page.js` are gone; the
   `EXPLORER_TX_BASE`/`explorerUrl`/`explorerTxUrl` names remain as thin aliases
   for existing acceptance/test callers.
4. **Mutation survivors (like-tip-page).** Initial run: **13 killed, 8 survived,
   0 uncovered** across 21 sites. Every survivor was a missing assertion, not a
   design fault:
   - the `false` initial `tipping`/`modalOpen`, and the `deps.postTxid`/
     `deps.authorAddress` constructor seeds, were never asserted;
   - `open`'s `<` dust comparison had no boundary case (balance exactly at 3000);
   - the `open` success result's `true` was unchecked;
   - `_parseTip`'s second `||` (null/undefined) was uncovered;
   - `_handleSubmitFailure`'s `err.message || String(err)` survived because a
     *broadcast* failure is re-derived by the superclass, so the value is only
     observable on a *validation* failure.
   Added unit coverage for each; re-run: **21 killed, 0 survived, 0 uncovered**.
5. **Mutation survivor (new-post).** The `NewPostPage` constructor's
   `this.showResultModal = false` (line 32) was a pre-existing survivor. Added an
   initial-state assertion; re-run: **10 killed, 0 survived, 0 uncovered**.
6. **Test duplication.** The first DRY pass flagged two structurally identical
   test pairs in `like-tip-page.test.js`. Extracted a `submitLike()` helper and a
   `balance` option on `makePage()`; the remaining pair (dismiss vs. reopen) is
   semantically distinct and is left as structural test boilerplate.
7. **Result-modal controller duplication (documented, not changed).**
   `LikeTipPage` mirrors the `showResultModal`/`lastResult`/`submit`/
   `dismissResult` shape of `NewPostPage`, with a different show/dismiss policy.
   A shared result-modal controller would touch both controllers, their unit
   tests, and acceptance handlers; per `docs/architect-process-notes.md` that is
   a broad cross-module refactor beyond a single review, so it is recorded as a
   follow-up candidate rather than folded into this task. Likewise, the React
   `like-tip-modal.js` keeps its own transient `showResult`/`resultTxid` state;
   it is the environmentally unsuitable shell that node unit and acceptance
   mutation deliberately do not target, matching the existing component pattern.

## Verification results

### Language mutation (`mutate4javascript`, `--mutate-all`, `--max-workers 8`)

| File | Sites | Killed | Survived | Uncovered |
|------|------:|-------:|---------:|----------:|
| `src/services/like-tip-page.js` | 21 | 21 | 0 | 0 |
| `src/services/new-post.js` | 10 | 10 | 0 | 0 |
| `src/services/post-options.js` | 10 | 10 | 0 | 0 |
| `src/services/block-explorer.js` | 0 | 0 | 0 | 0 |
| `src/components/post-feed/like-result.js` | 0 | 0 | 0 | 0 |

`block-explorer.js` and `like-result.js` contain only `!`, a ternary, and a
template literal — constructs `mutate4javascript` does not target — so `--scan`
reports 0 sites; this is structural, not a skipped run. The two JSX/ESM
components (`like-tip-modal.js`, `post-feed-item.js`) are outside the node unit
test boundary and are covered end-to-end by acceptance.

### DRY (`dry4javascript`)

Focused run over the changed source, tests, and adapters: the only task-local
duplicate left is the semantically distinct dismiss/reopen test pair noted above.
A broad run over `src test acceptance` reports 475 blocks, all pre-existing
`acceptance/lib/handlers.js` step-handler boilerplate and repeated test setup
across older suites — none involves the new production modules.

### CRAP / cyclomatic complexity (`crap4javascript`)

All changed functions at or below the 8.0 threshold with **100% coverage**, e.g.
`LikeTipPage._parseTip` (CC 5, CRAP 5.0), `LikeTipPage.open` (CC 4, CRAP 4.0),
`LikeTipPage.getBroadcastMessage` (CC 3, CRAP 3.0), `NewPostPage.submit`/
`dismissResult` (CC 3, CRAP 3.0), `blockExplorerTxUrl` (CC 2, CRAP 2.0),
`LikeResult` (CC 2, CRAP 2.0).

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

`like-broadcast-result.feature`: **7 executed, 4 killed, 3 survived, 0 errors**.
The three survivors are consistent-value intrinsic equivalents — each mutated
example value is used consistently on both the setup and assertion sides:

- `tip: 600 -> 601` and `tip: 25000 -> 25007` (Scenario 2): the tip is entered
  and then asserted against the same `<tip>` parameter.
- Scenario 3 `liked_txid` with an injected `x`: Scenario 3's purpose is the
  dismiss-closes-modal behavior; it reuses `<liked_txid>` on the setup and click
  steps but makes no txid-validity or broadcast assertion (Scenarios 1 and 2,
  which do assert the broadcast, killed the same class of mutation).

The tool stamped Scenario 0 (all mutations killed) and left Scenarios 1–2
unstamped, as designed.

### Suite status

`swarmforge/scripts/verify.sh client --record
docs/reviews/like-result-modal-verification.json --task like-result-modal`
-> **pass (5/5)**:
unit **387 pass / 0 fail**, property **75 pass / 0 fail**, acceptance **all 29
suites passed**, lint **ok**, build **ok**. Record `git_sha` = `e071881ea0`.

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `like-result-modal`) with the
  review commit so it can merge `swarmforge-architect` into `master`.
- No coder/refactorer handoff: the review is test hardening plus manifest refresh
  with no follow-up work for those roles.

By architect.
