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
social network on Bitcoin Cash (BCH). It contains four coordinated pieces of
infrastructure:

| Component | Path | Responsibility |
|-----------|------|----------------|
| **psf-memo-client** | `psf-memo-client/` | React SPA for reading and writing Memo actions |
| **psf-memo-indexer** | `psf-memo-indexer/` | Node.js indexer that scans BCH blocks/mempool and indexes Memo protocol transactions |
| **psf-memo-db** | `psf-memo-db/` | LevelDB REST API; indexer writes data, client reads it |
| **psf-memo-cli** | `psf-memo-cli/` | Command-line BCH + SLP wallet CLI (forked from `psf-bch-wallet`) |

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

41. **Notification entry display: most soft Gherkin survivors are intrinsic.**
    For `psf-memo-client/specs/notification-entry-display.feature` the soft
    mutation run was 36 total / 11 killed / 25 survived, 0 errors. Every
    survivor is a single-character case mutation of an example value (`addr`,
    `name`, `avatar`, `my_post`, `reply_text`, `follower`) used on both the
    Given setup and the Then assertion side, so the mutated value still matches
    (gotcha #12 class). The independently-tied scenarios carried all kills:
    scenario 2 compares the avatar/display-name link to an independent
    `profile_path`, and scenarios 6/8 compare the fallback name to an
    independent truncated-address literal, which pins profile-link encoding and
    address truncation. The tool-written manifest contains only scenario 2
    because the others each have an intrinsic survivor; commit it as-is.
42. **Client internal links must navigate via the router.** The architect found
    the new `NotificationEntry` rendered profile links as bare anchors; a
    bare-anchor click does a full page reload, which breaks the GitHub Pages
    deployment (no `404.html` fallback). The wrapper now passes
    `onProfileClick={navigate}` (from `useNavigate()`) and the component calls
    `event.preventDefault()`. Use `Link`/`useNavigate` for any new internal
    client navigation.
43. **Profile-path construction is duplicated across the client.**
    `notification-entry.js` exports `PROFILE_PATH_PREFIX`/`profilePath`, while
    `profile-page.js` already exports `PROFILE_PATH_PREFIX` and several
    components inline `` `/profile/${encodeURIComponent(addr)}` ``. The architect
    accepted this as-is and logged a shared `profile-path` module as a
    cross-module client-consistency follow-up (`dry4javascript` found no
    duplicate candidates in the changed set).

44. **Explorer links are rendered by a shared component.** The mute result
    modal extracted `src/components/explorer-tx-link.js` (`ExplorerTxLink`,
    plain `React.createElement`), now used by both `LikeResult` and the new
    `MuteResult`. URL construction stays in the pure
    `src/services/block-explorer.js` util. Reuse `ExplorerTxLink` for new
    result modals instead of inlining an explorer `<a>` (extends gotcha #30).
    `ExplorerTxLink`, `MuteResult`, and `LikeResult` scan as 0 language
    mutation sites (structural markup), so their behavior is pinned by unit and
    property tests instead.

45. **Mute-broadcast-result soft Gherkin survivors are all intrinsic.** The
    soft mutation run on `mute-broadcast-result.feature` was 5 total / 0 killed
    / 5 survived, 0 errors. Every survivor is a single-character case mutation
    of an example value (`addr` in scenarios 1–4, `broadcast_error` in
    scenario 4) used on both the Given setup and the Then assertion side, so
    the mutated value still matches (gotcha #12 class). `gherkin-mutator` wrote
    a manifest with `"scenarios":[]` because every scenario has an intrinsic
    survivor; commit it as tool-written. The structural assertions (mute/unmute
    prefix, hash160, success message, txid, explorer href/`target=_blank`)
    carried the language and unit/property kills.

46. **Following-feed-cap soft Gherkin survivors are intrinsic (small-fixture).**
    The soft mutation run on `following-feed-performance.feature` was 17 total /
    14 killed / 3 survived, 0 errors. All three survivors come from the minimal
    fixtures, not implementation gaps: scenario 1 example 2 `limit 50 -> 43`
    (only 11 posts remain after `offset 499`, so both limits return the same 11
    expected txids), `max_entries 510 -> 512` (the corpus is below the cap and
    the assertion is an "at most" ceiling, gotcha #23 class), and scenario 2
    `limit 10 -> 7` (the mixed fixture has only two eligible followed posts).
    `gherkin-mutator` wrote a tool-owned manifest with `"scenarios":[]` and no
    `# mutation-stamp`; commit it as-is. The capped-total, page-slice,
    reply-exclusion, and `postParents`-not-iterated mutations were killed
    (language mutation 40/40 on `src/adapters/post-query.js`).

47. **Feed tabs merge the Following feed into the posts page.** `/posts/recent`
    now hosts a pure `FeedTabsPage` service
    (`psf-memo-client/src/services/feed-tabs-page.js`) that composes
    `RecentFeedPage` and `FollowingFeedPage` behind injected `memoDb`/`wallet`;
    the React shell reads the controller's `getState()` snapshot, not internal
    fields. First load asks `GET /follow/following/:addr` (via
    `memoDb.getFollowing`) and selects Following when the viewer follows at
    least one account, else Recent; switching tabs resets to page one. The
    `/posts/following` route and navbar item are removed.
    `FollowingFeedPage.emptyBecauseNoFollows` is retained only because
    `specs/following-feed.feature` still specifies it; retiring that older
    feature (and the now-redundant field) is a specifier cleanup. Soft Gherkin
    mutation of `feed-tabs.feature` was 42 total / 0 killed / 42 survived — every
    survivor is a single-character case/character substitution of an example
    value used on both the setup and assertion sides (gotcha #12 class);
    language mutation on `feed-tabs-page.js` was 22/22 killed. Spec:
    `psf-memo-client/specs/feed-tabs.feature`.

48. **DB-join features produce two verification records named at the
    code-review commit.** For `recent-profile-identity` the client record is
    `docs/reviews/recent-profile-identity-verification.json` and the DB record
    is `docs/reviews/recent-profile-identity-db-verification.json`; both name
    `7973e2d`, while the merged tip `5fce140` added only the records and the
    summary, so the records are valid for the merged tree (extends #33/#38).
    Two review caveats worth repeating: the new `namesDb`/`profilePicsDb`
    wiring lines in `psf-memo-db/src/adapters/index.js` are exercised only by
    DB acceptance, so `mutate4javascript` (which runs the unit suite) reports
    them uncovered; and the client JSX page shell
    `psf-memo-client/src/components/app-body/recent-profiles/index.js` is not
    parsed by `mutate4javascript`. Specs:
    `psf-memo-client/specs/recent-profile-display.feature`,
    `psf-memo-db/specs/recent-profile-identity.feature`.

49. **`/profile/recent` now requires a `profileRecency` record.** A profile
    appears only if the indexer (or the recency backfill) recorded at least one
    confirmed qualifying post for it. The `recent-profile-identity` fixture had
    to seed `profileRecency` or its profiles vanished. The store is
    address-keyed for idempotent upsert, so `ProfileQuery.listRecentProfiles`
    still scans and sorts the whole recency index in memory (O(P log P)); that
    is within spec (the spec forbids scanning `addrPostHeights` or sorting every
    profile, not sorting the recency index), and a bounded-ordered compound key
    is a documented follow-up. Specs:
    `psf-memo-indexer/specs/profile-recency-indexing.feature`,
    `psf-memo-db/specs/recent-profile-ordering.feature`,
    `psf-memo-db/specs/backfill-profile-recency.feature`.

50. **Recent-profile-follow soft Gherkin survivors are intrinsic (gotcha #12
    class).** For `recent-profile-follow.feature` the soft mutation run was 10
    total / 7 killed / 3 survived, 0 errors. Survivors: `broadcast_error`
    `Insufficient balance -> ...balanCe` (the scenario fails the wallet with the
    example value and then asserts the modal contains that same value, so the
    case change cancels) and `addr` case changes in scenarios 8/9 (the address
    flows through setup and assertion consistently and those scenarios do not
    branch on it). The tool wrote a manifest listing only the clean scenarios
    (1, 2, 4, 5). `recent-profile-display.feature` had 0 mutations (only
    scenarios 0/1 are in the manifest; scenario 5's TXID -> Follow header change
    has no example values) and its `# mutation-stamp` was refreshed. Commit all
    tool-written metadata as-is (#40).

51. **Broadcast result records share one pure leaf.**
    `psf-memo-client/src/services/broadcast-result.js`
    (`broadcastSuccessMessage`/`broadcastErrorMessage`) is the single source for
    the follow/mute success and failure message strings, used by both
    `ProfilePage` and `RecentProfilesPage`. Reuse it (and the shared
    `ExplorerTxLink` renderer, #44) for new result modals instead of re-deriving
    messages. Keep `broadcast-result.js` a leaf with no IO or upward
    dependency.

52. **A follow confirmation now precedes the follow/unfollow broadcast.**
    Clicking a `/profile/recent` Follow/Unfollow button opens a confirmation
    (`"Are you sure you want to follow <display name>?"` / `"unfollow"`) with
    Yes and No buttons; nothing is broadcast until Yes. The confirmation state
    machine lives in `RecentProfilesPage` (`requestFollow`/
    `getFollowConfirmMessage`/`confirmFollow`/`cancelFollow` plus
    `pendingFollow`), and the prompt reuses `accountDisplayName` from
    `recent-profiles-table.js` so the confirmation and the Account column agree
    on name-or-truncated-address. The pure `recent-profile-follow-confirm.js`
    component is the Node-renderable seam. Soft Gherkin mutation of
    `recent-profile-follow.feature` was 13 total / 11 killed / 2 survived, 0
    errors; both survivors are intrinsic case changes (gotcha #12/#50 class):
    `broadcast_error` (the scenario fails the wallet with, and asserts, the same
    example value) and a scenario-10 `addr` case change. The tool wrote a
    manifest listing the clean scenarios; commit it as-is.

53. **Profile address copy reuses the copy-confirmation UX but not the
    post-feed code.** `/profile/:addr`'s sidebar address is now a button; the
    pure `ProfilePage` controller owns the confirmation state machine
    (`copyAddress` / `isShowingAddressCopyConfirmation` /
    `addressCopyTimeoutElapsed` / `destroy`) with injected `copyToClipboard`,
    `setTimer`, and `clearTimer`, and
    `psf-memo-client/src/components/app-body/profile/profile-address.js` is the
    plain-`React.createElement` render seam shared with the Node adapter
    `acceptance/lib/render-profile-address.js`. This deliberately differs from
    the hook/`useRef` implementation in `post-feed-item.js`: the two share the
    1.5s / `Copied to clipboard` / `role=status` contract but not code, and
    `dry4javascript` does not flag them. Do not "unify" them without a
    deliberate decision; their structures and testability stories differ. Soft
    Gherkin mutation of `profile-address-copy.feature` was 4 total / 0 killed /
    4 survived, 0 errors — all intrinsic single-character case changes of an
    example address used consistently on the setup and assertion sides (#12
    class); the tool wrote an empty `scenarios` manifest. The JSX shell
    `src/components/app-body/profile/index.js` stays excluded from
    `mutate4javascript` (no JSX plugin), so the copy click is pinned by
    acceptance + unit + property tests instead. Spec:
    `psf-memo-client/specs/profile-address-copy.feature`.

54. **Profile token icons reuse the pure view-model + presentational-component
    seam (#17/#22/#53 class), with a per-token failure boundary.** The
    `/profile/:addr` sidebar below the Follow/Mute controls shows 30 px SLP
    token icons for the profile address's tokens. Resolution is shared with
    `/slp-tokens` through `psf-memo-client/src/services/token-mutable-data.js`
    (`parseMutableDataCid` / `tokenIconFromMutableData` /
    `resolveTokenMutableData`), which reads the token's `ipfs://` mutable-data
    URI, fetches it with `wallet.cid2json`, and prefers an http `fullSizedUrl`
    over `tokenIcon`; `ProfilePage` loads tokens through an injected
    `tokenSource`, isolates a per-token metadata failure, and swallows a missing
    source or failed lookup as "no icons" rather than erroring the page.
    `profile-token-icons.js` is the pure view model and
    `src/components/app-body/profile/profile-token-icons.js` is the
    plain-`React.createElement` render seam shared with the Node adapter
    `acceptance/lib/render-profile-token-icons.js`. Each anchor carries the
    token id as a native `title` tooltip, the ticker as its accessible label,
    and opens `https://explorer.tokentiger.com/?tokenid=<tokenId>` in a new tab.
    The JSX shells (`profile/index.js`, `slp-tokens/index.js`) remain excluded
    from `mutate4javascript`. Soft Gherkin mutation of
    `profile-token-icons.feature` was 18 total / 18 killed / 0 survived; the
    fix's language mutation was 50 killed / 0 survived (`token-mutable-data.js`
    7, `profile-token-icons.js` 2, `profile-page.js` 41); max CC 6 / CRAP 6.0.
    Spec: `psf-memo-client/specs/profile-token-icons.feature`.

55. **`/bch/getTokenData2` does not return usable token icons; resolve mutable
    data the way `/slp-tokens` does (#54).** The first profile-token-icons
    implementation preferred `wallet.getTokenData2` (which posts to
    `/bch/getTokenData2` through `bch-consumer`, whose wrapper does not even
    check `success`) and read `mutableData` as an already-resolved object, so
    every icon silently fell back to a jdenticon while the working `/slp-tokens`
    page used a different path. The working contract is the two-step
    `getTokenData` -> `mutableData` `ipfs://<cid>` -> `wallet.cid2json({ cid })`
    -> resolved JSON `tokenIcon`/`fullSizedUrl`. The acceptance fake had stubbed
    `getTokenData2` to return the resolved object, so the real retrieval
    contract was never exercised and the regression passed acceptance. When a
    feature claims "same functionality as page X", model page X's real data
    contract in the acceptance fixture, not a convenient shortcut. Fixed in task
    `profile-token-icons-fetch` (`12def3d` coder, `cf278d3` refactorer, review
    `073b1e7`).

56. **Profile token icons load in two phases with an injected change listener
    (#54/#55).** `ProfilePage.loadTokenIcons()` lists the profile's SLP tokens
    and renders each icon immediately with a jdenticon and the token ID as the
    tooltip; `ProfilePage.loadTokenData()` then retrieves each token's token
    data (genesis + IPFS mutable data) in one `getTokenData` call and rebuilds
    the icons, setting the tooltip to the genesis name and resolving the image.
    A token whose genesis record has no name, or whose token data cannot be
    retrieved, keeps the token-ID tooltip and jdenticon. The controller
    notifies an injected `onTokenIconsChange` listener so the React shell
    updates the sidebar; `destroy()` suppresses late notifications so a stale
    async load cannot overwrite a newer page. The pure decision is one line in
    `buildTokenIcon` (`token.genesisName || token.tokenId`); the shared
    `token-mutable-data.js` `resolveTokenData` returns `{ name, mutableData }`.
    The `open profile page` acceptance step must therefore make phase one
    observable without awaiting phase two (a separate `token data is retrieved`
    step drives it). Soft Gherkin mutation of the 12-scenario
    `profile-token-icons.feature` was 28/28 killed; language mutation 61 killed
    / 0 survived (`profile-page.js` 50, `token-mutable-data.js` 8,
    `profile-token-icons.js` 3); max CC 6 / CRAP 6.0. Spec:
    `psf-memo-client/specs/profile-token-icons.feature` (scenarios 4, 5, 11,
    12).

57. **The indexer's `createEntityDb` HTTP adapters have no `iterator`; read
    ranges through a psf-memo-db read API (#55 class).** `establishProfileRecency`
    called `adapters.addrPostHeightDb.iterator(range)`, but the real adapter
    (`psf-memo-indexer/src/adapters/entity-db.js`) only wraps `/level` CRUD
    (get/create/update/delete) and psf-memo-db exposes no generic range route,
    so every set-profile (`0x6d05`) threw `addrPostHeightDb.iterator(...) is not
    a function or its return value is not async iterable` and crashed the block
    indexer. The unit/acceptance fakes implemented `iterator`, so they passed.
    Fixed in `profile-recency-db-read` by adding the DB read API
    `GET /profile/newest-post/:addr` (use case
    `psf-memo-db/src/use-cases/get-newest-qualifying-post.js`, shared rule
    `psf-memo-db/src/lib/qualifying-post.js`) and the indexer adapter
    `psf-memo-indexer/src/adapters/newest-qualifying-post.js`; the indexer no
    longer iterates `addrPostHeights`. Do not call `.iterator()` on an indexer
    entity adapter; add a DB read endpoint plus an adapter method, and cover new
    adapter methods with a real-adapter contract test. Spec:
    `psf-memo-db/specs/newest-qualifying-post.feature`.

58. **The TX indexer handoff retries in the background and must never stop
    block indexing.** After IBD the block indexer starts the mempool indexer
    through `GET /tx-start`; that handoff now runs in a pure `TxIndexerHandoff`
    use case (`psf-memo-indexer/src/use-cases/tx-indexer-handoff.js`) with
    injected `startTxIndexer` + `sleep`, retrying every
    `TX_INDEXER_HANDOFF_RETRY_MS` (default 10000) until success and never
    rejecting into `psf-memo-block-indexer.js`. Each axios request is bounded
    by `TX_INDEXER_HANDOFF_TIMEOUT_MS` (default 10000), which equals the retry
    interval, so a genuinely hung endpoint is retried about every 20s (10s
    timeout + 10s wait) rather than every 10s; the documented "retry interval"
    is the wait between attempts. The pre-fix bug was a single `await`ed,
    unbounded, fatal `GET` that produced `connect ETIMEDOUT 172.17.0.1:5455`
    and exited the block indexer. Spec:
    `psf-memo-indexer/specs/tx-indexer-handoff-retry.feature`. Record
    `docs/reviews/tx-handoff-retry-verification.json` names the code-review
    commit `0acf7a9`; the merged tip `20ed191` adds review docs plus a one-line
    test lint cleanup (extends #38).

59. **Failed TX indexer handoff attempts now log the endpoint and the retry.**
    `TxIndexerHandoff` takes injected `log` and `endpoint`; the adapter's
    `endpoint()` returns `{ ip, port }` from `txRestApiIp`/`txRestApiPort` and
    is the single source of truth shared with the request URL. Each failed
    attempt calls `logFailure` -> `TX indexer handoff failed for IP <ip> port
    <port>: <err>. Retrying in <interval> milliseconds.` The composition root
    (`use-cases-index.js`) wires `console.error` as the sink (the requester
    said `console.log`; stderr was chosen and accepted, and both appear in
    `docker logs`). In bounded diagnostic mode (`maxRetries` set) the terminal
    failed attempt still logs a retry that does not happen; production is
    unbounded and always retries, so the wording is accurate there
    (architect-accepted). Spec scenario 5 requires one log per failed attempt
    (`log_count = retries + 1`). Record
    `docs/reviews/tx-handoff-retry-logging-verification.json` names the
    code-review commit `a9b1965`; the merged tip `1411abe` is docs-only
    (extends #38).

60. **A missing DB entity write route silently drops an entire action class.**
    The mute feature shipped with a read API (`/mute/state`, `/mute/muted`) and
    an indexer handler that writes through `createEntityDb('mute', ...)`
    (`POST /level/mute`), but `ENTITY_CONFIG` in
    `psf-memo-db/src/controllers/rest-api/level/crud-handlers.js` never gained a
    `mute` route, so every indexer mute write 404'd and the `mutes` store stayed
    empty. Unit tests stubbed `muteDb.create` and acceptance fakes seeded
    `mutesDb` directly, so no test crossed the indexer REST write to the DB
    route (gotcha #4/#57 class). When a spec's acceptance drives a write, make
    the write step go through the real route registry
    (`entityHandlers.<route>`) rather than the store, and keep the route table
    in sync with every `createEntityDb(...)` call the indexer introduces. Fixed
    in `mute-persistence` (`04275c4`); the architect also had to fix the DB
    gherkin-mutation `runner-worker.js` stdout protocol because importing the
    real controller loads winston, whose `Console` transport writes to stdout
    and corrupted the worker's newline-delimited JSON channel (see
    `docs/architect-process-notes.md`).

61. **The account and profile pages now share the sidebar loaders.** The
    account-page-layout job extracted the two-phase SLP token-icon loading
    (`psf-memo-client/src/services/token-icon-loader.js`) and the transient
    address-copy confirmation (`psf-memo-client/src/services/address-copy.js`)
    out of `ProfilePage` so `AccountPage` and `ProfilePage` share them; both
    controllers expose the same duck-typed page fields the helpers expect. The
    account page reuses `profile-address.js` and `profile-token-icons.js`
    directly. The profile page still has an inline `ProfileAvatar` that
    duplicates the account avatar/jdenticon rendering; the architect logged a
    neutral shared avatar/sidebar component as a follow-up, not part of the
    task. Soft Gherkin survivors are intrinsic (self-consistent case and
    same-length substitutions), and the tool-written manifests in the three
    touched feature files are committed as-is (#40). Spec:
    `psf-memo-client/specs/account-page-layout.feature`.

62. **Viewport/scroll resets are tested through an injected adapter, and the
    harness must simulate a non-top position.** The `feed-pagination-scroll`
    feature resets the feed to the top on each page load or tab change through
    `FeedTabsPage`'s injected `scrollToTop` adapter (the React view wires
    `window.scrollTo({ top: 0, left: 0 })`). The acceptance world records
    `world.feedScrollTop`, and the Click Next/Previous and Click tab handlers
    set it to a non-zero value (`scrolledAwayFromFeedTop`) *before* the action,
    so the reset is observable; the `the posts feed is scrolled to the top`
    step asserts 0. Without that pre-action simulation a reset assertion can
    pass trivially from an earlier action. Soft Gherkin mutation was 14 total /
    9 killed / 5 intrinsic survivors (a self-consistent `count` and address-case
    values, #12 class); language mutation 22/22 on `feed-tabs-page.js`. Spec:
    `psf-memo-client/specs/feed-pagination-scroll.feature`.

63. **Onboarding a monorepo component needs a `verify.sh` entry and
    self-provisioning for gitignored runtime dirs.** `psf-memo-cli` was added
    with `crap`/`mutate`/`dry` npm scripts, but `verify.mjs` had no `cli`
    component, so the architect could not emit a verification record until a
    `cli` entry was added. Its `.wallets/` directory is gitignored, so a fresh
    checkout failed `npm test` with `ENOENT`; `pretest: mkdir -p .wallets` and a
    production `saveWallet` mkdir fixed both the test harness and the real
    command. When onboarding a component, add its `verify.mjs` entry and make
    gitignored runtime dirs self-provisioning. Brief:
    `psf-memo-cli/dev-docs/quality-baseline.md`.

64. **The CLI Gherkin acceptance harness landed with F1, not after the first
    write command.** Task `cli-memo-db-client` built
    `psf-memo-cli/acceptance/` (generator, runtime, handlers, runner-worker) and
    the `cli` `verify.mjs` entry, so the "F6 after the first command" decision
    is satisfied at F1 and `psf-memo-cli/specs/memo-db-client.feature` (7
    scenarios, 12 example executions) is the first executable CLI acceptance
    suite. New components must reuse the shared
    `runComponentAcceptance({ root, acceptanceDir, repoRoot })` from
    `swarmforge/scripts/lib/acceptance-runner.cjs` instead of copying the
    orchestration; the architect replaced the CLI's initial copy. Soft Gherkin
    mutation was 23 considered / 12 killed / 11 intrinsic survivors; language
    mutation 6 killed / 0 survived (`memo-db.js` 4, `config/index.js` 2).

65. **Memo DB endpoint precedence and default (CLI).** `psf-memo-cli` resolves
    the memo-db endpoint as `--db-url` > `MEMO_DB_URL` >
    `https://memo-api.fullstackcash.net` (production); local dev uses
    `http://localhost:5021`. The shared read client is
    `psf-memo-cli/src/lib/memo-db.js` (injected `fetch`, pure endpoint
    resolution, `/level/*` 404 -> no data). Every future `memo-*` read command
    builds on it; the active backlog is
    `psf-memo-cli/dev-docs/feature-backlog.md`.

66. **An architect branch can carry a docs-only commit after the handoff
    commit.** For `cli-memo-db-client` the handoff named review commit
    `c881811`, while the merged branch tip was `346556f` (record + summary + an
    `architect-process-notes` note). `git diff c881811 346556f` was docs-only,
    so the record's `git_sha` `c881811` is valid for the merged tree (extends
    #38). Merge the branch tip, then confirm any later commits are
    docs/generated-metadata only before treating the record as current.

67. **The shared CLI reporter owns the output/exit contract (F5).**
    `psf-memo-cli/src/lib/reporter.js` is a pure, injectable leaf that every
    `memo-*` command must use: human-readable by default, `--json` prints one
    object to stdout, failures print the real error on stderr, and exit codes
    are `0` success / `1` runtime failure / `2` usage (missing required flag).
    Success JSON is the command's own result object; error JSON is
    `{ "error": "<message>" }` on stderr. Unknown-option exit-2 handling is
    deferred to a later hardening item. Pin exported exit-code constants to
    literal 0/1/2 in a contract test: symbolic assertions make their mutations
    equivalent (the constant analogue of gotcha #12). Spec:
    `psf-memo-cli/specs/cli-output-contract.feature`.

68. **CLI acceptance step handlers are split per feature.** New features add
    `acceptance/lib/steps/<feature>.js` (with the shared `step-support.js`);
    `handlers.js` owns only the scenario world and step dispatch. The architect
    split the coder's growing `handlers.js` after F5, so future work should
    extend the per-feature module. Soft Gherkin mutation of
    `cli-output-contract.feature` was 10 considered / 0 killed / 10 intrinsic
    survivors (example strings flow through both setup and assertion); the
    structural channel/exit/JSON steps carry the kills. Language mutation was 4
    killed / 0 survived (`reporter.js`).

69. **CLI wire-encoding helpers (F4).** `psf-memo-cli/src/lib/wire-encoding.js`
    exposes only `txidToWireBytes` (32-byte little-endian, byte-reversed) and
    `addressToHash160` (20-byte hash160 in display order, **not** reversed),
    promoting `ecashaddrjs` to a direct dependency. Soft Gherkin mutation of
    `memo-wire-encoding.feature` was 16 mutations / 10 killed / 6 intrinsic
    survivors: scenarios 1 and 3 have independent input/expected columns and
    killed all 10 of their mutations, while mutating a malformed txid/address
    in the rejection scenarios preserves its malformed property, so "reports an
    invalid ..." still holds. That is a new intrinsic class (malformed-input
    equivalents): if a rejection scenario must be mutatable, assert the exact
    error or tie the assertion to independent data. Spec:
    `psf-memo-cli/specs/memo-wire-encoding.feature`.

70. **CLI wallet source and Memo broadcast scaffolding (F2/F3).**
    `psf-memo-cli/src/lib/wallet-source.js` is a pure resolver requiring exactly
    one of `-n <wallet>`/`--wif <wif>`; zero or two sources is a `UsageError`
    (exit 2). `psf-memo-cli/src/lib/memo-broadcast.js` exports pure
    `toPushBuffer`/`buildMemoPushes` and confines the minimal-slp-wallet
    `Script.encode2` monkey-patch to `broadcastMultiPush`/
    `attachMultiPushOpReturn` (gotcha #35); multi-field actions become one push
    per field. `wallet-util.js` gained a WIF constructor. The acceptance
    recording wallet reuses `buildMemoPushes` (do not re-implement the wire
    format in the test double). Soft Gherkin mutation was memo-broadcast 22/9
    and wallet-source 8/0, all survivors intrinsic round-trip equivalents (each
    example value flows through both setup and assertion); language mutation 12
    killed / 0 survived across the three modules. Specs:
    `psf-memo-cli/specs/wallet-source.feature`,
    `psf-memo-cli/specs/memo-broadcast.feature`.

71. **`memo-feed` soft Gherkin survivors are intrinsic (gotcha #12 class).**
    The soft mutation run on `memo-feed.feature` was 33 total / 27 killed / 6
    survived, 0 errors. Survivors: `limit 2 -> 6` and `limit 5 -> 9` in Memo
    Feed - 2 (with `offset 4` only one post remains and the fixture has five, so
    the reported page, `total 5`, and `hasMore` are unchanged for any larger
    limit) and `limit 1 -> 3` / `limit 2 -> 4` in Memo Feed - 3 (the asserted
    single post is still present in the widened page); the two `viewer` address
    mutations in Memo Feed - 4 are self-consistent (setup and assertion use the
    same value). `gherkin-mutator` wrote a manifest listing only the fully-killed
    scenario (Memo Feed - 5); commit it as-is (#40). Language mutation was 9
    killed / 0 survived (`memo-feed.js` command 1, lib 8); DRY clean. The
    architect also removed a double flag parse (dead `validateFlags` return) in
    the command so the flags are parsed exactly once.

72. **New read commands subclass the shared read-command scaffolding.**
    The refactorer extracted `src/lib/read-command.js` (`initReadCommand`,
    `createMemoDbClient`, `runReadCommand`) and the acceptance-side
    `acceptance/lib/read-command.js` JSON-mode capture, so `memo-feed` and
    `memo-thread` are thin declarative subclasses supplying only their flag
    parser, service read, and renderer. Reuse this for the remaining read
    commands (R3/R4/R5/R6/R7…) instead of re-wiring the MemoDb client and
    reporter. `MemoDb.getThread(txid)` resolves an unindexed txid to `null`;
    the command maps that to a named not-found failure (exit 1) so R16
    `memo-wait` can poll. Soft Gherkin mutation of `memo-thread.feature` was
    6/6 killed (no equivalents); language mutation 10 killed / 0 survived
    (`read-command.js` 1, `memo-thread.js` 5, `memo-db.js` 4), commands 0
    mutable sites; DRY clean.

73. **`-t` parsing and read-command error assertions are shared leaves.**
    `src/lib/txid-flag.js` single-sources the required-`-t` validation and its
    exact usage message; `memo-thread` and `memo-get-post` delegate to it.
    `acceptance/lib/read-command.js` now also owns `parseStderrError`,
    `assertNotFound`, and `assertReadCommandError`, used by all three read step
    modules. `MemoDb.getPost(txid)` resolves a missing `/level/post/:txid` to
    `null`; the command merges the request txid into the returned body (the
    stored post is not txid-keyed) and maps `null` to a named not-found failure
    (exit 1). The new `memo-get-post` modules (`txid-flag.js`, the
    `memo-get-post.js` lib + command) scan as 0 language mutation sites (pure
    guards/template literals, confirmed with `--scan`); `memo-thread.js` and
    `memo-db.js` were re-mutated 4/0 each. Soft Gherkin mutation of
    `memo-get-post.feature` was 10/10 killed. The `memo-post` name collision is
    resolved: the read command is `memo-get-post`, the write command (W1) keeps
    `memo-post`.

74. **`memo-status` soft Gherkin survivors are all intrinsic (gotcha #12
    class).** The soft mutation run on `memo-status.feature` was 9/9 survived, 0
    errors: every `startBlockHeight`/`syncedBlockHeight`/`chainBlockHeight`
    example value is parsed from the same cell in the setup and the assertion, so
    a mutation applies consistently to both sides. The tool wrote the expected
    empty `"scenarios":[]` manifest (no `# mutation-stamp`); commit it as-is.
    Language mutation was 5 killed / 0 survived (`memo-status.js` command 1,
    `memo-db.js` 4; lib is a single template literal, 0 sites). `memo-status` is
    flag-less, so `validateFlags()` returns a constant `true` to satisfy the
    shared read-command binder; an explicit unit test pins it, so it is not a
    dead equivalent. `MemoDb.getStatus` resolves a missing
    `/level/status/status` to `null`; the command maps it to a named not-found
    failure (exit 1). DRY: the three memo-db 404 unit tests were consolidated
    into one `assertMissingResource` helper.

75. **Wallet-relative read commands compose; they don't grow the read
    scaffolding.** `memo-identity` is the first read command that also needs a
    wallet. It composes `src/lib/read-command.js` with the F2
    `src/lib/wallet-source.js` resolver and pure `src/lib/memo-identity.js`
    helpers (BCH summing, sats→BCH, token-UTXO collection); wallet concerns were
    deliberately not added to the read-command module. `readProfile` issues the
    name/profile/avatar requests with `Promise.all` and normalizes a missing
    document to an empty field (`doc?.field || ''`), while a transport failure
    propagates as exit 1. Soft Gherkin mutation of `memo-identity.feature` was
    26 total / 12 killed / 14 intrinsic survivors: the kills are the derived
    balance cells (`sats`/`bch`, `utxos`/`balances`); the survivors are
    pass-through `addr`/`name`/`bio`/`url` cells used on both the setup and the
    assertion side (gotcha #12 class). Language mutation 19 killed / 0 survived
    (`memo-identity.js` command 5, lib 10, `memo-db.js` 4). DRY: the
    `getName`/`getProfilePic` level-resource tests were table-driven into
    `requestLevelResource`/`assertMissingResource`; the `assertUsageError`
    acceptance helper is now shared across the read features.

76. **`/search` returns posts and profiles under one combined pagination
    (`memo-search`, R9).** The DB `SearchAll` use case returns
    `{ posts, profiles, pagination }` where `pagination.total` is
    `posts + profiles` and the same `limit`/`offset` slice is applied to each
    list independently, so with a balanced corpus `hasMore` can stay true past
    the end. `memo-search` reports both collections and passes the pagination
    through unchanged (X6); the acceptance fixture is posts-only for the offset
    page scenarios to keep `hasMore` unambiguous, with the combined fixture
    pinned at offset 0. Do not "fix" the combined pagination in the CLI; that is
    the service's contract. Spec:
    `psf-memo-cli/specs/memo-search.feature`.

77. **Formatted list read commands share `ListReadCommand` (`memo-profiles`,
    R10).** `src/lib/list-command.js` (`ListReadCommand`) plus
    `runOutcomeCommand` in `src/lib/read-command.js` own the validate -> read ->
    `{ message, data }` pipeline for formatted-list reads; `memo-profiles`,
    `memo-topics`, and `memo-search` are thin subclasses supplying only
    `parseFlags`, `format`, and a read method. `runPostsPageCommand` delegates to
    the same pipeline. New list/read commands should reuse this base rather than
    re-wiring `initReadCommand`/reporter. The `memo-profiles`/`memo-topics`
    command-class glue is an accepted DRY pair (route, formatter, and collection
    genuinely differ). The pagination soft mutation left 2 fixture-masked
    upward-`limit` survivors (`2 -> 6`, `5 -> 9`), the same intrinsic class as
    #46/#71. Spec: `psf-memo-cli/specs/memo-profiles.feature`.

78. **Scenarios without an `Examples` table are not soft-mutation-tested
    (`cli-follow-lists`, R11).** `gherkin-mutator --level soft` mutates only
    example-table values, so `memo-following.feature` and
    `memo-followers.feature` (whose addresses and lists are step literals) both
    reported 0 mutations, and the tool wrote empty `scenarios:[]` manifests with
    a `# mutation-stamp` to each feature. The behavior is still pinned by the
    unit, property, and acceptance suites, but if a scenario's values should be
    mutation-covered, express them as a `Scenario Outline` with an `Examples`
    table. Specs: `psf-memo-cli/specs/memo-following.feature`,
    `psf-memo-cli/specs/memo-followers.feature`.

79. **Wallet-scoped address-list commands share `defineWalletListCommand`
    (`memo-muted`, R12).** `src/lib/wallet-list-command.js`
    (`defineWalletListCommand`) owns the wallet-scoped, unpaginated address-list
    pipeline (flag normalization, `resolveWalletSource`, summary, reporter);
    `memo-muted` and `memo-following` are declarations of
    `readMethod`/`clientMethod`/`listField`/`label`. It builds on
    `ListReadCommand` and the shared `follow-list.js` parsers/formatter. New
    wallet-scoped list reads should reuse it. Expressing `memo-muted` scenario 2
    as a `Scenario Outline` made it soft-mutation-testable (4/4 killed),
    confirming gotcha #78. Spec: `psf-memo-cli/specs/memo-muted.feature`.

80. **Single-field write commands share `defineFieldWriteCommand`, and byte
    limits need the exact boundary case (`memo-name`, W4).**
    `src/lib/write-command.js` now exposes `defineFieldWriteCommand` for
    single-field Memo actions; `memo-post` and `memo-name` are declarations of
    `parse`/`format`/`prefix`/`field`, while `runWriteCommand` still backs the
    multi-field commands (`memo-reply`, `memo-like`). New single-field writes
    should reuse the factory. Testing only "just under" and "just over" a byte
    limit leaves the `>` / `>=` boundary mutation alive (the `memo-name`
    77-byte `>` -> `>=` survivor); include a test at exactly the limit. Spec:
    `psf-memo-cli/specs/memo-name.feature`.

81. **Memo `-m` text commands share `memoTextFlagParser` (`memo-bio`, W5).**
    `src/lib/memo-text-flag.js` (`memoTextFlagParser`) owns the shared
    missing/empty/over-long `-m` contract, parameterized by label, messages,
    inclusive limit, size measure, and unit; `memo-post` (217 UTF-16 code
    units), `memo-name` (77 UTF-8 bytes), and `memo-bio` (217 UTF-8 bytes) keep
    their distinct protocol rules in their own pure modules. The shared
    unit/property validation tests live in
    `test/support/memo-text-flag-tests.js` and
    `test/property/memo-text-flag-property.js`; the remaining
    `memo-{name,bio}.unit.js` wrapper pair is accepted per-command config
    boilerplate. Spec: `psf-memo-cli/specs/memo-bio.feature`.

82. **`memoTextFlagParser` now takes a `flag` key (`memo-avatar`, W6).** The
    shared profile-text validation parser (gotcha #81) gained a `flag` parameter
    (default `memo`, also `url`), so `memo-avatar` validates its `-u` URL with
    the same missing/empty/over-long contract and the shared unit/property
    registrars; `memo-avatar` keeps its own `0x6d0a` prefix and 217-byte limit.
    Reuse it for any future single-text-field write (the `-u` avatar flag, the
    `-m` post/name/bio flags). Spec:
    `psf-memo-cli/specs/memo-avatar.feature`.

83. **Address state writes share `defineAddressWriteCommand`
    (`cli-follow-mute`, W7/W8).** `src/lib/address-write-command.js`
    (`defineAddressWriteCommand`) composes `defineFieldWriteCommand` with an
    `-a` hash160 parser, so `memo-follow` (`6d06`), `memo-unfollow` (`6d07`),
    `memo-mute` (`6d16`), and `memo-unmute` (`6d17`) declare only `prefix`,
    `missingMessage`, and `verb`. `addressHash160FlagParser` in
    `src/lib/address-flag.js` decodes through the shared F4 `addressToHash160`
    (display order, never byte-reversed; gotcha #32) and wraps decoder errors as
    `UsageError`. New address-payload writes should reuse the factory. Specs:
    `psf-memo-cli/specs/memo-{follow,unfollow,mute,unmute}.feature`.

84. **Multi-field writes share `defineFieldsWriteCommand`, and topic rooms use
    the shared `-r` parser (`cli-topic-writes`, W9/W10).**
    `src/lib/write-command.js` now exposes `defineFieldsWriteCommand` for
    ordered multi-field actions, with `defineFieldWriteCommand` as its one-field
    case; `memo-reply` and `memo-topic-post` (`fields: ['room', 'message']`) use
    it. `room-flag.js` owns the required `-r` room check and message, and
    `topic-room-write-command.js` composes it with the single-field factory for
    `memo-topic-follow`/`memo-topic-unfollow`. The `0x6d0c` combined room+message
    limit stays local to `memo-topic-post.js` because `memoTextFlagParser`
    measures one flag. Specs:
    `psf-memo-cli/specs/memo-{topic-post,topic-follow,topic-unfollow}.feature`.

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

# CLI
cd psf-memo-cli
npm test
npm run property
```

After merging architect into `master`, run the verification commands for every
component the feature touched.

Prefer the canonical runner, which runs the same sequence and emits a
machine-readable record:
```bash
swarmforge/scripts/verify.sh client  --record docs/reviews/<task>-verification.json --task <task>
swarmforge/scripts/verify.sh db      --record docs/reviews/<task>-verification.json --task <task>
swarmforge/scripts/verify.sh indexer --record docs/reviews/<task>-verification.json --task <task>
swarmforge/scripts/verify.sh cli     --record docs/reviews/<task>-verification.json --task <task>
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

Latest session (2026-10-08, `cli-topic-writes`): specified and merged W9/W10 as
three topic writes in one cycle. The specifier wrote
`psf-memo-cli/specs/memo-topic-post.feature` (8 scenarios),
`memo-topic-follow.feature`, and `memo-topic-unfollow.feature` (4 each); the
coder/refactorer/architect added `defineFieldsWriteCommand`
(`src/lib/write-command.js`, now backing `memo-reply`), `room-flag.js` (shared
required `-r` message), and `topic-room-write-command.js`, plus
`memo-topic-post` (`0x6d0c`, `[6d0c, room, message]`, room+message ≤ 214 UTF-8
bytes), `memo-topic-follow` (`0x6d0d`), and `memo-topic-unfollow` (`0x6d0e`).
Each resolves the signing wallet (`-n`/`--wif`), requires the room (`-r`), and
reports the txid + explorer; missing/empty/over-limit flags are usage errors
(exit 2) with no broadcast. The architect killed a combined-214-byte boundary
survivor and shared the property random-text generator. Merged to `master` at
`c46a728` (fast-forward; architect code-review commit `8bfdfa47ec`; the later
`c46a728` adds only the record and summary, so
`docs/reviews/cli-topic-writes-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `8bfdfa47ec` (unit 568/0, property 110/0, acceptance
all 35 suites, lint ok); language mutation 6 killed / 0 survived; soft Gherkin
mutation topic-post 21/8, follow/unfollow 6/0 (intrinsic case equivalents); DRY
clean. Independent acceptance check after merge: 24/24. Architect summary:
`docs/reviews/cli-topic-writes-summary.md`.

Previous session (2026-10-08, `cli-follow-mute`): specified and merged W7/W8 as
four hash160 state writes in one cycle. The specifier wrote
`psf-memo-cli/specs/memo-{follow,unfollow,mute,unmute}.feature` (5 scenarios
each, 28 example executions); the coder/refactorer/architect added
`defineAddressWriteCommand` (`src/lib/address-write-command.js`) and
`addressHash160FlagParser` (`src/lib/address-flag.js`, reusing F4
`addressToHash160` in display order, never byte-reversed) plus thin declarations
`memo-follow` (`6d06`), `memo-unfollow` (`6d07`), `memo-mute` (`6d16`), and
`memo-unmute` (`6d17`). Each resolves the signing wallet (`-n`/`--wif`),
requires the target address (`-a`), broadcasts `[prefix, hash160]`, and reports
the txid + explorer; missing/malformed addresses are usage errors (exit 2) with
no broadcast. The architect table-drove the address-command tests. Merged to
`master` at `0e89edc` (fast-forward; architect code-review commit `a53d471595`;
the later `0e89edc` adds only the record and summary, so
`docs/reviews/cli-follow-mute-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `a53d471595` (unit 530/0, property 105/0,
acceptance all 32 suites, lint ok); language mutation 0 sites in the changed
files; soft Gherkin mutation 8 total / 4 killed / 4 intrinsic survivors per
feature; DRY clean. Independent acceptance check after merge: 28/28. Architect
summary: `docs/reviews/cli-follow-mute-summary.md`.

Previous session (2026-10-08, `cli-memo-avatar`): specified and merged W6, the
set-profile-picture write command. The specifier wrote
`psf-memo-cli/specs/memo-avatar.feature` (7 scenarios, 11 example executions);
the coder/refactorer/architect added `src/lib/memo-avatar.js` (0x6d0a prefix,
217 UTF-8 byte limit, `-u` parsing, summary) and a thin
`src/commands/memo-avatar.js` over the shared single-field write factory,
registered as `memo-avatar`. It resolves the signing wallet (`-n`/`--wif`) and
broadcasts `[6d0a, url]`; missing/empty/over-217-byte URLs are usage errors
(exit 2), and a rejected broadcast surfaces the wallet's real error (exit 1).
The refactorer generalized `memoTextFlagParser` to take a `flag` key (backing
both `-m` and `-u`) and extended the shared text-flag unit/property registrars.
Merged to `master` at `b7686b1` (fast-forward; architect code-review commit
`2771df6039`; the later `b7686b1` adds only the record and summary, so
`docs/reviews/cli-memo-avatar-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `2771df6039` (unit 493/0, property 103/0,
acceptance all 28 suites, lint ok); language mutation 2 killed / 0 survived;
soft Gherkin mutation 15 total / 5 killed / 10 intrinsic survivors; DRY only
the accepted per-command wrapper pair. Independent acceptance check after
merge: 11/11. Architect summary:
`docs/reviews/cli-memo-avatar-summary.md`.

Previous session (2026-10-08, `cli-memo-bio`): specified and merged W5, the
set-profile-text write command. The specifier wrote
`psf-memo-cli/specs/memo-bio.feature` (7 scenarios, 11 example executions); the
coder/refactorer/architect added `src/lib/memo-bio.js` (0x6d05 prefix, 217
UTF-8 byte limit, flag parsing, summary) and a thin
`src/commands/memo-bio.js` over the shared single-field write factory,
registered as `memo-bio`. It resolves the signing wallet (`-n`/`--wif`) and
broadcasts `[6d05, bio]`; missing/empty/over-217-byte bios are usage errors
(exit 2), and a rejected broadcast surfaces the wallet's real error (exit 1).
The refactorer extracted `memoTextFlagParser` (`src/lib/memo-text-flag.js`,
now backing `memo-post`, `memo-name`, `memo-bio`) and shared the text-flag
unit/property tests; the architect added the exact-217-byte boundary coverage.
Merged to `master` at `ab6f909` (fast-forward; architect code-review commit
`e93f949aca`; the later `ab6f909` adds only the record and summary, so
`docs/reviews/cli-memo-bio-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `e93f949aca` (unit 476/0, property 100/0,
acceptance all 27 suites, lint ok); language mutation 2 killed / 0 survived;
soft Gherkin mutation 15 total / 5 killed / 10 intrinsic survivors; DRY one
accepted per-command wrapper pair. Independent acceptance check after merge:
11/11. Architect summary: `docs/reviews/cli-memo-bio-summary.md`.

Previous session (2026-10-08, `cli-memo-name`): specified and merged W4, the first
profile write command. The specifier wrote
`psf-memo-cli/specs/memo-name.feature` (7 scenarios, 11 example executions);
the coder/refactorer/architect added `src/lib/memo-name.js` (0x6d01 prefix, 77
UTF-8 byte limit via `Buffer.byteLength`, flag parsing, summary) and a thin
`src/commands/memo-name.js` over the shared write scaffolding, registered as
`memo-name`. It resolves the signing wallet (`-n`/`--wif`) and broadcasts the
single-field action `[6d01, name]`; missing/empty/over-77-byte names are usage
errors (exit 2) with no broadcast, and a rejected broadcast surfaces the
wallet's real error (exit 1). The refactorer extracted
`defineFieldWriteCommand` (also backing `memo-post`); the architect added the
exact-77-byte boundary coverage that killed the `>` -> `>=` survivor. Merged to
`master` at `14d4407` (fast-forward; architect code-review commit `a020de3ade`;
the later `14d4407` adds only the record and summary, so
`docs/reviews/cli-memo-name-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `a020de3ade` (unit 458/0, property 97/0, acceptance
all 26 suites, lint ok); language mutation 5 killed / 0 survived; soft Gherkin
mutation 15 total / 5 killed / 10 intrinsic survivors (case/over-limit
equivalents); DRY clean. Independent acceptance check after merge: 11/11.
Architect summary: `docs/reviews/cli-memo-name-summary.md`.

Previous session (2026-10-08, `cli-memo-poll`): specified and merged R13, the poll
read command, completing the read set (R1-R16). The specifier wrote
`psf-memo-cli/specs/memo-poll.feature` (6 scenarios, 9 example executions); the
coder/refactorer/architect added `src/lib/memo-poll.js` (summary) and a thin
`src/commands/memo-poll.js` over the shared read-command plumbing and
`MemoDb.getPoll` (`GET /polls/:txid`), registered as `memo-poll`. It reads a
single poll by txid (shared `-t` flag) and reports the question, the options
(text and author address), and the current votes (comment and voter address);
the DB 404 maps to a named not-found failure (exit 1). The refactorer deduped
the poll acceptance steps and txid-path DB tests. Merged to `master` at
`2a34ccc` (fast-forward; architect code-review commit `1838180cc9`; the later
`2a34ccc` adds only the record and summary, so
`docs/reviews/cli-memo-poll-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `1838180cc9` (unit 442/0, property 94/0, acceptance
all 25 suites, lint ok); language mutation 15 killed / 0 survived; soft Gherkin
mutation 12/12 killed; DRY clean. Independent acceptance check after merge: 9/9.
Architect summary: `docs/reviews/cli-memo-poll-summary.md`.

Previous session (2026-10-08, `cli-memo-muted`): specified and merged R12, the
muted-list read command. The specifier wrote
`psf-memo-cli/specs/memo-muted.feature` (4 scenarios, 5 example executions;
scenario 2 is a `Scenario Outline` so the soft mutator has values to mutate);
the coder/refactorer/architect added `src/commands/memo-muted.js` over the new
shared `defineWalletListCommand` factory (`src/lib/wallet-list-command.js`) and
`MemoDb.getMuted` (`GET /mute/muted/:addr`), registered as `memo-muted`. It
resolves the signing wallet (`-n`/`--wif`) and reports the address's muted cash
addresses; the route is unpaginated. The refactorer migrated `memo-following`
onto the same factory; the architect removed a dead flag-parsing alias. Merged
to `master` at `7367b74` (fast-forward; architect code-review commit
`265618da20`; the later `7367b74` adds only the record and summary, so
`docs/reviews/cli-memo-muted-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `265618da20` (unit 431/0, property 91/0, acceptance
all 24 suites, lint ok); language mutation 18 killed / 0 survived; soft Gherkin
mutation 4/4 killed; DRY clean. Independent acceptance check after merge: 5/5.
Architect summary: `docs/reviews/cli-memo-muted-summary.md`.

Previous session (2026-10-08, `cli-follow-lists`): specified and merged R11 as two
commands in one cycle. The specifier wrote
`psf-memo-cli/specs/memo-following.feature` and
`psf-memo-cli/specs/memo-followers.feature` (4 scenarios each); the
coder/refactorer/architect added `src/lib/follow-list.js` (shared follower `-a`
flag and address-list summary), `src/commands/memo-following.js` (wallet
resolution via the F2 wallet source then `GET /follow/following/:addr`) and
`src/commands/memo-followers.js` (`GET /follow/followers/:addr`), plus
`MemoDb.getFollowing`/`getFollowers`, registration, acceptance steps, unit and
property tests. Both routes are unpaginated plain address arrays, so no page
flags. `memo-following` requires `-n`/`--wif`; `memo-followers` requires `-a`.
The refactorer shared the wallet-address acceptance step and property
generators; the architect consolidated the follow-command tests and killed all
mutation sites. Merged to `master` at `9bffb8a` (fast-forward; architect
code-review commit `c67e4ac0be`; the later `9bffb8a` adds only the record and
summary, so `docs/reviews/cli-follow-lists-verification.json` is valid for the
merged tree). `verify.sh cli` pass 4/4 at `c67e4ac0be` (unit 423/0, property
89/0, acceptance all 23 suites, lint ok); language mutation 17 killed / 0
survived; soft Gherkin mutation 0 (no Examples tables; gotcha #78); DRY clean.
Independent acceptance check after merge: 8/8. Architect summary:
`docs/reviews/cli-follow-lists-summary.md`.

Previous session (2026-10-08, `cli-memo-profiles`): specified and merged R10, the
recent-profiles read command. The specifier wrote
`psf-memo-cli/specs/memo-profiles.feature` (6 scenarios, 12 example
executions); the coder/refactorer/architect added `src/lib/memo-profiles.js`
(page defaults and human summary) and a thin `src/commands/memo-profiles.js`
over the shared `ListReadCommand` pipeline and `MemoDb.getRecentProfiles`
(`GET /profile/recent`), registered as `memo-profiles`. It reports one page of
recently active profiles (address, bio text, display name, avatar URL,
provenance txid, and the most recent qualifying post's block height and seen)
in the service's order with the pagination unchanged; a null name/avatar is
passed through as null. The refactorer extracted `ListReadCommand` +
`runOutcomeCommand` (`memo-profiles`, `memo-topics`, `memo-search` now share
the formatted-page pipeline); the architect fixed a mutation survivor and
consolidated the DB page tests. Merged to `master` at `44e1c1e` (fast-forward;
architect code-review commit `292dfa1c1b`; the later `44e1c1e` adds only the
record and summary, so `docs/reviews/cli-memo-profiles-verification.json` is
valid for the merged tree). `verify.sh cli` pass 4/4 at `292dfa1c1b` (unit
402/0, property 81/0, acceptance all 21 suites, lint ok); language mutation 18
killed / 0 survived (`memo-profiles.js` 4, `read-command.js` 1, `memo-db.js`
13); soft Gherkin mutation 33 total / 31 killed / 2 intrinsic survivors
(fixture-masked upward `limit`); DRY one accepted command-glue pair. Independent
acceptance check after merge: 12/12. Architect summary:
`docs/reviews/cli-memo-profiles-summary.md`.

Previous session (2026-10-08, `cli-memo-search`): specified and merged R9, the
full-text search read command. The specifier wrote
`psf-memo-cli/specs/memo-search.feature` (7 scenarios, 11 example executions);
the coder/refactorer/architect added `src/lib/memo-search.js` (required `-q`
query, page defaults, blank-query empty page, human summary) and a thin
`src/commands/memo-search.js` over the shared read-command plumbing and
`MemoDb.search` (`GET /search`), registered as `memo-search`. It reports one
page of matching top-level posts and profiles (case-insensitive substring over
post text and profile name/bio) with the combined service pagination unchanged;
the optional `--viewer` filters muted authors from the posts (profiles are not
mute-filtered). A missing `-q` is a usage error (exit 2); a provided blank
query returns an empty result (exit 0); a failed request is an error (exit 1).
The refactorer added a shared `toQuery` builder in `src/lib/memo-db.js` and
shared usage-error test helpers. Merged to `master` at `850674c` (fast-forward;
architect code-review commit `2cd80790da`; the later `850674c` adds only the
record and summary, so `docs/reviews/cli-memo-search-verification.json` is valid
for the merged tree). `verify.sh cli` pass 4/4 at `2cd80790da` (unit 389/0,
property 76/0, acceptance all 20 suites, lint ok); language mutation 17 killed /
0 survived (`memo-search.js` lib 5, `memo-db.js` 12; the command module scans as
0 sites); soft Gherkin mutation 22 total / 20 killed / 2 intrinsic survivors
(viewer address case); DRY clean. Independent acceptance check after merge:
11/11. Architect summary: `docs/reviews/cli-memo-search-summary.md`.

Previous session (2026-10-07, `cli-memo-topic`): specified and merged R8, the
single-topic posts read command. The specifier wrote
`psf-memo-cli/specs/memo-topic.feature` (7 scenarios, 12 example executions);
the coder/refactorer/architect added `src/lib/memo-topic.js` (required `-r`
room, optional `--viewer`, page defaults, summary) and a thin
`src/commands/memo-topic.js` over the shared `runPostsPageCommand` pipeline and
`MemoDb.getTopicPosts` (`GET /topics/:room/posts`), registered as `memo-topic`.
It reports one page of a topic's posts (with reply and like counts) and
pagination unchanged; the optional viewer filters muted authors. Merged to
`master` at `085e873` (fast-forward; architect code-review commit `405ab072ef`;
the later `085e873` adds only the record and summary, so
`docs/reviews/cli-memo-topic-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `405ab072ef` (unit 370/0, property 68/0, acceptance
all 19 suites, lint ok); language mutation 9 killed / 0 survived
(`memo-topic.js` 2, `memo-db.js` 7); soft Gherkin mutation 26 total / 24 killed
/ 2 intrinsic survivors (viewer-address case); DRY clean. Independent acceptance
check after merge: 12/12 example executions. Architect summary:
`docs/reviews/cli-memo-topic-summary.md`.

Previous session (2026-10-07, `cli-memo-topics`): specified and merged R7, the
topic-list read command. The specifier wrote
`psf-memo-cli/specs/memo-topics.feature` (5 scenarios, 10 example executions);
the coder/refactorer/architect added `src/lib/memo-topics.js` (page defaults and
summary) and a thin `src/commands/memo-topics.js` over the shared read
scaffolding and `MemoDb.getTopics` (`GET /topics`), registered as
`memo-topics`. It reports the paginated topic list (`room`, `postCount`,
`lastSeen`, `followerCount`) in the service's recency order, with pagination
unchanged. The refactorer added `src/lib/page-summary.js` (`formatPageSummary`),
now shared by `memo-feed`, `memo-notifications`, and `memo-topics`. Merged to
`master` at `5559269` (fast-forward; architect code-review commit `ccb7ab8702`;
the later `5559269` adds only the record and summary, so
`docs/reviews/cli-memo-topics-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `ccb7ab8702` (unit 357/0, property 65/0, acceptance
all 18 suites, lint ok); language mutation 11 killed / 0 survived
(`page-summary.js` 1, `memo-topics.js` 1, `memo-db.js` 6, `memo-feed.js` 2,
`memo-notifications.js` 1); soft Gherkin mutation 28 total / 26 killed / 2
intrinsic survivors (exhausted-page limits); DRY clean. Independent acceptance
check after merge: 10/10 example executions. Architect summary:
`docs/reviews/cli-memo-topics-summary.md`.

Previous session (2026-10-07, `cli-memo-posts`): specified and merged R5, the
posts-by-address read command. The specifier wrote
`psf-memo-cli/specs/memo-posts.feature` (6 scenarios, 10 example executions);
the coder/refactorer/architect added `src/lib/memo-posts.js` (flag
parsing/defaults and summary) and a thin `src/commands/memo-posts.js` over the
new shared `src/lib/post-page-command.js` (`memo-feed` now uses it too) and the
new shared `src/lib/address-flag.js`, registered as `memo-posts`. It reports one
page of `GET /posts/by/:addr` (newest first, replies excluded) as
`{ posts, pagination }`. Merged to `master` at `b6d7fac` (fast-forward;
architect code-review commit `382485b5f2`; the later `b6d7fac` adds only the
record and summary, so `docs/reviews/cli-memo-posts-verification.json` is valid
for the merged tree). `verify.sh cli` pass 4/4 at `382485b5f2` (unit 342/0,
property 61/0, acceptance all 17 suites, lint ok); language mutation 6 killed /
0 survived (`memo-posts.js` 1, `memo-profile.js` 5; the new shared modules are
structural-zero); soft Gherkin mutation 22/22 killed (clean); DRY clean.
Independent acceptance check after merge: 10/10 example executions. Architect
summary: `docs/reviews/cli-memo-posts-summary.md`.

Previous session (2026-10-07, `cli-memo-profile`): specified and merged R4, the
composed profile read command. The specifier wrote
`psf-memo-cli/specs/memo-profile.feature` (7 scenarios, 12 example executions);
the coder/refactorer/architect added `src/lib/memo-profile.js` (required `-a`,
page defaults, summary) and a thin `src/commands/memo-profile.js` that composes
the address's name/bio/avatar (`/level/name|profile|profilepic`) with one page
of `GET /posts/by/:addr` and an optional `--viewer` follow state
(`GET /follow/state`); without a viewer the follow state is false. It reports
`{ address, name, bio, avatar, following, posts, pagination }`; SLP tokens are
out of scope (psf-memo-db exposes no token route; R15 covers the wallet's own).
The refactorer extracted `MemoDb.getAddrPage`, the
`resolveFollowing`/`identityField` helpers, and shared identity acceptance
steps. Merged to `master` at `dcf66fd` (fast-forward; architect code-review
commit `78577b1ce6`; the later `dcf66fd` adds only the record and summary, so
`docs/reviews/cli-memo-profile-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `78577b1ce6` (unit 328/0, property 58/0, acceptance
all 16 suites, lint ok); language mutation 15 killed / 0 survived
(`memo-profile.js` lib 5, command 5, `memo-db.js` 5); soft Gherkin mutation 28
total / 17 killed / 11 intrinsic survivors (identity pass-through cells and
exhausted-page limits); DRY clean. Independent acceptance check after merge:
12/12 example executions. Architect summary:
`docs/reviews/cli-memo-profile-summary.md`.

Previous session (2026-10-07, `cli-memo-notifications`): specified and merged
R6, the wallet-relative notifications read command. The specifier wrote
`psf-memo-cli/specs/memo-notifications.feature` (6 scenarios, 11 example
executions); the coder/refactorer/architect added
`src/lib/memo-notifications.js` (pure page defaults and summary) and a thin
`src/commands/memo-notifications.js` over the shared
`initReadCommand`/`runReadCommand`, the F2 wallet source, and
`MemoDb.getNotifications` (`GET /posts/notifications/:addr`), registered as
`memo-notifications`. It reports the wallet address's notifications and the
paginated `{ notifications, pagination }` unchanged. The refactorer extracted
`page-flags.js` (shared with `memo-feed`), `installWalletFactory`, and
`assertReportedTxids`. Merged to `master` at `8446473` (fast-forward; architect
code-review commit `b81b63e225`; the later `8446473` adds only the record and
summary, so `docs/reviews/cli-memo-notifications-verification.json` is valid for
the merged tree). `verify.sh cli` pass 4/4 at `b81b63e225` (unit 309/0, property
54/0, acceptance all 15 suites, lint ok); language mutation 16 killed / 0
survived across `page-flags.js`, `memo-notifications.js` lib+command,
`memo-db.js`, and `memo-feed.js`; soft Gherkin mutation 25/25 killed (clean);
DRY clean. Independent acceptance check after merge: 11/11 example executions.
Architect summary: `docs/reviews/cli-memo-notifications-summary.md`.

Previous session (2026-10-07, `cli-memo-wait`): specified and merged R16, the
poll-until-indexed read command. The specifier wrote
`psf-memo-cli/specs/memo-wait.feature` (6 scenarios, 9 example executions); the
coder/refactorer/architect added `src/lib/memo-wait.js` (pure timing-flag
validation and poll loop) and a thin `src/commands/memo-wait.js` over the shared
`initReadCommand`/`runReadCommand`, registered as `memo-wait`. It polls `GET
/level/post/:txid` immediately, then every `--interval` (default 5000 ms) until
the post appears or `--timeout` (default 60000 ms) elapses; on success it
reports the stored post fields; a timeout is a runtime error (exit 1); a
transport failure aborts on the first poll (exit 1); non-positive or
non-integer timing flags are usage errors (exit 2). The clock (`sleep`/`now`) is
injected. Merged to `master` at `d4ca45a` (fast-forward; architect code-review
commit `e8dfe42aa0`; the later `d4ca45a` adds only the record and summary, so
`docs/reviews/cli-memo-wait-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `e8dfe42aa0` (unit 293/0, property 50/0, acceptance
all 14 suites, lint ok); language mutation 12 killed / 0 survived
(`memo-wait.js` lib 10, command 2); soft Gherkin mutation 12 total / 6 killed /
6 intrinsic survivors (invalid-flag outline equivalents); DRY clean after
extracting `test/support/clock.js`. Independent acceptance check after merge:
9/9 example executions. Architect summary:
`docs/reviews/cli-memo-wait-summary.md`.

Previous session (2026-10-07, `cli-memo-like`): specified and merged W3, the
like/tip write command. The specifier wrote
`psf-memo-cli/specs/memo-like.feature` (10 scenarios, 20 example executions);
the coder/refactorer/architect added `src/lib/memo-like.js` (pure `0x6d04`
prefix, post-txid decode, the 600-sat dust floor / 1-BCH maximum / integer tip
window, the spendable-sat math, and the human summary) and a thin
`src/commands/memo-like.js` over the shared `initWriteCommand`/`runWriteCommand`,
registered as `memo-like`. A like broadcasts `[6d04, post txid (32 LE)]`; an
optional `--tip`/`--author` adds a P2PKH output to the post author. Tip amount
rules (dust floor, maximum, non-integer, missing author) and a malformed post
txid are usage errors (exit 2) with no broadcast; a wallet under 3000 spendable
sats, or a tip above the spendable balance, is reported as an error (exit 1); a
rejected broadcast surfaces the wallet's real error (exit 1). The refactorer
extracted `parseTxidBytesFlag` into `txid-flag.js` (shared with `memo-reply`).
Merged to `master` at `aa617ed` (fast-forward; architect code-review commit
`4a7917472f`; the later `aa617ed` adds only the record and summary, so
`docs/reviews/cli-memo-like-verification.json` is valid for the merged tree).
`verify.sh cli` pass 4/4 at `4a7917472f` (unit 274/0, property 48/0, acceptance
all 13 suites, lint ok); language mutation 17 killed / 2 equivalent survived
(`memo-like.js` lib) plus 4 killed / 1 equivalent (`memo-like.js` command) and
2 killed / 0 survived (`memo-reply.js`); soft Gherkin mutation 36 total / 10
killed / 26 intrinsic survivors; DRY clean after extracting the shared
command-test bodies. Independent acceptance check after merge: 20/20 example
executions. Architect summary: `docs/reviews/cli-memo-like-summary.md`.

Previous session (2026-10-07, `cli-memo-reply`): specified and merged W2, the
first multi-field `psf-memo-cli` write command. The specifier wrote
`psf-memo-cli/specs/memo-reply.feature` (9 scenarios, 14 example executions);
the coder/refactorer/architect added `src/lib/memo-reply.js` (pure `0x6d03`
prefix, 184-UTF-8-byte limit, parent-txid presence/format validation,
little-endian wire encoding, human summary) and a thin
`src/commands/memo-reply.js` over the new shared `src/lib/write-command.js`
(`initWriteCommand`/`runWriteCommand`), which now also backs `memo-post`. A
valid reply broadcasts `[6d03, parent txid (32 LE), text]` through the F3
multi-push scaffolding and reports the txid + `bch.loping.net` explorer link;
missing/empty/over-long text and a missing/malformed parent txid are usage
errors (exit 2) with no broadcast; a rejected broadcast surfaces the wallet's
real error (exit 1). Merged to `master` at `89fe739` (fast-forward; architect
code-review commit `30fdddf0c2`; the later `89fe739` adds only the record and
summary, so `docs/reviews/cli-memo-reply-verification.json` is valid for the
merged tree). `verify.sh cli` pass 4/4 at `30fdddf0c2` (unit 248/0, property
46/0, acceptance all 12 suites, lint ok); language mutation 6 killed / 0
survived (`write-command.js` 2, `memo-reply.js` lib 2, `memo-reply.js` command
1, and the refactored `memo-post.js` command 1); soft Gherkin mutation 21 total
/ 7 killed / 14 intrinsic survivors (self-consistent parent/text/txid and
over-limit equivalents); DRY clean after extracting the shared write-command
unit helpers. Independent acceptance check after merge: 14/14 example
executions. Architect summary: `docs/reviews/cli-memo-reply-summary.md`.

Previous session (2026-10-07, `cli-memo-post`): specified and merged W1, the
first `psf-memo-cli` write command. The specifier wrote
`psf-memo-cli/specs/memo-post.feature` (7 scenarios, 11 example executions); the
coder/refactorer/architect added `src/lib/memo-post.js` (pure `0x6d02` prefix,
217-UTF-16-code-unit limit, flag parsing, human summary) and a thin
`src/commands/memo-post.js` composing the F5 reporter, F2 wallet source, and F3
broadcast scaffolding, plus registration, acceptance steps, unit tests, and
property tests. A valid memo broadcasts `[6d02, text]` and reports the txid +
`bch.loping.net` explorer link; missing/empty/over-long text is a usage error
(exit 2) with no broadcast; a rejected broadcast surfaces the wallet's real
error (exit 1). Merged to `master` at `756747e` (fast-forward; architect
code-review commit `4675901a11`; the later `756747e` adds only the record and
summary, so `docs/reviews/cli-memo-post-verification.json` is valid for the
merged tree). `verify.sh cli` pass 4/4 at `4675901a11` (unit 228/0, property
44/0, acceptance all 11 suites, lint ok); language mutation 5 killed / 0
survived (`memo-post.js` command 3, lib 2); soft Gherkin mutation 15 total / 6
killed / 9 intrinsic survivors (self-consistent text/txid and over-limit
equivalents); DRY clean after consolidating the usage-error tests. Independent
acceptance check after merge: 11/11 example executions. Architect summary:
`docs/reviews/cli-memo-post-summary.md`.

Previous session (2026-10-07, `cli-memo-identity`): specified and merged R15, the
first wallet-relative read command. The specifier wrote
`psf-memo-cli/specs/memo-identity.feature` (6 scenarios, 11 example executions);
the coder/refactorer/architect added `src/lib/memo-identity.js` (pure balance
helpers), `src/commands/memo-identity.js` (composition over read-command +
wallet-source), `MemoDb.getName`/`getProfilePic`, registration, acceptance
steps, unit tests, and property tests. Missing profile documents become empty
fields; a transport failure is exit 1. Merged to `master` at `df32bc0`
(fast-forward; architect code-review commit `a403a53`; the later `df32bc0` adds
only the record and summary, so
`docs/reviews/cli-memo-identity-verification.json` is valid for the merged
tree). `verify.sh cli` pass 4/4 at `a403a53` (unit 211/0, property 42/0,
acceptance 10 suites, lint ok); language mutation 19 killed / 0 survived; soft
Gherkin mutation 26/12 with 14 intrinsic survivors (profile pass-through cells);
DRY clean. Independent acceptance check after merge: 11/11. Architect summary:
`docs/reviews/cli-memo-identity-summary.md`.

Previous session (2026-10-07, `cli-memo-status`): specified and merged R14, the
indexer sync-state read command. The specifier wrote
`psf-memo-cli/specs/memo-status.feature` (3 scenarios, 5 example executions);
the coder/refactorer/architect added `src/lib/memo-status.js` (pure result
shaping), `src/commands/memo-status.js` (flag-less thin subclass of the shared
`src/lib/read-command.js`), `MemoDb.getStatus` for `GET /level/status/status`,
registration, acceptance steps, unit tests, and property tests. A missing status
maps to a named not-found failure (exit 1). Merged to `master` at `a9aa65a`
(fast-forward; architect code-review commit `f842955`; the later `a9aa65a` adds
only the record and summary, so `docs/reviews/cli-memo-status-verification.json`
is valid for the merged tree). `verify.sh cli` pass 4/4 at `f842955` (unit
194/0, property 38/0, acceptance 9 suites, lint ok); language mutation 5 killed
/ 0 survived; soft Gherkin mutation 9/9 intrinsic survivors (self-consistent
status values); DRY clean. Independent acceptance check after merge: 5/5.
Architect summary: `docs/reviews/cli-memo-status-summary.md`.

Previous session (2026-10-07, `cli-memo-get-post`): specified and merged R3, the
single-post read command. The specifier wrote
`psf-memo-cli/specs/memo-get-post.feature` (4 scenarios, 5 example executions)
and resolved the `memo-post` name collision (read = `memo-get-post`, write W1 =
`memo-post`); the coder/refactorer/architect added `src/lib/memo-get-post.js`,
`src/commands/memo-get-post.js`, `MemoDb.getPost`, the shared
`src/lib/txid-flag.js`, registration, acceptance steps, unit tests, and property
tests. A txid with no stored post maps to a named not-found failure (exit 1).
Merged to `master` at `373912d` (fast-forward; architect code-review commit
`e91506a`; the later `373912d` adds only the record and summary, so
`docs/reviews/cli-memo-get-post-verification.json` is valid for the merged
tree). `verify.sh cli` pass 4/4 at `e91506a` (unit 185/0, property 35/0,
acceptance 8 suites, lint ok); language mutation 8 killed / 0 survived
(`memo-thread.js` 4, `memo-db.js` 4; the new modules scan as 0 sites); soft
Gherkin mutation 10/10 killed; DRY clean. Independent acceptance check after
merge: 5/5. Architect summary: `docs/reviews/cli-memo-get-post-summary.md`.

Previous session (2026-10-07, `cli-memo-thread`): specified and merged R2, the
thread read command. The specifier wrote `psf-memo-cli/specs/memo-thread.feature`
(7 scenarios, 9 example executions); the coder/refactorer/architect added
`src/lib/memo-thread.js` (pure flag parsing and result shaping),
`src/commands/memo-thread.js` (thin subclass of the new shared
`src/lib/read-command.js`), `MemoDb.getThread`, registration, acceptance steps,
unit tests, and property tests. A txid with no indexed thread maps to a named
not-found failure (exit 1). Merged to `master` at `8fe83ce` (fast-forward;
architect code-review commit `aa75d60`; the later `8fe83ce` adds only the record
and summary, so `docs/reviews/cli-memo-thread-verification.json` is valid for
the merged tree). `verify.sh cli` pass 4/4 at `aa75d60` (unit 170/0, property
32/0, acceptance 7 suites, lint ok); language mutation 10 killed / 0 survived
(`read-command.js` 1, `memo-thread.js` 5, `memo-db.js` 4); soft Gherkin mutation
6/6 killed; DRY clean. Independent acceptance check after merge: 9/9. Architect
summary: `docs/reviews/cli-memo-thread-summary.md`.

Previous session (2026-10-07, `cli-memo-feed`): specified and merged R1, the first
`memo-*` read command. The specifier wrote `psf-memo-cli/specs/memo-feed.feature`
(6 scenarios, 11 example executions); the coder/refactorer/architect added
`src/lib/memo-feed.js` (pure flag parsing/defaults and result shaping) and
`src/commands/memo-feed.js` (thin wiring over the F1 `MemoDb` client and the F5
reporter), registered the `memo-feed` command, and added the acceptance steps,
unit tests, and property tests. Merged to `master` at `bbf680b` (fast-forward;
architect code-review commit `baf9ca2`; the later `bbf680b` adds only the record
and summary, so `docs/reviews/cli-memo-feed-verification.json` is valid for the
merged tree). `verify.sh cli` pass 4/4 at `baf9ca2` (unit 157/0, property 27/0,
acceptance 6 suites, lint ok); language mutation 9 killed / 0 survived
(`memo-feed.js` command 1, lib 8); soft Gherkin mutation 33/27 with 6 intrinsic
survivors (widened-limit and consistent-viewer equivalents); DRY clean. The
architect also removed a double flag parse (dead `validateFlags` return) in the
command. Independent acceptance check after merge: 11/11. Architect summary:
`docs/reviews/cli-memo-feed-summary.md`.

Previous session (2026-10-07, `cli-wallet-broadcast`): specified and merged
F2/F3, completing the CLI foundation. The specifier wrote
`psf-memo-cli/specs/wallet-source.feature` (4 scenarios) and
`psf-memo-cli/specs/memo-broadcast.feature` (5 scenarios); the
coder/refactorer/architect added `src/lib/wallet-source.js` (exactly one of
`-n`/`--wif`, else `UsageError`), `src/lib/memo-broadcast.js` (pure
`toPushBuffer`/`buildMemoPushes` plus the confined `Script.encode2` patch for
multi-field actions), and the `wallet-util.js` WIF constructor. Merged to
`master` at `d78fb09` (fast-forward; architect code-review commit `c2ab84a`;
the later `d78fb09` adds only the record and summary, so
`docs/reviews/cli-wallet-broadcast-verification.json` is valid for the merged
tree). `verify.sh cli` pass 4/4 at `c2ab84a` (unit 139/0, property 20/0,
acceptance 5 suites, lint ok); language mutation 12 killed / 0 survived
(`wallet-source.js` 2, `memo-broadcast.js` 6, `wallet-util.js` 4); soft Gherkin
mutation memo-broadcast 22/9, wallet-source 8/0, survivors intrinsic round-trip
equivalents; DRY clean. Independent acceptance check after merge: all 5 suites.
Architect summary: `docs/reviews/cli-wallet-broadcast-summary.md`.

Previous session (2026-10-07, `cli-memo-wire-encoding`): specified and merged F4,
the shared Memo OP_RETURN wire-encoding helpers. The specifier wrote
`psf-memo-cli/specs/memo-wire-encoding.feature` (4 scenarios, 10 example
executions); the coder/refactorer/architect added
`psf-memo-cli/src/lib/wire-encoding.js` (`txidToWireBytes` 32-byte little-endian
byte-reversal; `addressToHash160` 20-byte hash160 in display order, not
reversed) with `ecashaddrjs` promoted to a direct dependency, plus the
per-feature acceptance steps. Merged to `master` at `6f5c5ba` (fast-forward;
architect code-review commit `44015a9`; the later `6f5c5ba` adds only the record
and summary, so `docs/reviews/cli-memo-wire-encoding-verification.json` is valid
for the merged tree). `verify.sh cli` pass 4/4 at `44015a9` (unit 121/0,
property 17/0, acceptance 3 suites, lint ok); language mutation 1 killed / 0
survived (`wire-encoding.js`); soft Gherkin mutation 16 considered / 10 killed /
6 malformed-input intrinsic survivors; DRY clean. Independent acceptance check
after merge: memo-wire-encoding 10/10 plus the two existing suites (all 3 passed).
Architect summary: `docs/reviews/cli-memo-wire-encoding-summary.md`.

Earlier session (2026-10-06, `cli-output-contract`): specified and merged F5, the
shared CLI output and exit-code contract. The specifier wrote
`psf-memo-cli/specs/cli-output-contract.feature` (5 scenarios, 10 example
executions); the coder/refactorer/architect added
`psf-memo-cli/src/lib/reporter.js` (pure, injectable; human vs `--json`, stdout
for results, stderr for errors/diagnostics, exit 0/1/2) plus per-feature
acceptance step modules (`acceptance/lib/steps/`). Scenario 6 (unknown option
-> exit 2) was deferred to a later hardening item. Merged to `master` at
`e93afcf` (fast-forward; architect code-review commit `e050713`; the later
`e93afcf` adds only the record and summary, so
`docs/reviews/cli-output-contract-verification.json` is valid for the merged
tree). `verify.sh cli` pass 4/4 at `e050713` (unit 113/0, property 13/0,
acceptance 2 suites, lint ok); language mutation 4 killed / 0 survived
(`reporter.js`); soft Gherkin mutation 10 considered / 0 killed / 10 intrinsic
survivors; DRY clean. Independent acceptance check after merge:
cli-output-contract 10/10 plus memo-db-client 12/12 (all 2 suites). Architect
summary: `docs/reviews/cli-output-contract-summary.md`.

Earlier session (2026-10-06, `cli-memo-db-client`): specified and merged
`cli-memo-db-client` —
F1 of the new `psf-memo-cli` Memo-protocol backlog. The specifier wrote
`psf-memo-cli/specs/memo-db-client.feature` (7 scenarios, 12 example
executions); the coder/refactorer/architect built
`psf-memo-cli/src/lib/memo-db.js`, the `MEMO_DB_URL`/`--db-url` config (default
`https://memo-api.fullstackcash.net`), and — in the same job — the CLI Gherkin
acceptance harness (`psf-memo-cli/acceptance/`), satisfying the F6 decision.
Merged to `master` at `346556f` (fast-forward; architect code-review commit
`c881811`; the later `9491580`/`346556f` commits are docs-only, so
`docs/reviews/cli-memo-db-client-verification.json` is valid for the merged
tree). `verify.sh cli` pass 4/4 at `c881811` (unit 99/0, property 10/0,
acceptance 1 suite / 12 scenarios, lint ok); language mutation 6 killed / 0
survived; soft Gherkin mutation 23 considered / 12 killed / 11 intrinsic
survivors; DRY clean. Independent acceptance check after merge: 12/12 example
executions. Routing brief: `psf-memo-cli/dev-docs/feature-backlog.md`; architect
summary: `docs/reviews/cli-memo-db-client-summary.md`.

Earlier session (2026-10-06): routed and merged `cli-quality-hardening` — the
newly added `psf-memo-cli` component (forked from `psf-bch-wallet`) was renamed,
given CRAP/mutation/DRY tooling, and hardened before feature work. Baseline was
red: CRAP exit 2 (`SendTokens.validateFlags` 9.0), 4 exact DRY duplicates, 50
killed / 23 survived / 0 uncovered. The refactorer extracted
`src/lib/token-balances.js`, `flag-validator.js`, `send-command.js`, and
`bind-methods.js`, added a property suite, and made `pretest` provision
`.wallets`; the architect decoupled `SendTokens` from the `WalletBalance`
command, fixed misleading error labels, added `property` to the `cli`
verification entry, and killed every survivor. Final: CRAP exit 0 (max 6.0),
DRY no duplicates, mutation 49 killed / 0 survived / 0 uncovered, unit 84
passing / 100% coverage, property 4/4, lint clean. Merged to `master` at
`e1fc6f0` (fast-forward; architect code-review commit `7997339`; the later
`e1fc6f0` adds only the record and summary, so
`docs/reviews/cli-quality-hardening-verification.json` is valid for the merged
tree). Independent check after merge: unit 84 passing, property 4/4, CRAP exit
0. Routing brief: `psf-memo-cli/dev-docs/quality-baseline.md`; architect
summary: `docs/reviews/cli-quality-hardening-summary.md`.

Earlier session (2026-10-02): specified and merged `feed-pagination-scroll` —
the `/posts/recent` feed now scrolls to the top whenever a page loads (the Next
or Previous buttons) or the active Recent/Following tab changes, so the viewer
starts at the first post of the new page. The scroll is decided by the pure
`FeedTabsPage` coordinator through an injected `scrollToTop` adapter (no-op by
default); the React posts view wires `window.scrollTo({ top: 0, left: 0 })`.
Client-only; no DB/indexer change. Spec:
`psf-memo-client/specs/feed-pagination-scroll.feature` (4 scenarios, 7 example
executions). Merged to `master` at `ffb063f` (merge commit; architect review
commit `181709a7e0`; the later `b7476d7` adds only the record and summary, so
`docs/reviews/feed-pagination-scroll-verification.json` is valid for the merged
tree). Independent acceptance check after merge: 7/7 example executions.
`verify.sh client` pass 5/5 at `181709a7e0` (unit 759/0, property 212/0,
acceptance 47 suites, lint ok, build ok); language mutation 22 killed / 0
survived (`feed-tabs-page.js`); soft Gherkin mutation 14 total / 9 killed / 5
intrinsic survivors (self-consistent example values, gotcha #12 class); max CC
and CRAP 5.0. Architect summary:
`docs/reviews/feed-pagination-scroll-summary.md`.

Current `master` HEAD: `0541746` (`Record cli-command-reference architect review and verification`).
Historical note — `mute-persistence` (merged at
`04275c4`): the DB record `docs/reviews/mute-persistence-verification.json`
names the architect code-review commit `5de0ab1`; the later tip `04275c4` adds
only the record and summary, so the record is valid for the merged tree
(extends #38). `mute-persistence` fixed the live bug where the indexer's
`POST /level/mute` returned 404 because `ENTITY_CONFIG` had no `mute` route, so
no mute was ever persisted and the `/posts/recent?viewer=` filter saw an empty
store. The fix registers `mute` against `mutesDb`; covered by controller unit
tests, a generic entity-CRUD property test, and Gherkin acceptance that drives
the real entity route registry. `verify.sh db` pass 4/4 at `5de0ab1` (unit
458/0, property 71/0, acceptance 24 suites, lint ok); language mutation 3/3 on
`crud-handlers.js`; soft Gherkin mutation 24 total / 8 killed / 16 intrinsic
survivors; max CC 1 / CRAP 1.0. Architect summary:
`docs/reviews/mute-persistence-summary.md`. After the merge the specifier ran
only the merged feature's acceptance test as the independent check (6/6
examples). Backfill of the already-lost mutes was explicitly dropped (it needs a
chain re-scan); re-mute from the client after deploy.

The previously unrecorded `profile-post-rendering` feature (merged at `43b4f74`;
record `docs/reviews/profile-post-rendering-verification.json` names review
commit `5076f07`) is now recorded in the backlog. `verify.sh client` pass 5/5 at
`5076f07` (unit 636/0, property 178/0, acceptance 42 suites, lint ok, build ok);
language mutation 0 mutable sites (`profile-post-content.js`); soft Gherkin
mutation 35 total / 33 killed / 2 intrinsic survivors; max CC 1 / CRAP 1.0.
Architect summary: `docs/reviews/profile-post-rendering-summary.md`.

`master` still carries four human commits made outside the swarm pipeline -
`f7809d0` (feed-page button styling), `477c1c1` (recent-profiles page info),
`ea67979` (removed the redundant inline author name from feed posts), and
`8eab46d` (Notifications entry CSS/layout). None is covered by a Gherkin spec;
reconcile if a future feature touches those surfaces.

Also open (specifier cleanup, not blocking): `FollowingFeedPage.emptyBecauseNoFollows`
and `psf-memo-client/specs/following-feed.feature` now describe the retired
`/posts/following` surface; retire them when a future feature touches the
following feed. The architect also logged the two copy-confirmation
implementations (#53) as an accepted, documented tradeoff.

Next action: **ask the user for the next feature.** The active backlog is
`psf-memo-cli/dev-docs/feature-backlog.md` (Memo-protocol CLI commands). The
foundation (F1, F5, F4, F2/F3) and the entire read set (**R1 `memo-feed`**,
**R2 `memo-thread`**, **R3 `memo-get-post`**, **R4 `memo-profile`**, **R5
`memo-posts`**, **R6 `memo-notifications`**, **R7 `memo-topics`**, **R8
`memo-topic`**, **R9 `memo-search`**, **R10 `memo-profiles`**, **R11
`memo-following`/`memo-followers`**, **R12 `memo-muted`**, **R13 `memo-poll`**,
**R14 `memo-status`**, **R15 `memo-identity`**, **R16 `memo-wait`**) are done,
and the write commands **W1 `memo-post`**, **W2 `memo-reply`**, **W3
`memo-like`**, **W4 `memo-name`**, **W5 `memo-bio`**, **W6 `memo-avatar`**,
**W7 `memo-follow`/`memo-unfollow`**, **W8 `memo-mute`/`memo-unmute`**,
**W9 `memo-topic-post`**, and **W10
`memo-topic-follow`/`memo-topic-unfollow`** are done. The poll writes
**W11–W13** were dropped by user decision (2026-10-08). Cross-cutting item
**X1 (command reference docs)** is now DONE (merged at `0541746`), so the
remaining suggested work is the cross-cutting hardening series **X2–X7** in
`psf-memo-cli/dev-docs/feature-backlog.md`, starting with **X2 (error
surfacing)**. The earlier client direction (front-end improvements to
`psf-memo-client`) remains open in `specs/feature-backlog.md`.
Run `swarmforge/scripts/state.sh` to refresh the HEAD lines.
