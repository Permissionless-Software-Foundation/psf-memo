# cli-memo-notifications — Architect Review

**Task:** `cli-memo-notifications` (R6: read the wallet address's notifications)
**Component:** `psf-memo-cli`
**Architect review commit:** `b81b63e225`
**Verification record:** `docs/reviews/cli-memo-notifications-verification.json`
(`git_sha` `b81b63e225`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's feature spec, the
coder implementation, and the refactorer's consolidation:

| Commit | Author | Summary |
|--------|--------|---------|
| `e1a2c8a` | specifier | Specify the memo-notifications read command (`specs/memo-notifications.feature`, 6 scenarios) |
| `b83bc23` | coder | Implement the command (`memo-notifications.js` lib + command, shared `page-flags.js`, `MemoDb.getNotifications`, acceptance steps, unit + property tests) |
| `f6edacf` | refactorer | Extract `installWalletFactory` (read-command.js) and `assertReportedTxids` (read-result.js), add a default-wallet-util unit case |

The architect branch fast-forwarded `d4ca45a -> f6edacf`, then added review
commit `b81b63e225` (shared request-recording test helper and tool-written
manifests).

## Architectural findings and fixes applied

1. **Read command that also needs a wallet (good, accepted).** `memo-notifications`
   composes the shared `initReadCommand`/`runReadCommand` scaffolding with the
   shared `resolveWalletSource` and the pure `memo-notifications.js` helpers,
   rather than growing `read-command.js` with wallet concerns. `WalletUtil` is
   injected, so the command stays testable without a wallet file or network.

2. **Shared page-flag parsing (good).** `parseNonNegativeInteger` moved to
   `page-flags.js`; `memo-feed` and `memo-notifications` now share the validation
   and its exact usage message. This is the same kind of consolidation as
   `txid-flag.js`, and it lowers duplication without changing behavior.

3. **DB client method (good).** `MemoDb.getNotifications` is a thin client method
   that URL-encodes the address and passes `limit`/`offset` as query parameters,
   keeping the HTTP shape in the adapter and the page defaults in the pure
   helper.

4. **Shared acceptance helpers (good).** `installWalletFactory` (read-command.js)
   removes the duplicated scenario-wallet factory from `memo-identity` and
   `memo-notifications`; `assertReportedTxids` (read-result.js) removes the
   duplicated joined-txid assertion from `memo-feed` and `memo-notifications`.

5. **DRY fix applied.** `dry4javascript` flagged a score-0.84 duplicate between
   the new `getNotifications` default-page test and the existing `getRecentPosts`
   default-page test — both repeated the file's request-recording client
   boilerplate. Extracted a local `recordingClient(response)` helper and routed
   both tests through it. Re-run: no duplicate candidates.

## Verification

**Language mutation** (`mutate4javascript`, one file at a time, `--max-workers
8`, `--mutate-all` for the new modules and the changed `memo-db`/`memo-feed`
function sets). All sites killed; a follow-up `--scan` confirmed
`Changed mutation sites: 0` and `Manifest exists: true` for all five.

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/lib/page-flags.js` | 5 | 0 | 0 |
| `src/lib/memo-notifications.js` | 2 | 0 | 0 |
| `src/commands/memo-notifications.js` | 1 | 0 | 0 |
| `src/lib/memo-db.js` | 5 | 0 | 0 |
| `src/lib/memo-feed.js` | 3 | 0 | 0 |

The mutation suite runs `npm test` (unit only), so the property tests do not
contribute kills; the shared `page-flags.js` is fully killed because the
existing `memo-feed` unit tests already cover the absent/empty/zero branches
(`undefined`, `null`, `''`, `'0'`). The source diffs in the review commit are
the tool-written refreshed manifests.

**DRY** (`dry4javascript`, scoped to the changed production modules, the shared
acceptance/step modules, and the new unit/property tests): initially flagged the
request-recording pair; after extraction the re-run reports **no duplicate
candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`
on `specs/memo-notifications.feature`): **25 mutations, 25 killed, 0 survived, 0
errors**. The page-size/offset outline (16 mutations) and the per-notification
type/actor outline (9 mutations) are all observable through the joined-txid and
pagination assertions, so the tool wrote a clean manifest with a
`# mutation-stamp`.

**Suite status** (`verify.sh cli`, record `b81b63e225`): unit **309 passing**,
property **54 pass / 0 fail**, acceptance **all 15 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-memo-notifications`, commit
  `b81b63e225` (end-of-chain merge notification; no coder/refactorer follow-up
  work was required).
