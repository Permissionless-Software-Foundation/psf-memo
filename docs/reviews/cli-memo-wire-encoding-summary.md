# cli-memo-wire-encoding — Architect Review

**Task:** `cli-memo-wire-encoding` (F4: the shared Memo OP_RETURN wire-encoding helpers)
**Component:** `psf-memo-cli`
**Architect review commit:** `44015a9`
**Verification record:** `docs/reviews/cli-memo-wire-encoding-verification.json` (`git_sha` `44015a9`)

## Commits reviewed

The `swarmforge-refactorer` batch carried the specifier's F4 spec plus the
coder implementation and the refactorer's broadening:

| Commit | Author | Summary |
|--------|--------|---------|
| `6378f6d` | specifier | Specify the Memo wire encoding helpers (F4) — `specs/memo-wire-encoding.feature` |
| `ae6c457` | coder | Add `src/lib/wire-encoding.js`, `ecashaddrjs`, and the acceptance steps |
| `a1a7a50` | refactorer | Reduce wire-encoding step duplication and broaden rejection properties |

`f3ced6b` (specifier, records the previous task) was already on `master`. The
architect branch fast-forwarded `e93afcf -> a1a7a50`.

## Architectural findings and fixes applied

No structural changes were needed; the incoming work already respects the
boundaries established in the prior review and matches the established
patterns:

1. **Leaf purity and information hiding (good).** `src/lib/wire-encoding.js`
   exposes only `txidToWireBytes` and `addressToHash160`, hiding `Buffer`,
   endianness, and `ecashaddrjs` behind a clear malformed-input contract. It is
   a pure, dependency-injected-free leaf that unit and property suites exercise
   directly.
2. **Step-handler cohesion (good).** The coder placed the new steps in
   `acceptance/lib/steps/wire-encoding.js` and registered it in `handlers.js`
   with a one-line composition change, exactly the per-feature layout introduced
   in the preceding review — no further splitting required.
3. **Dependency hygiene (good).** `ecashaddrjs@1.0.7` was already present
   transitively; the coder correctly promoted it to a direct `dependencies`
   entry rather than relying on a transitive install.
4. **Regression guard (good).** The `hash160` scenarios and the explicit
   "does not byte-reverse" unit case guard the endianness bug class (gotcha
   #32); the property suite round-trips random hash160s and pins wire order and
   round-trip invariants.

Only the tool-written mutation manifests required committing.

## Verification

**Language mutation** (`mutate4javascript`, differential, `--max-workers 8`):
`src/lib/wire-encoding.js` **1 killed / 0 survived / 0 uncovered** (the
`|| -> &&` guard on line 16).

**DRY** (`dry4javascript`, scoped to the new production module, step module,
and unit/property tests): **no duplicate candidates found**.

**Soft Gherkin acceptance mutation** (`gherkin-mutator --level soft --workers 8`)
on `specs/memo-wire-encoding.feature`: **16 mutations, 10 killed, 6 survived,
0 errors**. Scenarios 1 (txid → wire bytes) and 3 (address → hash160) have
separate input and expected columns, so all 10 of their example-value mutations
are killed and both are recorded in the manifest. The 6 survivors are genuine
equivalents in the rejection scenarios: mutating a malformed txid/address
preserves its malformed property, so the "reports an invalid …" step still
holds. Documented, not chased, per the standing precedent.

**Suite status** (`verify.sh cli`, record `44015a9`): unit **121 passing / 100%
statements-branches-functions-lines**, property **17 pass / 0 fail**,
acceptance **3 suites (memo-db-client + cli-output-contract +
memo-wire-encoding) passed**, lint clean — **pass 4/4**.

## Handoffs sent

- End-of-chain `git_handoff` to the **specifier** for task
  `cli-memo-wire-encoding`; review commit `44015a9`.
- No follow-up work identified for the coder or refactorer.

By architect.
