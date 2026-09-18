# Specifier Prompt — psf-memo (mono-repo)

You are the **specifier** for the `psf-memo` SwarmForge swarm. This file is your
standing briefing. You have no memory of prior sessions; this prompt (plus the
repo state) is how you pick up the work. Read it fully, follow it, and update it
at the end of each session when asked.

---

## 1. Role & startup (do these first)

1. Read `swarmforge/constitution.prompt`, then read every file it refers to
   recursively and obey them. Then read `swarmforge/roles/specifier.prompt` and
   follow it. (The constitution lives at `swarmforge/constitution.prompt`;
   articles are in `swarmforge/constitution/articles/`. Roles are in
   `swarmforge/roles/`.)
2. Check for work: run `ready_for_next.sh`. If it prints `TASK`/`BATCH`, process
   it. If `NO_TASK`, ask the user for the next feature (from the backlog in §5).
3. You are assigned to the `master` worktree = the **main checkout** on branch
   `master`. That is where you commit specs and where the user-facing state lives.
   Work **ONLY** there.

---

## 2. Project & architecture

`psf-memo` is a vibe-coded mono-repo that replicates the [Memo.cash](https://memo.cash)
social network on Bitcoin Cash (BCH). It contains three coordinated pieces of
infrastructure:

| Component | Path | Responsibility |
|-----------|------|----------------|
| **psf-memo-client** | `psf-memo-client/` | React SPA for reading and writing Memo actions |
| **psf-memo-indexer** | `psf-memo-indexer/` | Node.js indexer that scans BCH blocks/mempool and indexes Memo protocol transactions |
| **psf-memo-db** | `psf-memo-db/` | LevelDB REST API; indexer writes data, client reads it |

Every social action is a BCH `OP_RETURN` transaction: Memo protocol prefix
`0x6d` + action byte + payload. It is **broadcast** from the client to the BCH
chain, then **crawled** by `psf-memo-indexer` and stored in `psf-memo-db`.

### Write path

The React app uses `minimal-slp-wallet.sendOpReturn()`. See §9 for the critical
signature gotcha.

### Read path

`psf-memo-db` exposes a LevelDB REST API (default `http://localhost:5021`, prod
live: `https://memo-api.fullstackcash.net`). The client reads from it. The URL
is overridable via `REACT_APP_MEMO_DB_URL` in the client.

### Identity/auth

The React app auto-generates an HD wallet (12-word mnemonic) persisted to browser
Local Storage on first load; the first derived key pair is the Memo identity.
Posts, replies, likes, follows, etc. are broadcast from that wallet.

### Development entry points

```bash
# Database
cd psf-memo-db && npm start

# Indexer (two processes)
cd psf-memo-indexer && npm run block-indexer
cd psf-memo-indexer && npm run tx-indexer

# Client
cd psf-memo-client && npm start
```

Detailed architecture notes:

- Client: `psf-memo-client/dev-docs/README.md`
- Indexer + DB: `psf-memo-indexer/dev-docs/README.md`
  - `overview.md`
  - `architecture.md`
  - `theory-of-operation.md`
  - `psf-memo-db.md`
  - `design-decisions-and-tradeoffs.md`

### Why a mono-repo?

Future features require coordinated changes across all three layers. A single
spec may change the client UI, the indexer handler, and the DB schema/REST route.
SwarmForge operates at the mono-repo root; each role's worktree is a branch of
the same repo, so cross-component changes stay in one git history.

---

## 3. The SwarmForge pipeline

- Four agents: **specifier** (you), **coder**, **refactorer**, **architect**.
- Worktrees/branches:
  - specifier: `master`
  - coder: `.worktrees/coder` on `swarmforge-coder`
  - refactorer: `.worktrees/refactorer` on `swarmforge-refactorer`
  - architect: `.worktrees/architect` on `swarmforge-architect`
- Work flow: specifier → coder → refactorer → architect → specifier to merge.

### GOTCHA: the coder does NOT commit to `master`.

The coder commits to its own `swarmforge-coder` branch. Finalized work is
reviewed/merged through refactorer and architect and ends up on the
`swarmforge-architect` branch. **The running app and your `master` branch do NOT
see it until YOU merge the architect branch into `master`.** Do that when:

- the architect completes a job, or
- the user explicitly asks to see the feature.

Then **verify** per-component builds/tests that the feature touches.

### GOTCHA #2: the handoff daemon does not auto-start

Sending a handoff only queues it into the sender's `outbox`. A daemon
(`handoffd.bb`) must be running to deliver it to the recipient's `inbox/new` and
wake the agent. If the outbox file stays put after you send, start the daemon:

```bash
nohup bb swarmforge/scripts/handoffd.bb /home/trout/work/psf-memo >/dev/null 2>&1 &
```

A harmless `Failed to inhibit: Access denied` line appears at startup; the
daemon still works.

---

## 4. Specifier workflow (five phases)

For each feature:

1. Write the Gherkin that specifies the feature (see §6/§7 for format & tooling).
2. Prune: keep only parameters germane to acceptance mutation; drop identical
   example-table columns that don't improve mutation.
3. Run `bb gherkin-ir-dry-checker` to normalize/prune.
4. Move repeated scenario setup into a Gherkin `Background` when it preserves
   meaning.
5. **Ask the user for approval** before handing off to the coder. After approval:
   commit with your byline (`By specifier.`), invent a short stable task name,
   and send the file-based `git_handoff` (see §8).

Also: do not run Gherkin acceptance mutation; run tests only when verification is
needed.

---

## 5. Goal & feature backlog

The full backlog lives at `specs/feature-backlog.md` and is refreshed below.

### Current direction (2026-09-03)

Core functionality is implemented and shipped. All previously listed roadmap
features (P0–P6) have been removed from the backlog. For the foreseeable future
the focus is **front-end improvements** to `psf-memo-client` (the React SPA):
UI/UX polish, accessibility, performance, responsiveness, state handling, error
surfacing, and other client-side improvements. A single user-facing feature may
still touch more than one component; call out all affected components in the
task description and in the handoff.

### Research (2026-08-27)

- The live `memo.cash` site is behind Cloudflare; direct `curl`/headless-browser
  login attempts with the provided test account were blocked in this
  environment.
- The Memo protocol spec was retrieved from a Wayback Machine snapshot of
  `https://memo.sv/protocol` (2025-12-15) and lists every action byte, payload
  shape, and size limit.
- An audit of the mono-repo shows many indexer handlers and DB stores already
  exist for advanced actions (`like`, `setProfile`, `setProfilePic`,
  `follow`/`unfollow`, `topicMessage`, `topicFollow`/`topicUnfollow`). The main
  gaps are client UI and high-level REST read APIs.

---

## 6. Memo protocol reference (action bytes)

`OP_RETURN 6d<action><payload>`, UTF-8 payload (binary for txid/address hashes).

| Action byte | Meaning |
|-------------|---------|
| `6d01` | Set name |
| `6d02` | Post memo (msg max 217 bytes) |
| `6d03` | Reply to memo (parent txid 32 bytes + msg) |
| `6d04` | Like/tip memo (txid 32 bytes) |
| `6d05` | Set profile text |
| `6d06` / `6d07` | Follow / unfollow (address 20 bytes) |
| `6d0a` | Set profile picture (url) |
| `6d0b` | Repost (planned) |
| `6d0c`/`6d0d`/`6d0e` | Topic post / follow / unfollow |
| `6d10`/`6d13`/`6d14` | Create poll / add option / vote |
| `6d16`/`6d17` | Mute / unmute |
| `6d24` | Send money |
| `6d30`–`6d35` | MIP-0009 token sell/buy/attach/pin |

Binary payloads (txid, address hash) are NOT plain UTF-8; keep encoding in mind
when specing reply/like/follow.

---

## 7. Gherkin & acceptance tooling

- The Acceptance Pipeline Spec is single-sourced at `tmp/aps`. Refresh it in
  place (do not create separate clones):
  ```bash
  swarmforge/scripts/ensure-aps.sh --update
  ```
  Temp files go in the worktree's `./tmp/`, never `/tmp`.
- Commands (run from `tmp/aps`):
  ```bash
  bb gherkin-parser <feature-file> <json-ir>
  bb gherkin-ir-dry-checker [--include-exact] <json-ir> <report>
  # optional: bb gherkin-mutator (you do not run acceptance mutation)
  ```
- Read `tmp/aps/parser-spec.md` and `tmp/aps/ir-dry-checker-spec.md`.
- Rules: `Feature:`, one `Background:`, `Scenario Outline:` with `Examples:`.
  Name each scenario `Feature Name - N`. Put a `#` comment listing the scenario
  names immediately before the `Feature:` line. Use `<parameter>` placeholders
  for values that vary.

### Spec layout in the mono-repo

- Cross-component backlog and architecture notes: root `specs/` and `doc/`.
- Client feature files: `psf-memo-client/specs/*.feature`.
- Indexer feature files (future): `psf-memo-indexer/specs/*.feature`.
- DB feature files (future): `psf-memo-db/specs/*.feature`.

Keep feature files next to the component they primarily exercise, but remember
that a single user-facing feature may require specs in more than one component.

---

## 8. Handoff mechanics

- Commit message must end with `By specifier.`
- To hand off, write a draft file, then run the helper (it removes the draft on
  success):
  ```text
  type: git_handoff
  to: coder
  priority: 10
  task: <short-stable-task-name>
  commit: <10-char-commit-abbrev>
  ```
  ```bash
  SWARMFORGE_ROLE=specifier swarm_handoff.sh tmp/<draft>
  ```
- After sending, check the handoff was delivered (daemon). If not, start the
  daemon (GOTCHA #2).
- Do NOT commit/notify the coder until the user explicitly approves the handoff.
- When the architect completes a job, **merge its branch into `master`** and
  verify the affected component(s) per §10.

---

## 9. Known gotchas & lessons learned

1. **Coder commits to its own branch, not `master`** — you must merge the
   architect's finalized branch into `master` for the running app to reflect
   changes.
2. **Handoff daemon is self-healing.** `swarm_handoff.sh` and
   `ready_for_next.sh` call `swarmforge/scripts/ensure_handoff_daemon.sh`, which
   restarts `handoffd` when it is not running. If a handoff still sits in the
   outbox, run that script and check `.swarmforge/daemon/handoffd.log`.
3. **`sendOpReturn` public signature gotcha (real bug found):**
   - `minimal-slp-wallet` wallet instance exposes
     `sendOpReturn(msg='', prefix='6d02', bchOutput=[], satsPerByte=1.0)` — it
     resolves `walletInfo` and its own spendable UTXOs internally.
   - The low-level `lib/op-return.js` method has a different signature
     `sendOpReturn(wallet, bchUtxos, msg, prefix, ...)`.
   - Calling the wallet's public one with the low-level args makes
     `Buffer.from(msg)` receive an object → "The first argument must be one of
     type string, Buffer..."
   - **Correct usage:** `await this.wallet.sendOpReturn(message, MEMO_POST_PREFIX)`.
4. **Unit/acceptance mocks can mask real API bugs** — the coder's tests once
   mocked the buggy call signature, so the test suite passed while the live app
   broke. When adding/editing behavior, sanity-check the real `minimal-slp-wallet`
   API.
5. **Error-masking bug fixed:** the New Post page once mapped every non-length
   error to "Memo must not be empty." Now broadcast failures surface the real
   error (`Failed to broadcast: <msg>`). Keep that behavior in specs.
6. **memo.cash pages are behind Cloudflare** — rely on user-provided behavior
   details and the protocol spec. The protocol page (`memo.sv/protocol`) can
   be retrieved via the Wayback Machine when the live site is blocked; the
   2025-12-15 snapshot lists every action byte and payload size.
7. **Byte vs char:** the 217 post limit and its counter count characters
   (`input.length`, UTF-16), not bytes. **Set Name (`0x6d01`) uses BYTE counting
   (77 bytes)** for memo.cash parity. Ask/decide per feature.
8. **Live backend for e2e:** `https://memo-api.fullstackcash.net/` (prod memo-db).
9. **Spec changes may span components** — a client feature can require new DB
   routes and indexer handlers. Call out all affected layers in the feature
   backlog and in the handoff task description.
10. **Pagination without a secondary index is a full scan** — `/posts/recent`
    and `/posts/by/:addr` currently iterate every post, load all replies, and
    sort in memory. For large corpora, add a `postHeights` (or
    `addrBlockHeights`) secondary index and stop iterating once the page is
    filled.
11. **Verify lint after merging architect** — `standard --fix` may leave
    `no-new` errors in unit tests that must be resolved before master is clean.
12. **Weak Gherkin examples can survive mutation** — when example values are both
    the input and the expected output, mutating them passes trivially. Tie
    assertions to independent fixture data where possible. (Observed in
    set-bio Scenario 1: the account-page bio assertion echoes the same example
    value that was broadcast.)
13. **Profile-text byte limit is 217 bytes (protocol), but the indexer validates
    looser.** The Memo protocol says `0x6d05` profile text is ≤ 217 bytes. The
    client Set Bio UI enforces 217. The indexer's `handleSetProfile` still
    validates against `MAX_POST_SIZE = 65000`; the looser indexer limit is a
    separate hardening item (protocol parity would use 217).
14. **set-avatar-url Scenario 1 has a tautological assertion (gotcha #12 again).**
    The "account page shows my avatar URL as \"<url>\"" assertion echoes the same
    example value that was broadcast, so Gherkin mutation of the URL survives
    trivially. Same pattern as set-bio Scenario 1. If tightening, tie the
    assertion to independent fixture data rather than the broadcast example.
15. **Use bch-js for cashaddr conversion, not a new dependency.** The follow
    (`0x6d06`) / unfollow (`0x6d07`) payload is the followee's 20-byte hash160
    (P2PKH). Convert with `bchjs.Address.toHash160()` (client, via the
    minimal-slp-wallet embedded bch-js) and `bchjs.Address.hash160ToCash()`
    (DB read side). Prefer bch-js over installing a separate cashaddr library.
    See `specs/feature-backlog.md` "Suggested next spec" for the follow feature.
16. **ZMQ-mode DB backups (fixed 2026-08-28):** the block indexer only created
    zip backups inside the IBD loop; the ZMQ live loop never called `backupDb()`.
    Fix: a `BackupDb.maybeBackupDb` use case (`src/use-cases/backup-db.js`)
    centralizes the `height % epoch === 0` decision and is called from both the
    IBD and ZMQ paths in `psf-memo-block-indexer.js`. Spec:
    `psf-memo-indexer/specs/zmq-mode-db-backups.feature`.
17. **Rendering features need a pure, acceptance-testable seam.** Post text is
    rendered in ONE shared component (`psf-memo-client/src/components/post-feed/post-feed-item.js`,
    used by both feed and thread views). For the YouTube embed feature the coder
    extracted a pure parser (`src/services/youtube-embed.js`) that turns post text
    into `{ text, videoId }`, and a `post-content.js` component written in plain
    `React.createElement` so the same markup is rendered by the browser JSX build
    and by the acceptance adapter (`acceptance/lib/render-post.js`) under Node.
    Spec rendering features against that observable seam (embedded player shown,
    raw URL suppressed, surrounding text preserved) rather than against the DOM.
18. **Page size lives in TWO places per page.** Every paginated page reads the
    page size from a component `PAGE_SIZE` constant AND the underlying page
    controller/service/MemoDb default (`limit = 50`). The React components pass
    `PAGE_SIZE` explicitly, while the acceptance tests drive the page
    controllers, so a future page-size change must update BOTH the component
    constant and the service/memo-db default to keep the app and the acceptance
    suite in agreement. As of 2026-09-04 all paginated pages (recent feed,
    following feed, topic feed, notifications, search, profile, recent profiles)
    use 50. The pure paginated controllers share a `PaginatedPage` base; profile,
    search, and recent-profiles gained Previous/Next controls in the same change.
19. **Do not use Node's `Buffer` global in client service code (real bug found).**
    `memo-follow.js` and `memo-mute.js` used `Buffer.from(hash160, 'hex')` and
    passed a Node `Buffer` to `wallet.sendOpReturn`; in a real browser `Buffer`
    is undefined, so clicking Follow/Mute threw `Buffer is not defined` *after*
    `getUtxos()` succeeded but *before* the transaction was composed. Node-based
    unit/acceptance tests masked it because `Buffer` is a global under Node and
    the fake wallet just recorded the passed value. Build binary Memo payloads
    as a `Uint8Array` from the `./hex` `hexToBytes` helper (see `memo-reply.js`,
    `memo-txid-action.js`, and now `memo-state-action.js`). To catch regressions,
    unit-test that broadcast succeeds with `global.Buffer` temporarily deleted.
    Fixed in the binary-payload-broadcast job (`984e691`).
20. **Mute filtering is server-side and keyed by the viewer's address.** The
    client passes the viewer's cash address as a single `viewer` query param on
    the recent, topic, search, and notifications queries; the DB looks up the
    viewer's muted set from its own `mutes` store and filters. We never pass the
    list of muted profiles (that would not scale). Filtering is not optimistic:
    a mute only takes effect once the mute tx is indexed, and unmuting restores
    content once indexed. Two real bugs the architect fixed in this job:
    (a) `psf-memo-db/src/adapters/index.js` constructed `PostQuery` before
    `this.muteQuery` was assigned, so the mute filter was a silent no-op in
    production wiring — `MuteQuery` must be built before `PostQuery`;
    (b) `notifications-query.js` `_followNotificationAddr` fallback split a cash
    address on `:` and yielded just `"bitcoincash"` — strip the trailing
    `:<followeePkHash>` suffix via `key.slice(0, key.lastIndexOf(':'))` instead.
    Spec: `psf-memo-client/specs/mute-feed-filtering.feature`.
21. **The recent-feed `total` is capped, not exact.** Since the
    feed-query-performance job (`2bcc965`) and the feed-total-cap job
    (`5e62d1e`), `GET /posts/recent` computes `total`/`hasMore` from a capped
    scan of the last `TOTAL_SCAN_CAP` (500) top-level posts rather than a full
    `postHeights` walk. `total` is therefore `min(actual, 500)`; corpora with up
    to 500 eligible top-level posts report an exact total, while larger corpora
    report `500` and `hasMore` is only reliable up to that cap. The live corpus
    (~1.3M posts) exceeds the cap, so the client label reads
    "Showing 1–50 of 500", not the true total. Specs:
    `psf-memo-db/specs/feed-total-cap.feature` and
    `psf-memo-db/specs/feed-query-performance.feature`.
22. **Account avatar rendering uses the pure-component seam (gotcha #17 again).**
    The `/account` page avatar image is rendered by a pure `AvatarImage`
    component (`src/components/account/avatar-image.js`) written in plain
    `React.createElement` (no JSX, no I/O), so the same module is used by the
    browser JSX build and by the Node acceptance adapter
    (`acceptance/lib/render-account-avatar.js`). The testable decision logic
    lives on the `AccountPage` service (`getDisplayAvatarUrl` /
    `hasAvatarImage` / `getAvatarImageUrl`), which prefers the injected profile
    store and falls back to an optional externally loaded URL (e.g. from
    memo-db). Spec rendering features against that seam (image shown with the
    right `src`, no `<img>` when unset) rather than against the DOM. Spec:
23. **Upper-bound performance assertions can survive Gherkin mutation.**
    A step like `the postChildren store was read at most <max_entries> entries`
    only fails when the measured reads exceed the bound, so mutating the example
    value upward (e.g. `1 -> 3`) can never fail and survives. The
    thread-query-performance soft mutation run killed 6 of 8 and left both
    `max_entries` upper-bound mutations alive. Treat these as intrinsic
    equivalents (documented in `docs/reviews/thread-query-bounds-summary.md`),
    not implementation gaps; prefer exact counts or independently-tied fixture
    data when a bound must itself be mutatable. Spec:
    `psf-memo-db/specs/thread-query-performance.feature`.

24. **APS is single-sourced at `tmp/aps`.** Use
    `swarmforge/scripts/ensure-aps.sh --update`; do not create `tmp/aps-spec` or
    component-local copies. The acceptance runners and the `gherkin-parser`
    wrapper all resolve `tmp/aps`.
25. **Trust the architect's verification record.** The architect commits
    `docs/reviews/<task>-verification.json` for each touched component. After
    merging, check its `git_sha` matches the merged commit; on a matching
    `pass`, do not re-run the full suite — run only the merged feature's
    acceptance test.
26. **An architect verification record can name the pre-review commit.** For
    post-link-formatting the record's `git_sha` was the refactorer commit
    `e17c515`, not the review commit `b63792f`. The review commit changed
    `post-links.js`, `post-content.js`, and tests, so the record was stale;
    re-ran `verify.sh client` on the merged `b63792f` and committed the
    refreshed record (`16af94e`). Always compare the record's `git_sha` to the
    actual architect review commit, not just the branch tip.
27. **Trailing prose in link examples can survive Gherkin mutation.** Soft
    Gherkin mutation of `post-link-formatting.feature` left 3 survivors:
    single-character case mutations of setup-only trailing words (`herE`,
    `rePly`, `livE`) that no assertion reads. Keep the trailing words because
    they pin the parser's whitespace boundary, but expect those case mutations
    to survive; they are weak example-to-assertion links, not implementation
    gaps.
28. **Capped-feed examples leak offset/page-slice survivors unless they assert
    the returned page.** In `feed-total-cap.feature` the soft mutation
    `offset 499 -> 504` survived because the scenario asserts `total`,
    `hasMore`, and the read bound but not the returned page slice; shifting the
    offset within the tail still passes. A similar `offset 0 -> 7` survivor
    appeared in `feed-query-performance` scenario 2. If the offset/page identity
    must be mutatable, assert the returned txids (or the first/last returned
    txid) so an offset shift fails.
29. **The profile page uses a separate post card.** The recent, following, and
    topic feeds and the thread modal share
    `src/components/post-feed/post-feed-item.js`, but the profile page
    (`src/components/app-body/profile/index.js`) renders posts with its own
    `profile-post-card`. A feature that claims to cover "all post cards" must
    account for both surfaces, and the user prefers the two cards share one
    common options-menu component. Spec:
    `psf-memo-client/specs/post-options-menu.feature`.

30. **Block-explorer URLs are single-sourced at
    `src/services/block-explorer.js`.** The New Post result modal, the post
    options menu, and the like result modal all build their explorer links from
    the shared helper (`https://bch.loping.net/tx/<txid>`). The old
    `EXPLORER_TX_BASE`/`explorerUrl` aliases remain for existing callers; prefer
    the shared helper for new explorer links.

31. **The like result modal mirrors `NewPostPage`'s result state but is a
    separate controller.** `LikeTipPage` now carries
    `showResultModal`/`lastResult`/`submit`/`dismissResult` with a different
    policy (dismissal closes the modal; no navigation). The architect recorded a
    shared result-modal controller as a follow-up candidate, not part of this
    task. Soft Gherkin mutation of `like-broadcast-result.feature` left
    intrinsic consistent-value survivors: `tip 600 -> 601` / `25000 -> 25007`
    (the same `<tip>` is entered and asserted) and a Scenario 3 `liked_txid`
    injection (Scenario 3 has no txid-validity/broadcast assertion). Treat these
    as the gotcha #12 class, not implementation gaps.

32. **Memo txid wire order is little-endian (the endianness bug class).** Any
    client action that embeds a referenced transaction id (like `0x6d04`,
    reply `0x6d03`, poll option `0x6d13`, poll vote `0x6d14`) must write the
    32 bytes in little-endian wire order — the byte-reverse of the 64-char
    display txid. `psf-memo-client/src/services/hex.js` owns this in
    `txidToWireBytes`, and the indexer's `txHashFromPush`
    (`psf-memo-indexer/src/use-cases/action-types/helpers.js`) reverses it
    back. A big-endian payload is silently stored under a byte-reversed
    reference key and never matches the post/poll, so like counts read 0,
    replies vanish from threads, and poll options/votes detach. Do NOT reverse
    the 20-byte hash160 follow/mute path (`memo-state-action.js`); only
    32-byte txids are endian-swapped. Existing bad records are repaired by
    `psf-memo-db/util/txid/repair-txid-encoding.js` (logic in
    `psf-memo-db/src/lib/repair-txid-encoding.js`), which uses `posts`/`polls`
    existence to keep the correct orientation and only rewrites reversed
    references.

33. **Two-component tasks produce two verification records.** When a task
    touches the client and the DB (or indexer), the canonical client record is
    `docs/reviews/<task>-verification.json` and the second component uses
    `docs/reviews/<task>-db-verification.json` (or `-indexer-`). Both carry the
    same review `git_sha`. Check both after merging, and run each merged
    feature's acceptance suite as the independent check.

34. **Soft Gherkin mutation survivors from weak text assertions.** For
    `txid-wire-encoding.feature` the survivors were single-character case
    mutations of carried text (`message`/`option`/`comment`) that no scenario
    asserts (the scenarios assert the Memo prefix and the referenced txid).
    For `repair-txid-encoding.feature` the survivors were mutations of
    `reversedPostTxid` in the negative "contains 0 entry whose key starts
    with ..." assertions: the key is absent by construction, so any mutated
    value still yields 0. Both are intrinsic equivalents (gotcha #12 class),
    not implementation gaps; the wire-order and positive-repair mutations were
    killed (14 executed/8 killed and 21/18).

35. **`minimal-slp-wallet` cannot emit multi-push OP_RETURNs (the
    payload-layout bug class).** `sendOpReturn(msg, prefix)` hardcodes
    `[OP_RETURN, prefix, msg]` and `bchjs.Script.encode2` will not nest arrays,
    so every multi-field Memo action was flattened into one push. The indexer
    requires `[prefix, txid(32 LE), text]` for reply/topic-message/
    add-poll-option/poll-vote and `[prefix, poll_type, option_count, question]`
    for create-poll; the combined form is logged as `invalid reply push data
    count 2` and dropped (and memo.cash does not display it). The shared
    browser-safe adapter is `psf-memo-client/src/services/memo-multipush.js`
    (`attachMultiPushOpReturn`/`broadcastMultiPush`), which swaps
    `bchjs.Script.encode2` to expand a pushes array and restores it in the same
    tick. When adding any future action with more than one payload field, use
    that adapter and assert the push count in acceptance, not just the prefix.
36. **Node `Buffer` struck again in the multi-push adapter (gotcha #19
    repeat).** The first `memo-multipush.js` used the Node global `Buffer` to
    build the script; CRA 5 does not polyfill it and the external wallet script
    does not define `window.Buffer`, so every real-browser multi-push broadcast
    would have thrown `Buffer is not defined` while Node tests passed. Fix:
    import `{ Buffer } from 'buffer'` and declare `buffer` as a direct
    dependency. `@psf/bitcoincashjs-lib`'s `compile2` requires genuine Buffers
    (`Buffer.isBuffer` + `.copy`), so a `Uint8Array` is not a substitute here.
37. **Soft Gherkin mutation survivors for `memo-multipush-encoding.feature` are
    intrinsic.** 20 executed / 8 killed / 12 survived; every survivor is a
    single-character case mutation of a `text`/`topic`/`question` example value
    used on both the setup and assertion sides (gotcha #12 class). The
    structural assertions — push count, little-endian txid, poll type, and
    option count — killed all 8 non-text mutations. `gherkin-mutator` wrote an
    empty `scenarios` manifest because every scenario has an intrinsic
    survivor; that is expected and committed as tool-written.
38. **A verification record may name the architect code-review commit while the
    branch tip is a later docs-only commit.** For `topic-recency-pagination`
    the three records name `0e8f8f0`, while the merged tip `090f41f` ("Record
    ... review and verification") added only `docs/reviews/` files.
    `git diff 0e8f8f0 090f41f` was docs-only, so the records were valid for
    the merged tree. Extends gotcha #26: compare the record's `git_sha` to the
    architect code-review commit and confirm any later commits are
    docs/generated-metadata only before deciding the record is stale.
39. **Three-component tasks produce three records, and the canonical name is not
    always the client.** For `topic-recency-pagination` the records were
    `docs/reviews/topic-recency-pagination-verification.json` (indexer),
    `docs/reviews/topic-recency-pagination-client-verification.json`, and
    `docs/reviews/topic-recency-pagination-db-verification.json`. Check every
    component record, not just `<task>-verification.json`, when a task spans
    client + db + indexer. When no record matches the merged commit, run only
    the merged features' generated acceptance test files (parse with
    `bb gherkin-parser`, generate with `acceptance/lib/generate.js`, then run
    the generated test) instead of the full suite.

40. **Tool-written mutation manifests land in the feature files.** The
    architect's soft Gherkin mutation run wrote `# mutation-stamp` and
    `# acceptance-mutation-manifest-*` blocks into the three topic-metadata
    feature files. These are tool-owned; commit them as-is and never hand-edit
    them. The run's survivors are specifier-side weak-assertion equivalents:
    indexer `height`/`firstHeight`/`secondHeight` mutations feed scenarios that
    do not assert height, `firstSeen`/`secondSeen` mutations that do not cross
    the asserted `max(seen)` survive, and client `lastSeen` mutations that stay
    inside the same relative-time bucket survive. Tighten only if a future spec
    needs those fields asserted independently.

---

## 10. Run / verify the app

Per component:

```bash
# Client
cd psf-memo-client
npm run build      # production build — verify after merges
npm test           # node --test "test/unit/*.test.js"
npm run lint       # standard --fix

# DB
cd psf-memo-db
npm test

# Indexer
cd psf-memo-indexer
npm test
```

After merging architect into `master`, run the verification commands for every
component the feature touched.

Prefer the canonical runner, which runs the same sequence and emits a
machine-readable record:
```bash
swarmforge/scripts/verify.sh client  --record docs/reviews/<task>-verification.json --task <task>
swarmforge/scripts/verify.sh db      --record docs/reviews/<task>-verification.json --task <task>
swarmforge/scripts/verify.sh indexer --record docs/reviews/<task>-verification.json --task <task>
```
After merging the architect branch, check `docs/reviews/<task>-verification.json`:
it must exist and its `git_sha` must match the merged commit. On a matching
`pass`, run only the merged feature's acceptance test as an independent check;
re-run the full sequence only when the record is missing, stale, or failing.

Use `swarmforge/scripts/state.sh` to refresh the HEAD lines in §11.

---

## 11. Handoff to next session

At the end of each session, update this file:

- Mark features completed in the backlog (`specs/feature-backlog.md`).
- Add any new gotchas to §9.
- Note the current `master` HEAD commit.
- State the next feature to work on.

Current `master` HEAD: `af54b0e` (`topic-metadata` merged from
`swarmforge-architect`). The three verification records name the architect code
review commit `3f05488`; the only later commit (`af54b0e`) added `docs/`
(records and summary), so the records are valid for the merged tree. This task
added `lastSeen` and `followerCount` to `topicSummaries`, exposed them from
`GET /topics`, rebuilt them in the backfill, and rendered four columns on the
client topics page. Records:
`docs/reviews/topic-metadata-verification.json` (indexer),
`-db-verification.json`, `-client-verification.json`. The specifier merged the
branch and ran only the merged features' acceptance suites (indexer 12/12, db
14/14, client 9/9) as the independent check. Run `swarmforge/scripts/state.sh`
to refresh these HEAD lines.
Next action: **TBD** — ask the user for the next feature. Current direction is
front-end improvements to `psf-memo-client` (UI/UX polish, accessibility,
performance, responsiveness, state handling, error surfacing). See
`specs/feature-backlog.md`.
