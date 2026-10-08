# Commands

All commands should follow the same structure:
- async **run()** is the primary execution function. This function shoudl always include a try/catch handler to report errors. 
- **validateFlags()** should run first and preform input validation on input flags.

## Output and exit codes

New `memo-*` commands adopt the shared reporter in `src/lib/reporter.js` so
every command has one machine-readable interface:

- Human mode prints a readable result to stdout; `--json` prints exactly one
  JSON object to stdout (`{ "message": ..., ...fields }`).
- Failures print the real error on stderr -- as `{ "error": ... }` in JSON mode.
  Diagnostics always go to stderr, never to stdout.
- Exit codes: `0` success, `1` runtime/validation failure, `2` usage failure
  (missing or invalid required flags).

A command returns `{ message, data }`, and `runCommand` turns that into output
plus an exit code:

```js
import { runCommand, UsageError } from '../lib/reporter.js'

async run (flags) {
  process.exitCode = await runCommand(async () => {
    // ... do the work ...
    return { message: 'Read 3 posts', data: { posts } }
  }, { json: flags.json })
}
```

A missing required flag throws a `UsageError` (from `reporter.js`) so the
process exits `2`; any other thrown error exits `1`.

Read commands reflect indexed state only: a `memo-*` write returns its `txid`
as soon as the wallet broadcasts, but the action is not readable until it is
confirmed and indexed by `psf-memo-indexer`. `memo-wait` is the shared bridge
for the post store (`GET /level/post/:txid`); for other actions, wait for the
containing block with `memo-status` and re-run the read. See
[README.md → Async visibility](../../README.md#async-visibility) for the full
contract.

## Memo command index

Every `memo-*` command and its contract. Reads have no action byte; writes
broadcast one Memo action prefix. See `README.md` for the shared wallet-source,
`--db-url`, page-flag, and exit-code details, and for a usage example per
command.

### Memo reads

Route/behavior and JSON data keys per read command. `--db-url <url>` and
`--json` are optional on all reads. Usage examples:
[README.md → Memo Read Commands](../../README.md#memo-read-commands).

| Command | Required flags | JSON data keys |
|---------|----------------|----------------|
| `memo-feed` | — | `posts`, `pagination` |
| `memo-thread` | `-t/--txid` | `post` |
| `memo-get-post` | `-t/--txid` | `post` |
| `memo-status` | — | `status` |
| `memo-identity` | `-n/--name` or `--wif` | `address`, `bchBalance`, `tokens`, `name`, `bio`, `avatar` |
| `memo-wait` | `-t/--txid` | `post` |
| `memo-notifications` | `-n/--name` or `--wif` | `notifications`, `pagination` |
| `memo-profile` | `-a/--addr` | `address`, `name`, `bio`, `avatar`, `following`, `posts`, `pagination` |
| `memo-posts` | `-a/--addr` | `posts`, `pagination` |
| `memo-topics` | — | `topics`, `pagination` |
| `memo-topic` | `-r/--room` | `posts`, `pagination` |
| `memo-search` | `-q/--query` | `posts`, `profiles`, `pagination` |
| `memo-profiles` | — | `profiles`, `pagination` |
| `memo-following` | `-n/--name` or `--wif` | `following` |
| `memo-followers` | `-a/--addr` | `followers` |
| `memo-muted` | `-n/--name` or `--wif` | `muted` |
| `memo-poll` | `-t/--txid` | `poll` |

### Memo writes

Every write also requires a wallet source (`-n/--name` or `--wif`), accepts
`--json`, and returns `txid` and `explorerUrl`. Usage examples:
[README.md → Memo Write Commands](../../README.md#memo-write-commands).

| Command | Action byte | Required flags | JSON data keys |
|---------|-------------|----------------|----------------|
| `memo-post` | `0x6d02` | `-m/--memo` | `txid`, `explorerUrl` |
| `memo-reply` | `0x6d03` | `-t/--txid`, `-m/--memo` | `txid`, `explorerUrl` |
| `memo-like` | `0x6d04` | `-t/--txid` (`--author` with `--tip`) | `txid`, `explorerUrl` |
| `memo-name` | `0x6d01` | `-m/--memo` | `txid`, `explorerUrl` |
| `memo-bio` | `0x6d05` | `-m/--memo` | `txid`, `explorerUrl` |
| `memo-avatar` | `0x6d0a` | `-u/--url` | `txid`, `explorerUrl` |
| `memo-follow` | `0x6d06` | `-a/--addr` | `txid`, `explorerUrl` |
| `memo-unfollow` | `0x6d07` | `-a/--addr` | `txid`, `explorerUrl` |
| `memo-mute` | `0x6d16` | `-a/--addr` | `txid`, `explorerUrl` |
| `memo-unmute` | `0x6d17` | `-a/--addr` | `txid`, `explorerUrl` |
| `memo-topic-post` | `0x6d0c` | `-r/--room`, `-m/--memo` | `txid`, `explorerUrl` |
| `memo-topic-follow` | `0x6d0d` | `-r/--room` | `txid`, `explorerUrl` |
| `memo-topic-unfollow` | `0x6d0e` | `-r/--room` | `txid`, `explorerUrl` |
