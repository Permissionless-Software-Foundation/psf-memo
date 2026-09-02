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
Goal: reach feature parity with [memo.cash](https://memo.cash).

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

### Prioritized roadmap

| Tier | Features | Status |
|------|----------|--------|
| **P0** | Post, Set name, Reply, Efficient pagination | ✅ shipped |
| **P1** | Like counts (read side) ✅; client display ✅; Set profile text ✅; Set profile picture ✅; Follow/Unfollow ✅ | ✅ shipped |
| **P2** | Topics (list ✅, feed ✅, post/follow/unfollow) | next |
| **P3** | Polls (create, add option, vote) | ✅ shipped (task `poll-actions`) |
| **P4** | Mute / unmute user | later |
| **P5** | Send money memo action, MIP-0009 token exchange | later |
| **P6** | Repost, ranked feed, notifications, search, tags, following feed | later |

**Suggested next spec:** P2.3/P2.4/P2.5 — add a topic post composer and topic
follow/unfollow buttons on the topic feed page that broadcast `0x6d0c`/
`0x6d0d`/`0x6d0e`, plus the DB read side (topic follow state, topic followers).
The indexer already stores topic messages and follows in `roomsDb`; the missing
pieces are the client write path and the DB read side for follows.

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

- Clone the Acceptance Pipeline Spec fresh (do NOT rely on cached/stale copies):
  ```bash
  mkdir -p tmp && cd tmp
  git clone https://github.com/unclebob/Acceptance-Pipeline-Specification.git aps
  ```
  Temp files go in the worktree's `./tmp/`, never `/tmp`.
- Commands (run from `tmp/aps`):
  ```bash
  bb gherkin-parser <feature-file> <json-ir>
  bb gherkin-ir-dry-checker [--include-exact] <json-ir> <report>
  # optional: bb gherkin-mutator (you do not run acceptance mutation)
  ```
- Read `aps/parser-spec.md` and `aps/ir-dry-checker-spec.md`.
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
2. **Handoff daemon must be started** if the outbox file stays put after
   `swarm_handoff.sh`.
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

---

## 11. Handoff to next session

At the end of each session, update this file:

- Mark features completed in the backlog (`specs/feature-backlog.md`).
- Add any new gotchas to §9.
- Note the current `master` HEAD commit.
- State the next feature to work on.

Current `master` HEAD: `4422372` (merge of the architect's second-pass hardening of the Following feed — P6.6 — verified: client build/test/lint and DB test/lint all pass).
Next action: **P6.3 Notifications** — the Gherkin spec is drafted at `psf-memo-client/specs/notifications.feature` (8 scenarios, parsed clean, DRY-checked) and is awaiting user approval before handoff to the coder. After approval, commit it (`By specifier.`), invent the stable task name `notifications`, and send the `git_handoff` to the coder. Send money (P5.1) was skipped by user decision (no clear use case). Remaining candidates after notifications: P5.2–5.5 (MIP-0009 token exchange), P6.1 Repost, P6.2 Ranked feed, P6.5 Tags/hashtags.
