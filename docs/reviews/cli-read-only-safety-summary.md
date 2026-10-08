# cli-read-only-safety — Architect Review

**By architect.**

**Task:** `cli-read-only-safety` (X4: read-only safety)
**Component:** `psf-memo-cli`
**Merged refactorer tip:** `38e1696c5b`
**Architect review commit:** `5b54942f3b` (tool-written mutation manifests)
**Verification record:** `docs/reviews/cli-read-only-safety-verification.json`
(`git_sha` `5b54942f3b`)

## Commits reviewed

The `swarmforge-refactorer` one-item `BATCH` carried the X3 completion record,
the X4 spec, the coder characterization tests, and the refactorer
consolidation. The architect branch merged `38e1696` (and `master` through
`c9ac4ff`) into a review base at `c0169e8`.

| Commit | Role | Summary |
|--------|------|---------|
| `cd84ba4` | specifier | Record `cli-secret-hygiene` (X3) completion and merge |
| `c9ac4ff` | specifier | Specify read-only safety (X4) — `specs/read-only-safety.feature` (6 scenarios: feed, status, viewer-address feed, profile, wallet-relative notifications, missing wallet) |
| `8cc1a13` | coder | Pin wallet-independent reads: `memo-feed`/`memo-status`/`memo-profile` unit tests, recording-resolver acceptance steps, address-page encoding fix |
| `9f8c573` | refactorer | Merge coder `cli-read-only-safety` into refactorer |
| `38e1696` | refactorer | Reuse the shared acceptance wallet factory (recording each resolution); drop the bespoke resolver and per-step `walletUtil` wiring |
| `c0169e8` | architect | Merge refactorer `cli-read-only-safety` into architect |
| `5b54942` | architect | Tool-written mutation manifests (review commit) |

The architect review commit `5b54942f3b` carries only the tool-written
`mutate4javascript` / acceptance-mutation manifests; no production behavior
changed during review.

## Architectural findings and fixes applied

1. **The wallet boundary is pinned by construction (good).** A read command can
   only touch a wallet through `resolveWalletSource`/`walletUtil`; among the
   read commands only `memo-identity` and `memo-notifications` instantiate a
   `WalletUtil`, and every other read (`memo-feed`, `memo-status`,
   `memo-profile`, `memo-thread`, `memo-topics`, …) never references it. X4 was
   already satisfied by the module layout, so this task is the characterization
   lock that keeps it satisfied — no new abstraction was introduced to enforce
   it.

2. **The acceptance harness now injects the wallet resolver once (good,
   refactorer).** `acceptance/lib/read-command.js` supplies
   `walletUtil: world.walletUtil` to every read command by default, and the four
   per-step `{ walletUtil: world.walletUtil }` overrides were removed. This is
   the key structural improvement: a read command that wrongly resolves a wallet
   is now observable in *every* read feature, not only the ones that opted in.
   The wiring has a single point of change and the explicit `...options` spread
   still lets a caller override.

3. **The shared wallet factory doubles as the recording resolver (good).**
   `installWalletFactory` counts each resolution in `world.walletResolverCalls`
   instead of a bespoke read-only-safety resolver. The counter is generic
   instrumentation on the one path all wallet resolution must cross, so the
   feature asserts on it without duplicating resolution logic. DRY confirmed the
   step layer has no task-local duplicate.

4. **Address-page assertion now matches the client's encoding (correctness
   fix).** `assertAddressPageRequest` compares
   `/posts/<path>/${encodeURIComponent(addr)}`. Production
   `src/lib/memo-db.js` encodes every address path segment
   (`getPostsByAddr` -> `encodeURIComponent(addr)`), so without the fix a
   cash address's colon would never match the recorded request. The assertion
   now tracks the real wire form; the colon-bearing address examples in the new
   feature exercise it.

5. **No production behavior change and no task-local fixes needed.** The change
   is a pure test/acceptance lock plus one assertion correctness fix; the unit
   tests live in `test/unit/commands`, the acceptance steps in
   `acceptance/lib/steps`, and both use the shared `test/support/capture.js` and
   `acceptance/lib/read-command.js` helpers, preserving the testable-module
   boundary. The only review churn was tool-written manifests.

**Accepted observation — soft survivors are intrinsic.** The X4 scenarios mutate
single characters of example addresses/wallet names that are used consistently
on both the setup and assertion sides, so no mutant can be distinguished. This
is the established intrinsic-equivalent class (process notes) and is not an
implementation gap.

## Verification

**Language mutation** (`mutate4javascript`, `--mutate-all --max-workers 8`; the
task changed no production file, so the manifest is hash-stable and a
differential run would select nothing — `--mutate-all` validates that the new
tests kill the read-command sites):

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/commands/memo-feed.js` (0 sites) | 0 | 0 | 0 |
| `src/commands/memo-status.js` | 1 | 0 | 0 |
| `src/commands/memo-profile.js` | 5 | 0 | 0 |
| `src/commands/memo-notifications.js` | 1 | 0 | 0 |
| **Total** | **7** | **0** | **0** |

The tool refreshed the `tested_at` field of the three manifests (hashes
unchanged; no mutant source left applied) — committed as-is.

**DRY** (`dry4javascript`, scoped to the changed production files' tests, the
shared acceptance runner/factory, the six changed acceptance step modules, and
the new unit test): **no duplicate candidates found.**

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`,
`read-only-safety.feature`): **8 mutations, 0 killed, 8 survived, 0 errors.** All
survivors are single-character case changes of example values (`viewer1`,
`viewer2`, and two cash addresses) used on both the setup and assertion sides —
intrinsic equivalents, consistent with the notes. The tool wrote the expected
empty `scenarios:[]` manifest to the feature; committed as-is.

**Suite status** (`verify.sh cli`, record `5b54942f3b`): unit **577 passing**
(five new read-only-safety tests), property **110 pass / 0 fail**, acceptance
**all 37 suites passed** (the new `read-only-safety` feature included), lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-read-only-safety`, final tip below
  (end-of-chain merge notification; no coder or refactorer follow-up work was
  required).
