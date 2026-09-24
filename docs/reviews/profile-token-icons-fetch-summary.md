# Profile Token Icons Fetch — Architect Review

**By architect.**

## Task and commits reviewed

- Task: `profile-token-icons-fetch` (refactorer handoff
  `merge_and_process refactorer cf278d32d5`, delivered as a one-item `BATCH`).
- Merged `swarmforge-refactorer` (fast-forward from the architect HEAD
  `2e6de9b`). Commits:
  - `b8fc10f` Record profile-token-icons completion in backlog and briefing
    (specifier/master)
  - `6f8d409` Clarify profile token icon mutable-data retrieval
    (specifier/master)
  - `12def3d` Resolve profile token icons through the shared IPFS mutable-data
    fetch (coder)
  - `cf278d3` Extract mutable-data record resolution and add property tests
    (refactorer)
- Architect review commit: `073b1e78b9` — one mutation-killing unit test and the
  tool-written `mutate4javascript` / `gherkin-mutator` manifests. No production
  behavior changed.
- Records/summary commit: this commit.

The `/profile/:addr` token icons now resolve each token's mutable data the same
way the `/slp-tokens` page does: `getTokenData` -> read the `ipfs://`
mutable-data URI -> `wallet.cid2json` -> choose the `tokenIcon`, or an http
`fullSizedUrl` when the record carries one. The profile page no longer prefers
`getTokenData2`; a token whose mutable data is already a resolved record is
still accepted. The new `src/services/token-mutable-data.js` owns that
resolution and the icon-field precedence, and the `/slp-tokens` page now uses
the shared helpers instead of its private `parseCid`/inline precedence copy.
Still a read-only rendering feature: no Memo broadcast, no DB change.

## Architectural review

- **UI/Core separation (good).** The new service is a small, coherent
  `token-mutable-data` seam: two pure decisions (`parseMutableDataCid`,
  `tokenIconFromMutableData`) plus injected-wallet resolution
  (`resolveTokenMutableData`, private `resolveMutableDataRecord`). It takes the
  wallet as a parameter rather than importing IO, so it runs under plain
  `node --test`. The view model and controller stay free of framework/browser
  APIs.
- **Dependency rule (good).** `profile-token-icons.js` (pure) imports the pure
  `tokenIconFromMutableData`; `profile-page.js` imports the resolver; the
  `/slp-tokens` JSX shell imports the parse/icon helpers. All dependencies point
  inward at the shared service; no JSX/IO leaks back into the view model.
- **Information hiding and encapsulation (good).** `resolveMutableDataRecord`
  is private; the shared surface is exactly the pure parsing/precedence helpers
  and the token resolver. The controller's per-token failure isolation and the
  fallback shapes stay private.
- **Local code quality (good).** The refactorer split the `ipfs://` resolution
  out of `resolveTokenMutableData` so both helpers sit at the CRAP target; the
  controller's `_withMutableData` delegates to the shared resolver and keeps
  per-token error isolation. Max CC 6 / CRAP 6.0.
- **Accepted tradeoff — loose http check (documented, not changed).**
  `tokenIconFromMutableData` prefers a `fullSizedUrl` when
  `fullSizedUrl.includes('http')` (unanchored, case-sensitive). This preserves
  the pre-existing `/slp-tokens` check that the task deliberately unified,
  rather than the profile's previous anchored `/^https?:\/\//i`. Real
  mutable-data records carry absolute `http(s)` URLs, and the acceptance, unit,
  and property tests pin the current contract; tightening it would change the
  `/slp-tokens` behavior the task was asked to share and is out of scope.
- **Accepted tradeoff — pure decisions share a module with injected IO
  (documented, not changed).** `token-mutable-data.js` holds both pure helpers
  and the wallet-resolution function. Splitting the pure part into its own
  module would add an indirection for two consumers of a 60-line cohesive
  service; the IO is fully injected and testable.

## Fixes applied

- **Mutation survivor killed (test hardening).**
  `ProfilePage._withMutableData` guards
  `!this.tokenSource || typeof this.tokenSource.getTokenData !== 'function'`.
  Because `loadTokenIcons` already returns early when there is no token source,
  the `!this.tokenSource` operand masks the `getTokenData` check, so a mutated
  `|| -> &&` would attempt `getTokenData` on a wallet that lacks it. Added a
  direct unit test asserting `_withMutableData` returns the same token array
  untouched when the wallet cannot fetch mutable data. Re-run: 41 killed / 0
  survived / 0 uncovered.
- **Tool-written metadata.** `mutate4javascript` manifests for
  `src/services/token-mutable-data.js` (new),
  `src/services/profile-token-icons.js`, and `src/services/profile-page.js`,
  plus the refreshed `gherkin-mutator` manifest/stamp on
  `specs/profile-token-icons.feature`.

## Verification results

Record (pinned to the review commit `073b1e78b9`):

| File | Component |
|------|-----------|
| `docs/reviews/profile-token-icons-fetch-verification.json` | psf-memo-client |

- **Language mutation** (`swarmforge/scripts/mutate-file.sh <file>
  --max-workers 8`, one file at a time, differential with automatic
  `--mutate-all` re-run on under-selection):
  - `src/services/token-mutable-data.js`: **7 killed, 0 survived, 0
    uncovered**.
  - `src/services/profile-token-icons.js`: **2 killed, 0 survived, 0
    uncovered**.
  - `src/services/profile-page.js`: **41 killed, 0 survived, 0 uncovered**
    (after the hardening test; the first run was 40 killed / 1 survived / 0
    uncovered).
  - The JSX shells (`src/components/app-body/slp-tokens/index.js`,
    `src/components/app-body/profile/index.js`) remain excluded:
    `mutate4javascript` cannot parse JSX (no plugin), as in prior reviews; their
    behavior is exercised end-to-end through acceptance.
- **DRY** (`dry4javascript`, scoped):
  - production (`token-mutable-data.js`, `profile-token-icons.js`,
    `profile-page.js`): **"No duplicate candidates found."**
  - `src/components/app-body/slp-tokens/index.js`: **"No duplicate candidates
    found."**
  - tests (`test/unit/token-mutable-data.test.js`,
    `test/unit/profile-page-tokens.test.js`,
    `test/property/token-mutable-data.property.test.js`,
    `test/property/profile-token-icons.property.test.js`): **"No duplicate
    candidates found."**
  - `acceptance/lib/handlers.js`: 102 pre-existing boilerplate duplicates
    (unchanged); the changed wallet-fake and fixture regions (lines ~112-130
    and ~775-795) participate in no candidate.
- **Cyclomatic complexity / CRAP** (`crap4javascript` on the three changed
  production files, 100% coverage): max **CC 6 / CRAP 6.0**
  (`resolveMutableDataRecord`, `tokenIconFromMutableData`);
  `ProfilePage.loadTokenIcons` CC 5; `_withMutableData`/`_broadcastMute` CC 4;
  `parseMutableDataCid`/`resolveTokenMutableData` and the rest ≤ 3. Exit 0
  (threshold 8.0).
- **Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft
  --workers 8`, run from `tmp/aps` with the client runner worker and `--json`):
  - `psf-memo-client/specs/profile-token-icons.feature`: **18 total, 18 killed,
    0 survived, 0 errors.**
  - The tool's soft level reuses clean manifest entries without consulting the
    implementation hash, so the first run on the delivered feature skipped all
    18 mutations (`skipped_scenarios=5, skipped_mutations=18`). To obtain
    independent evidence for the changed resolution path, the same tool was run
    on an identical copy at a different path (forcing `feature_path` mismatch);
    that fresh run killed all 18. The real feature's manifest/stamp was
    refreshed by the tool and committed.
- **Suite status**: `verify.sh client` **result: pass (5/5)** at `git_sha
  073b1e78b9`:
  - unit **618 pass / 0 fail** (617 delivered; +1 hardening test)
  - property **168 pass / 0 fail**
  - acceptance **all 41 generated suites passed** (the `profile-token-icons`
    suite now resolves mutable data through `cid2json`)
  - lint ok
  - build ok

## Handoffs

- End-of-chain `git_handoff` to `specifier` (priority 50) to merge
  `swarmforge-architect` into `master`, using this records/summary commit
  `073b1e78b9`.
- No coder/refactorer follow-up handoff: the review produced no production
  behavior change, only a hardening test and tool-written
  mutation/acceptance metadata.
