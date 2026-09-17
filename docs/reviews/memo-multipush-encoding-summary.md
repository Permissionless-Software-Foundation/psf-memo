# memo-multipush-encoding — Architect Review

Task: `memo-multipush-encoding`
Component: `psf-memo-client`
Base: `c018a01` (last merged architect review); inbound refactorer commit `8310b6a`

## What was reviewed

Inbound refactorer batch (priority 10), merged onto `swarmforge-architect` by
fast-forwarding to `8310b6a`. The linear chain reviewed:

- **`6eddd9c`** — specifier: *Specify multi-push encoding for Memo multi-field
  actions*. Adds `psf-memo-client/specs/memo-multipush-encoding.feature` (5
  scenario outlines) requiring reply, topic message, add-poll-option, and
  poll-vote to broadcast the prefix plus fields as **3 separate OP_RETURN
  pushes**, and create-poll as **4 pushes**.
- **`2e2db86`** — coder: *Implement multi-push encoding for Memo multi-field
  actions*. Rewrites `hex.js` to return a pushes array instead of one combined
  payload, adds the `memo-multipush` wallet adapter, switches the five action
  services to pass field arrays, adds acceptance step handlers, and adds
  unit/property tests.
- **`8310b6a`** — refactorer: *Refactor multi-push helpers and add adapter
  property tests*. Shares `encodeUtf8` across `hex`/poll-create/topic-post,
  drops the redundant `Uint8Array` branch in the push normalizer, renames the
  txid-action builder parameter `buildPayload` → `buildPushes`, extracts the DB
  `repairedFixture`, and adds property tests for the adapter.

**Architect review commit: `fac01730c4`** — the browser-Buffer fix and the
regression test, the `encodeScript` test-helper extraction, the acceptance
assertion de-duplication, the `buffer` dependency, and the `mutate4javascript`
and soft `gherkin-mutator` manifests. The summary and verification record are
committed on top, so `git diff fac01730c4 HEAD` touches only `docs/`. The
record's `git_sha` is `fac01730c4`, the commit that contains the verified source
state.

## Architectural findings and fixes applied

The refactorer's structure is sound: `hex.js` and `utf8.js` are pure leaves,
the five action services are core modules with injected wallet/store adapters,
and `memo-multipush.js` confines the wallet wiring to a small adapter boundary.
Two real issues were found and fixed.

1. **Browser runtime defect — the adapter read the Node global `Buffer`.** This
   is the important finding. `memo-multipush.js` called `Buffer.from(...)`
   directly, but the CRA 5 production bundle does **not** polyfill Node globals
   and the externally loaded wallet script does not define `window.Buffer`
   (verified: the built bundle had no `Buffer` assignment and the only other
   `Buffer.from` came from axios behind a `typeof Blob` guard). Every real
   browser reply, topic message, poll option, poll vote, and create-poll would
   have thrown `Buffer is not defined` at runtime, while the Node test suite
   passed. `@psf/bitcoincashjs-lib`'s `compile2` requires genuine `Buffer`
   instances (`Buffer.isBuffer` + `.copy`), so a `Uint8Array` substitution is
   not possible. Fix: import the browser-safe implementation
   (`const { Buffer } = require('buffer')`) — the same module the bundled
   bitcoin library uses — and declare `buffer` as a direct dependency so the
   adapter does not depend on a dev-transitive package. Confirmed in the built
   bundle: the adapter now compiles to `const{Buffer:r}=n(6382)` instead of a
   free global. A regression test re-requires the module with `global.Buffer`
   removed and asserts pushes still build.
2. **Mutation survivors in `attachMultiPushOpReturn`.** The first run killed 2
   of 4 sites. The `!wallet || wallet.__multiPushAttached` logical mutation
   survived because nothing tested a falsy wallet, and `__multiPushAttached =
   true` survived because the idempotence test only counted wallet calls (which
   a harmless double-wrap does not change). Focused tests now assert a falsy
   wallet is a no-op and that a second attach leaves the wrapper function
   identity unchanged; the file re-runs 4/4.
3. **DRY — duplicated test/acceptance helpers.** The `encodeScript` Bitcoin
   script double was copied verbatim between the new unit and property tests;
   extracted to `test/support/script-encoding.js` (a test helper, outside
   `test/unit/**` and `test/property/*.test.js`). The three new acceptance
   handlers that assert a UTF-8 push (topic/text/question) were structurally
   identical; extracted `assertUtf8Push`. Scoped DRY dropped the duplicate
   blocks in the touched set from 132 to 129 and removed the new-handler
   duplicates.
4. **UI/Core separation, dependency rule, information hiding.** `memo-multipush`
   depends on nothing; `hex`/`utf8` are pure; the action services depend inward
   on those leaves; no React/DOM/router/LevelDB/wallet-global leaks. The wire
   order still has one definition (`txidToWireBytes`) and the txid+text push
   shape one definition (`buildTxidTextPushes`). The adapter hides the
   `bchjs.Script.encode2` swap behind `attachMultiPushOpReturn`, restoring it
   synchronously inside the same tick (the property tests pin the expansion and
   delegation contract).

No further boundary change was required.

## Verification results

### Language mutation (`mutate4javascript`, `--mutate-all` when the wrapper
detected differential under-selection, `--max-workers 8`)

| File | Sites | Killed | Survived | Uncovered |
|------|------:|-------:|---------:|----------:|
| `src/services/memo-multipush.js` | 4 | 4 | 0 | 0 |
| `src/services/hex.js` | 5 | 5 | 0 | 0 |
| `src/services/utf8.js` | 0 | 0 | 0 | 0 |
| `src/services/memo-reply.js` | 2 | 2 | 0 | 0 |
| `src/services/memo-topic-post.js` | 7 | 7 | 0 | 0 |
| `src/services/memo-poll-create.js` | 7 | 7 | 0 | 0 |
| `src/services/memo-poll-option.js` | 0 | 0 | 0 | 0 |
| `src/services/memo-poll-vote.js` | 0 | 0 | 0 | 0 |
| `src/services/memo-txid-action.js` | 4 | 4 | 0 | 0 |

`utf8.js`, `memo-poll-option.js`, and `memo-poll-vote.js` were confirmed with
`--scan` as structural zeros (`Total mutation sites: 0`): they contain no
arithmetic/comparison/boolean/logical/`0<->1` sites, only string/array work and
base-class delegation. `async-load.js` is the browser/wallet adapter shell and
is excluded from tools that run the test suite, consistent with the standing
precedent for adapter shells.

### DRY (`dry4javascript`, scoped to the touched production files, tests, and
adapters)

129 duplicate blocks remain in the scoped set, all pre-existing pattern
boilerplate: `acceptance/lib/handlers.js` step-handler repetition (192 of the
line references), the established per-suite `makeWallet` test double (also
present across ~28 client test files), and parallel poll/topic/reply unit-test
bodies that exercise the parallel `MemoTxidAction` subclasses on purpose. The
only two task-local duplications (`encodeScript`, the three UTF-8 push
assertions) were extracted. The production-service duplicates
(`memo-poll-option`/`memo-poll-vote` config blocks, the two 2-field
constructors) are intentional parallel-config declarations and were left as-is
to preserve their per-action clarity.

### CRAP / cyclomatic complexity (`crap4javascript`)

All changed functions at or below CRAP 5.0 with ~100% coverage:
`hexToBytes` (CC 5, 100%, 5.0), `MemoPollCreate.create` (CC 4, 4.0),
`attachMultiPushOpReturn`/`broadcastMultiPush` (CC 3, 3.0), and the rest CC ≤ 3.
`MemoReply.reply` is 90% covered but CRAP 2.0. Well below the 8.0 threshold.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

**`memo-multipush-encoding.feature`: 20 executed, 8 killed, 12 survived, 0
errors.** Every survivor is a single-character case mutation of a `text`,
`topic`, or `question` example value. Those values are used consistently on the
setup and assertion sides of their scenario (`...with the text "<text>"` /
`...is the UTF-8 text "<text>"`), so the mutant is an intrinsic equivalent: the
push bytes match whatever the example says. The point of the feature — the
separate-push shape (count), the little-endian wire txid, the poll type, and the
option count — is killed (all 8 non-text mutations, including the `option_count`
and txid mutations). No implementation change is warranted. The tool left its
manifest (empty `scenarios`, because every scenario has equivalents) in the
feature file; it is committed as tool-written.

### Suite status

Canonical record against review commit
`fac01730c4beaf5b412302f919e47871778f4d08`:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/memo-multipush-encoding-verification.json --task
  memo-multipush-encoding` -> **pass (5/5)**: unit **425 pass / 0 fail**,
  property **85 pass / 0 fail**, acceptance **all 31 suites passed**, lint
  **ok**, build **ok**.

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `memo-multipush-encoding`)
  with the review commit `fac01730c4` so it can merge `swarmforge-architect`
  into `master`.
- No coder/refactorer handoff: the review is a runtime fix, mutation hardening,
  and local DRY with no follow-up work for those roles.

By architect.
