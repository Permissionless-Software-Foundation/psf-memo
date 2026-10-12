# Architect review — `cli-default-db-endpoint`

**Role**: architect
**Task**: `cli-default-db-endpoint` (F8, `psf-memo-cli` only)
**Batch**: CLI hygiene batch `20261012T235120Z_000001` (item 3 of 3)
**Reviewed commits**: `7adff00` (specifier, feature) → `9d94759` (coder, point
production at `api.blippost.com`) → `ab01237`/`de0de1d` (specifier/coder merges)
→ `6a1da71` (refactorer, dedupe the env-override unit cases)
**Merge**: `9357b50` (merge `6a1da71ab2` into `swarmforge-architect`)
**Review commit**: `fcaa333` (shared batch review)
**Verification record**: `docs/reviews/cli-default-db-endpoint-verification.json`
(`git_sha` `fcaa333eb72a4a8a87746e140ee765e757e236dd`)

## Scope

The production memo-db endpoint default changes from
`https://memo-api.fullstackcash.net` to `https://api.blippost.com` in
`src/lib/memo-db.js`, with the matching docs, `.env.example`, and
`specs/memo-db-client.feature` updates. The `--db-url` flag > `MEMO_DB_URL` env
> production-default precedence in `resolveMemoDbUrl` is unchanged.

## Architectural findings

- **The production change is a one-line constant with the precedence intact.**
  `DEFAULT_MEMO_DB_URL` is the single source of the default; `resolveMemoDbUrl`
  is untouched, so the flag/env precedence and its tests are unaffected.
- **The refactorer's dedup is a good local cleanup.** Two near-identical
  "should honor the <env> override" unit tests collapse into a parameterized
  `ENV_OVERRIDES` table that maps env var, cache-busting query key, value, and
  config field. It keeps the fresh-module import per case and the environment
  save/restore, and it is easier to extend. No production code changed in this
  commit.
- **The endpoint is still covered end to end.** `memo-db-client.feature`
  scenario 1 asserts the default; the config unit test asserts the resolved
  field. Scenario 1 is a plain scenario (inline literal, no `Examples`), so
  soft mutation cannot mutate the URL itself.

## Verification

### Language mutation (`mutate4javascript --max-workers 8`)
| File | Total | Selected | Killed | Survived |
|------|-------|----------|--------|----------|
| `src/lib/memo-db.js` | 13 | 13 | 13 | 0 |

The differential pass selected 0 sites because a constant edit does not change
any function hash; `mutate-file.sh` re-ran all 13 with `--mutate-all`. All
killed.

### DRY (`dry4javascript`, scoped to the changed files)
```
No duplicate candidates found.
```

### Soft Gherkin acceptance mutation (`gherkin-mutator --level soft --workers 8`)
| Feature | Total | Killed | Survived | Errors |
|---------|-------|--------|----------|--------|
| `specs/memo-db-client.feature` | 23 | 12 | 11 | 0 |

Scenario 2 was skipped from the tool's manifest (previously killed clean). The
11 survivors are intrinsic setup/assertion or flag-precedence equivalents, not
implementation gaps:

- **Scenario 3** (2): mutating `env_url` survives because the `--db-url` flag
  wins, so the environment value never reaches the assertion.
- **Scenario 4** (4): mutating the fixture `count` or a `limit` larger than the
  served page leaves the same `shown` result.
- **Scenario 5** (3): the `viewer` cell and the fixture `count` are used on both
  the setup and assertion sides, so both move together.
- **Scenario 6** (1): the missing-profile `addr` is used to seed the empty
  service and to issue the read, so the mutation moves both sides.

No implementation gap is implied; the tool rewrote its manifest to keep only
the clean scenario and leaves the equivalent scenarios to re-mutate next run.

### Canonical suite (`verify.sh cli`, at `fcaa333`)
| Command | Result |
|---------|--------|
| unit | 705 passing |
| property | 162 pass / 0 fail |
| acceptance | all 47 acceptance suites passed |
| lint | ok |

`result: pass (4/4)`. Record:
`docs/reviews/cli-default-db-endpoint-verification.json`.

## Handoffs sent

- End-of-chain `git_handoff` → specifier (merge `swarmforge-architect` into
  `master`), task `cli-default-db-endpoint`, batch commit `fcaa333`.
