# txid-wire-encoding — Architect Review

Task: `txid-wire-encoding`
Components: `psf-memo-client`, `psf-memo-db`
Base: `bf7edd5` (last merged architect review); inbound refactorer commit `a76fcee`

## What was reviewed

Inbound refactorer batch (priority 10), merged onto `swarmforge-architect` by
fast-forwarding to `a76fcee`. The linear chain reviewed:

- **`bb0c9ab`** — specifier: *Spec txid wire encoding and database repair*.
  Adds `psf-memo-client/specs/txid-wire-encoding.feature` (4 scenario outlines
  pinning the like, reply, poll-option, and poll-vote wire order) and
  `psf-memo-db/specs/repair-txid-encoding.feature` (6 scenario outlines for the
  byte-reversed-reference repair utility).
- **`dedb7a1`** — coder: *Fix txid wire encoding and add txid repair utility*.
  Adds `txidToWireBytes` and reverses the txid in `buildTxidTextPayload`, so
  likes, replies, poll options, and poll votes now embed the referenced txid
  little-endian; adds the `repair-txid-encoding` library (`correctReference`,
  `repairTxidEncoding`), the `util/txid` CLI wrapper, unit tests, the DB
  acceptance fixture/handlers, and decodes the wire txid in the client
  acceptance handlers.
- **`a76fcee`** — refactorer: *Refactor txid wire encoding and repair library*.
  Generalizes the four near-identical repair loops into `repairStore` plus a
  `txidIndex` key/value adapter, replaces the reply-only `buildReplyPayload`
  with the shared `buildTxidTextPayload(txid, text, label)`, and adds client
  and DB property tests (round trip, involution, idempotence, conservation,
  resolution, index rebuild).

**Architect review commit: `a2229f7dd4`** — the `mutate4javascript` footer
manifests (client `hex.js`, `memo-like.js`, `memo-reply.js`; DB
`src/lib/repair-txid-encoding.js`), the soft `gherkin-mutator`
acceptance-mutation manifests on both touched feature files, the hardening
tests below, and the extracted shared test double. The summary and verification
records are committed on top, so `git diff a2229f7dd4 HEAD` touches only
`docs/`. The records' `git_sha` is `a2229f7dd4`, the commit that contains the
verified source state.

## Architectural findings and fixes applied

The refactorer's structure is sound and required no further boundary change.
The hardening work was mutation- and duplication-driven.

1. **UI/Core separation.** `src/services/hex.js` is a pure leaf (byte decode,
   reverse, payload assembly) with no React, DOM, wallet, or IO. `memo-like.js`
   and `memo-reply.js` are core services that receive the wallet/feed/thread
   behind injected adapter doubles. `src/lib/repair-txid-encoding.js` is a pure
   async core that receives the LevelDB handles; only
   `util/txid/repair-txid-encoding.js` opens real stores. Every piece of core
   behavior is exercised without a browser, network, or database file.
2. **Dependency rule.** The client services depend inward on `hex.js`; the DB
   CLI wrapper depends inward on `src/lib`. Nothing in the pure modules reaches
   out to React, the router, LevelDB, or the file system.
3. **Information hiding.** The little-endian wire order now has exactly one
   definition (`txidToWireBytes`), and the txid+text payload shape has one
   definition (`buildTxidTextPayload`). The refactorer's `repairStore` +
   `txidIndex` hide the per-store field/key/value differences behind a small
   adapter, and `correctReference` hides the "keep / reverse / leave" decision.
   No persistence structure leaks into callers.
4. **Minor coupling, accepted.** `buildTxidTextPayload` defaults its label to
   `'Poll txid'`, a residue of its poll-only origin. It is now generic and the
   reply caller passes `'Parent txid'` explicitly; the poll callers rely on the
   default. A fully neutral default was not worth churning the poll call sites.
5. **Test boundaries.** The task-local `FakeDb`/`makeLevel` double was
   duplicated verbatim across the new unit and property tests, so it was
   extracted to `psf-memo-db/test/support/level-double.js` (a test helper, kept
   out of `test/unit/**` and `test/property/*.test.js`). The util CLI wrapper is
   an environmentally unsuitable adapter shell and is deliberately excluded
   from the tools that run tests/coverage/mutation.
6. **Mutation hardening (see below).** Six pre-existing boundary survivors in
   `memo-like.js` and one in `memo-reply.js` were killed with focused boundary
   assertions rather than design changes.

## Verification results

### Language mutation (`mutate4javascript`, `--mutate-all` where the wrapper
detected differential under-selection, `--max-workers 8`)

| File | Sites | Killed | Survived | Uncovered |
|------|------:|-------:|---------:|----------:|
| `psf-memo-client/src/services/hex.js` | 7 | 7 | 0 | 0 |
| `psf-memo-client/src/services/memo-like.js` | 34 | 34 | 0 | 0 |
| `psf-memo-client/src/services/memo-reply.js` | 2 | 2 | 0 | 0 |
| `psf-memo-db/src/lib/repair-txid-encoding.js` | 6 | 6 | 0 | 0 |

The first `memo-like.js` run left 9 survivors (`true -> false` on the
`validate`/`validateTip` return values, the `validateTip`
`tipSats > spendableSats` boundary, the `_validateTipAmount` max-tip boundary,
the `getSpendableSats` `?? 0` default, the `_requireTipAddress` `<= 0` and
`.length > 0` boundaries, the `_buildTipOutput` `tipSats > 0` boundary, and the
`_incrementPostCount` `|| 0` default). `memo-reply.js` left the
`isTooLong` `> MAX_REPLY_BYTES` boundary. Each was a missing boundary/default
assertion, not a design fault; focused unit assertions were added and the
re-runs report 34/0 and 2/0. `hex.js` and the DB repair library were clean on
the first full run.

`psf-memo-db/util/txid/repair-txid-encoding.js` is not mutated: it is the
file-system adapter shell (opens real LevelDB stores, no unit coverage by
design), and the tool that runs tests is scoped to the testable core.

### DRY (`dry4javascript`)

Scoped runs over the changed production files, tests, and adapters.

- **DB.** The verbatim `FakeDb`/`makeLevel` duplication across the two new test
  files was extracted to `test/support/level-double.js`; the scoped report
  dropped from 72 to 70 duplicate blocks. Every remaining block is pre-existing
  `acceptance/lib/handlers.js` step-handler boilerplate, except one structurally
  identical but semantically distinct pair in the unit test (like/postLikes vs
  reply/postChildren index-rebuild assertions), left as deliberate test
  boilerplate.
- **Client.** The task-local candidates are two `makeWallet` doubles
  (`test/property/poll-services.property.test.js` vs
  `test/unit/memo-reply.test.js`) and one structurally identical pair of
  like-rejection tests in `memo-like.test.js`. `makeWallet` appears in 28 client
  test files as an established per-suite fixture convention, so extracting it
  would be a broad cross-suite refactor beyond this task; both are recorded as
  documented pattern-boilerplate. The remaining blocks are pre-existing
  `acceptance/lib/handlers.js` boilerplate.

### CRAP / cyclomatic complexity (`crap4javascript`)

- **Client:** every changed function at or below CRAP 6.0 with ~100% coverage —
  `MemoLike._validateTipAmount` (CC 6, 100%, 6.0), `hexToBytes` (CC 5, 5.0),
  `MemoLike._incrementPostCount` (CC 5, 5.0), `MemoLike.getSpendableSats`
  (CC 4, 4.0), the rest CC ≤ 3. `MemoReply.reply` is 90% covered but CRAP 2.0.
- **DB:** `repairStore` (CC 5, 100%, 5.0), `correctReference` (CC 4, 4.0),
  `hasRecord` (CC 4, 4.0), `reverseTxid` (CC 3, 3.0), `repairTxidEncoding`/
  `txidIndex` (CC 1). All below the 8.0 threshold.

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`)

- **`txid-wire-encoding.feature`** (client): **14 executed, 8 killed,
  6 survived, 0 errors**. All six survivors are single-character case mutations
  of values that are never asserted: reply `message` (`hello memo`,
  `a second one`), poll `option` (`yes`, `no`), and poll-vote `comment`
  (`yes`, `I choose this`). Each scenario asserts the Memo prefix and the
  referenced txid, not the carried text, so the mutated text is an intrinsic
  equivalent / weak example-to-assertion link. The wire-order txid mutations
  (the point of the feature) were killed.
- **`repair-txid-encoding.feature`** (DB): **21 executed, 18 killed,
  3 survived, 0 errors**. All three survivors mutate the `reversedPostTxid`
  example value in scenarios 0, 1, and 5, which use it only in the negative
  assertion "the postLikes store contains 0 entry whose key starts with
  `<reversedPostTxid>`". Since the key is absent by construction, any mutated
  value still yields 0 entries — a genuine negative-assertion equivalent. All
  positive repair and index assertions killed their mutations.

These survivors are specifier-side feature-quality items (weak text
assertions), not implementation gaps; no implementation change is warranted.

### Suite status

Canonical records, both against review commit `a2229f7dd4523e6397418e2bb8ac43800940b902`:

- `swarmforge/scripts/verify.sh client --record
  docs/reviews/txid-wire-encoding-verification.json --task txid-wire-encoding`
  -> **pass (5/5)**: unit **417 pass / 0 fail**, property **80 pass / 0 fail**,
  acceptance **all 30 suites passed**, lint **ok**, build **ok**.
- `swarmforge/scripts/verify.sh db --record
  docs/reviews/txid-wire-encoding-db-verification.json --task txid-wire-encoding`
  -> **pass (4/4)**: unit **371 passing**, property **54 pass / 0 fail**,
  acceptance **all 13 suites passed**, lint **ok**.

This is the first recent task to touch two components, so the client record
uses the canonical `<task>-verification.json` name and the DB record uses
`<task>-db-verification.json`; both carry the same review `git_sha`.

## Handoffs sent

- End-of-chain `git_handoff` to the specifier (task `txid-wire-encoding`) with
  the review commit `a2229f7dd4` so it can merge `swarmforge-architect` into
  `master`.
- No coder/refactorer handoff: the review is mutation hardening plus a test-double
  extraction with no follow-up work for those roles.

By architect.
