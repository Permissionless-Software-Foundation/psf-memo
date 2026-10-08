# cli-command-reference — Architect Review

**By architect.**

**Task:** `cli-command-reference` (X1: `psf-memo-cli` command reference docs)
**Component:** `psf-memo-cli` (Markdown only)
**Verified tree / merged refactorer tip:** `81b160ec42`
**Verification record:** `docs/reviews/cli-command-reference-verification.json`
(`git_sha` `81b160ec42`)

## Commits reviewed

The `swarmforge-refactorer` one-item `BATCH` carried two specifier housekeeping
commits, the X1 spec, and the coder documentation. The architect branch
fast-forwarded `c46a728 -> 81b160e`.

| Commit | Role | Summary |
|--------|------|---------|
| `1e5f7ae` | specifier | Record `cli-topic-writes` completion in the backlog and briefing |
| `c1bc154` | specifier | Drop CLI poll writes W11–W13 from the backlog |
| `e234914` | specifier | Specify CLI command reference docs (X1) (`psf-memo-cli/dev-docs/command-reference.md`) |
| `fd4858e` | coder | Document the `psf-memo-cli` command reference (X1) (`README.md`, `src/commands/README.md`) |
| `81b160e` | refactorer | Merge coder `cli-command-reference` into refactorer (no code change) |

The review produced no code change; this summary and the verification record are
the only architect commit.

## Architectural review

This is a documentation-only increment: `git diff --name-only c46a728..81b160e`
contains only Markdown (`psf-memo-cli/README.md`,
`psf-memo-cli/src/commands/README.md`,
`psf-memo-cli/dev-docs/command-reference.md`,
`psf-memo-cli/dev-docs/feature-backlog.md`, `specs/feature-backlog.md`,
`specifier-prompt.md`). No production source, test, acceptance step, or spec
file changed, so there is no UI/core, dependency-direction, information-hiding,
or coupling risk to review. The docs sit in the delivery/documentation layer and
add no runtime dependency.

I verified the completed documentation against the source rather than relying on
the coder's summary:

1. **Command inventory is complete and correct.** All 30 `memo-*` commands in
   the `dev-docs/command-reference.md` inventory are documented in `README.md`
   (17 reads, 13 writes), each with a usage example; `src/commands/README.md`
   indexes the same 30. No command registered in `psf-memo-cli.js` is missing
   from either doc.
2. **Flags and defaults match the commander declarations.** Every required and
   optional flag, the `-l/--limit` 50 and `-o/--offset` 0 page defaults, the
   `memo-wait` 60000 ms / 5000 ms timing defaults, and the wallet-source rule
   (`-n` XOR `--wif`, else exit 2) match `psf-memo-cli.js`, `page-flags.js`,
   `memo-wait.js`, and `wallet-source.js`.
3. **JSON data keys match the command data objects.** Read keys were checked
   against each command's `format`/outcome (`posts`/`pagination`, `post`,
   `status`, `notifications`, `topics`, `profiles`, `following`, `followers`,
   `muted`, `poll`, and the composed `memo-profile`/`memo-identity` fields); write
   keys (`txid`, `explorerUrl`) match `write-command.js`; the
   `{ message, ...data }` success / `{ error }` stderr failure / exit 0/1/2
   contract matches `reporter.js`.
4. **Protocol limits match the flag parsers.** `217` UTF-16 code units for
   `memo-post`; `184` UTF-8 bytes + 32-byte LE txid for `memo-reply`; tip window
   `600–100000000` sats with `--author` required for `memo-like`; `77` bytes for
   `memo-name`; `217` bytes for `memo-bio`/`memo-avatar`; 20-byte hash160 in
   display order for the four state writes; `214` combined bytes for
   `memo-topic-post`; and the shared `-r` room requirement for
   `memo-topic-follow`/`memo-topic-unfollow`.
5. **The `total` cap and endpoint claims are real.** The documented
   `total` ≤ 500 cap corresponds to `TOTAL_SCAN_CAP = 500` in
   `psf-memo-db/src/adapters/post-query.js`; the production endpoint
   `https://memo-api.fullstackcash.net` and the `--db-url > MEMO_DB_URL >
   default` order match `src/lib/memo-db.js` and `.env.example`
   (`MEMO_DB_URL` is documented there with the production default).

No documentation errors were found, so no fixes were applied.

**Accepted observation — stale status line in the X1 spec.** `psf-memo-cli/dev-docs/command-reference.md`
still reads `**Status:** awaiting user approval to hand off.` The X1 work has
since been approved and delivered. This is the specifier-owned spec document, so
I left it for the specifier to retire on merge rather than editing another
role's artifact; it is the only follow-up I noted.

## Verification

Because the diff contains no JavaScript and no Gherkin, the code-analysis tools
have nothing to select:

- **Language mutation (`mutate4javascript`): not applicable.** No production or
  test `.js` file changed, so there are no mutation sites.
- **DRY (`dry4javascript`): not applicable.** No JavaScript changed; there are no
  task-local duplicate candidates to reduce.
- **Soft Gherkin acceptance mutation (`gherkin-mutator --level soft`): not
  applicable.** No `.feature` changed and no runtime behavior changed, exactly as
  the X1 spec directs (`dev-docs/command-reference.md` checklist item 6).
- **Cyclomatic complexity / CRAP:** no code changed.

**Suite status** (`verify.sh cli`, record `81b160ec42`): unit **568 passing**,
property **110 pass / 0 fail**, acceptance **all 35 suites passed**, lint
**ok** — result **pass (4/4)**.

## Handoffs sent

- `git_handoff` to `specifier`, task `cli-command-reference`, commit `81b160ec42`
  (the verified refactorer tip; end-of-chain merge notification). This
  summary/record commit is the review commit the specifier merges. No coder or
  refactorer follow-up work was required.
