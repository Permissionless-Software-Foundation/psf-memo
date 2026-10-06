# cli-output-contract — Architect Review

**Task:** `cli-output-contract` (F5: the shared CLI output and exit-code contract)
**Component:** `psf-memo-cli`
**Architect review commit:** `e050713`
**Verification record:** `docs/reviews/cli-output-contract-verification.json` (`git_sha` `e050713`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's F5 spec plus the
coder implementation and the refactorer's follow-up:

| Commit | Author | Summary |
|--------|--------|---------|
| `afd394b` | specifier | Specify the CLI output and exit-code contract (F5) — `specs/cli-output-contract.feature` |
| `a9d05e4` | coder | Add `src/lib/reporter.js` and the output-contract acceptance handlers |
| `f522775` | refactorer | Reduce reporter property gaps and acceptance-handler duplication |

`ec7c3d9` (specifier, records the previous task) was already on `master`.
The architect branch fast-forwarded `346556f -> f522775`.

## Architectural findings and fixes applied

1. **Step-handler module mixed two unrelated features (fixed).** The coder
   added the output-contract step handlers into the existing
   `acceptance/lib/handlers.js`, which until then only served the Memo DB
   client feature, and dispatched them via a concatenated second array inside
   one `handleStep`. That is a growing god-module for step definitions.
   Split it into per-feature modules:
   - `acceptance/lib/steps/memo-db.js` — Memo DB client steps (and its
     `makePosts` fake-service data).
   - `acceptance/lib/steps/output-contract.js` — reporter steps, the JSON
     parsing helper, and the command runner.
   - `acceptance/lib/step-support.js` — the `resolveParam` example-row helper
     shared by both.
   `handlers.js` now owns only the scenario world (the fake fetch and the
   command outcome) and step dispatch. `runtime.js`/`runner-worker.js` are
   unchanged.

2. **Duplicated capture stream (fixed).** `handlers.js` defined `captureStream`
   while `reporter.unit.js` defined an identical `capture` sink, a
   `dry4javascript` score-1.00 duplicate. Extracted one
   `test/support/capture.js` and imported it from the unit, property, and
   acceptance suites.

3. **Duplicated error tests (fixed).** `Reporter.fail`/`Reporter.usage` and the
   `runCommand` runtime/usage tests repeated the same four blocks; converted
   both to table-driven loops. DRY is now clean.

4. **Exit-code constants were mutation-equivalent (fixed).** Soft mutation of
   `reporter.js` left the `EXIT_SUCCESS = 0` and `EXIT_FAILURE = 1` initializers
   alive because every test referenced the exported constant symbolically, so a
   mutated constant also mutated the expected value. Added an explicit contract
   test pinning `EXIT_SUCCESS/FAILURE/USAGE` to literal `0/1/2`; all 4 reporter
   mutations now die.

Structure reviewed: `src/lib/reporter.js` is a pure, injectable leaf module
(no framework or terminal coupling) that owns the documented 0/1/2 contract;
the acceptance harness composes it without touching real streams.

## Verification

**Language mutation** (`mutate4javascript`, differential with automatic
`--mutate-all` re-run, `--max-workers 8`): `src/lib/reporter.js`
**4 killed / 0 survived / 0 uncovered** (lines 13, 14, 26, 57).

**DRY** (`dry4javascript`, scoped to the changed production module, step
modules, support helper, and tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`)
on `specs/cli-output-contract.feature`: **10 mutations, 0 killed, 10 survived,
0 errors**. Every survivor is an intrinsic equivalent: each example's
`message`/`error` string is substituted into *both* the command setup and the
assertion, so a mutated string is self-consistent (easing the documented
precedent for read-only/round-trip features). The feature's distinguishing
power lies in its fixed structural steps (exit code, JSON single-object shape,
stdout/stderr channel), which soft example mutation does not perturb. The
mutator wrote the expected `"scenarios":[]` manifest. `memo-db-client.feature`
kept its prior manifest and its suite still passes; it was not re-mutated.

**Suite status** (`verify.sh cli`, record `e050713`): unit **113 passing / 100%
statements-branches-functions-lines**, property **13 pass / 0 fail**,
acceptance **2 suites (memo-db-client + cli-output-contract) passed**, lint
clean — **pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task
  `cli-output-contract`; review commit `e050713`.
- No follow-up work identified for the coder or refactorer.

By architect.
