# cli-secret-hygiene — Architect Review

**By architect.**

**Task:** `cli-secret-hygiene` (X3: secret hygiene)
**Component:** `psf-memo-cli`
**Merged refactorer tip:** `3808494291`
**Architect review commit:** `08c6178137` (tool-written mutation manifests)
**Verification record:** `docs/reviews/cli-secret-hygiene-verification.json`
(`git_sha` `08c6178137`)

## Commits reviewed

The `swarmforge-refactorer` one-item `BATCH` carried the X2 completion record,
the X3 spec, the coder fix, and the refactorer consolidation. The architect
branch fast-forwarded `5be373d -> 3808494`.

| Commit | Role | Summary |
|--------|------|---------|
| `524da0b` | specifier | Record `cli-error-surfacing` (X2) completion and merge |
| `6a7c7b6` | specifier | Specify secret hygiene (X3) — `specs/secret-hygiene.feature` (3 scenarios: sweep, wallet-relative JSON, wallet-list) |
| `23fd692` | coder | Keep swept private keys out of `wallet-sweep` output; add the acceptance steps and two unit regressions |
| `e33150e` | refactorer | Merge coder `cli-secret-hygiene` into refactorer |
| `3808494` | refactorer | Share the `captureConsole` test helper (`test/support/capture.js`), removing three swap-and-restore copies |

The architect review commit `08c6178137` carries only the tool-written
`mutate4javascript` / acceptance-mutation manifests; no production behavior
changed during review.

## Architectural findings and fixes applied

1. **The one real leak is fixed at the output boundary (good).** `wallet-sweep`
   echoed the swept WIF in its success line
   (`` `BCH successfully swept from private key ${flags.wif}` ``); the new line
   names no key material. Because the prefix is a plain string and the txid and
   explorer link remain, the command still reports everything a user needs. The
   fix is where the leak was — the command's display path — not in a shared
   helper, so there is no new coupling.

2. **No other command prints key material (verified).** I swept the command and
   lib output paths: `wallet-create` prints only the name/description (its
   wallet-data log is commented out), `wallet-list` prints name + description,
   `wallet-addrs` prints public addresses, `wallet-balance` prints balances and
   token tickers/ids, `msg-sign` prints the address/message/signature, and the
   `memo-*` reads/writes report only public data. No mnemonic, WIF, or raw
   wallet JSON reaches stdout or stderr.

3. **The acceptance step layer stays a thin adapter (good).** The new
   `acceptance/lib/steps/secret-hygiene.js` runs the real `wallet-sweep`,
   `wallet-list`, and `memo-following` commands with fake wallets/Memo DB clients
   and a recording console, then asserts absence/presence. It is registered in
   `handlers.js` alongside the other step modules and depends only on the shared
   `resolveTemplate` helper, so the feature is declarative Gherkin over reusable
   steps.

4. **Shared console-capture helper (refactorer, good).** `captureConsole` moved
   into `test/support/capture.js` and is reused by the acceptance step and both
   new unit tests, removing three copies of the `console.log`/`console.error`
   swap-and-restore boilerplate. Tests remain in `test/unit`, helpers in
   `test/support`, and acceptance steps in `acceptance/lib/steps`.

5. **No fixes needed.** The change is a one-line behavior fix plus regression
   tests; DRY found no task-local duplication.

**Accepted observation — negative assertions are value-independent.** The X3
scenarios assert that output *does not contain* the secret. That makes the soft
Gherkin mutations of the secret example values intrinsic survivors (see
Verification): mutating the example WIF/mnemonic keeps both the setup and the
negative assertion consistent, so no mutant can be distinguished. This is the
correct shape for a "never print X" guarantee — the unmutated scenario is itself
the regression guard (it fails if the command starts echoing the key) — not an
implementation gap. The feature is deliberately not chased for kills.

## Verification

**Language mutation** (`mutate4javascript`, `--max-workers 8`):

| File | Killed | Survived | Uncovered |
|------|-------:|---------:|----------:|
| `src/commands/wallet-sweep.js` | 2 | 0 | 0 |

The two covered sites are pre-existing; the string-literal fix adds no mutation
site, but the module-hash change reselected and re-killed both.

**DRY** (`dry4javascript`, scoped to the changed production file, the shared
`capture.js` helper, the two changed unit tests, the new acceptance step module,
and `handlers.js`): **no duplicate candidates found.**

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`,
`secret-hygiene.feature`): **10 mutations, 0 killed, 10 survived, 0 errors.** All
survivors are intrinsic: the `wif`/`mnemonic` case changes survive the negative
`does not contain` assertions, and the `name`/`txid` case changes survive because
the mutated value is used consistently on both the setup and assertion sides.
The tool wrote an empty `scenarios:[]` manifest to the new feature; committed
as-is.

**Suite status** (`verify.sh cli`, record `08c6178137`): unit **572 passing**
(two new secret-hygiene regressions), property **110 pass / 0 fail**, acceptance
**all 36 suites passed** (the new `secret-hygiene` feature included), lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-secret-hygiene`, commit `08c6178137`
  (end-of-chain merge notification; no coder or refactorer follow-up work was
  required).
