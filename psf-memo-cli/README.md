# psf-memo-cli

This is the `psf-memo-cli` command-line wallet for Bitcoin Cash (BCH) and SLP
tokens, used by the `psf-memo` mono-repo.

It is forked from the Permissionless Software Foundation
[psf-bch-wallet](https://github.com/Permissionless-Software-Foundation/psf-bch-wallet)
v3 command-line wallet.

## Installation

This software requires node.js v20 or higher. This package lives inside the
`psf-memo` mono-repo:

- `cd psf-memo-cli`
- `npm install`
- `cp .env.example .env`

Customize the .env file to suite your needs. The defaults should work.


## Usage

### Display Help

- `node psf-memo-cli.js help`

### Wallet Commands

#### Create a Wallet

Create a new BCH wallet:

- `node psf-memo-cli.js wallet-create -n wallet1 -d "My first wallet"`

##### Arguments
- Use the `-n` flag to give your wallet a name (required).
- And the `-d` flag to give it a description (optional).


#### List Wallets

List the wallets managed by this application:

- `node psf-memo-cli.js wallet-list`

##### Arguments:
- none


#### Wallet Addresses

Display the addresses for receiving funds to this wallet:

- `node psf-memo-cli.js wallet-addrs -n wallet1`

##### Arguments:

- Use the `-n` flag to specify which wallet to use (required).


#### Wallet Balance

Check the balance of BCH and SLP tokens held by this wallet.

- `node psf-memo-cli.js wallet-balance -n wallet1`

##### Arguments:

- Use the `-n` flag to specify the wallet to check (required).


### Send Cryptocurrency

Use these commands to send BCH and SLP tokens.

#### Send BCH

Send BCH from the wallet to another address.

- `node psf-memo-cli.js send-bch -n wallet1 -q 0.00001 -a bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl`

##### Arguments:
- Use the `-n` flag to specify the wallet holding BCH (required).
- Use the `-q` flag to specify the quantity to send in BCH (required).
- Use the `-a` flag to specify the receiver of the BCH (required).


#### Send SLP Tokens

Send an SLP token from the wallet to another address.

- `node psf-memo-cli.js send-tokens -n wallet1 -q 0.5 -a simpleledger:qrnwvazrjzytmlv9wyvj4pkkc9k2l0fhvs8u479asy -t 38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0`

##### Arguments:
- Use the `-n` flag to specify the wallet holding tokens (required).
- Use the `-q` flag to specify the quantity of tokens to send (required).
- Use the `-a` flag to specify the receiver of the tokens (required).
- Use the `-t` flag to specify the token ID of the token to send (required).


### Cryptography

Use these commands to sign a message to prove ownership of a BCH address, and conversely to verify that a signature is valid.

#### Sign Message

Sign a message with the private key of a wallet.

- `node psf-memo-cli.js msg-sign -n wallet1 -m "test message"`

##### Arguments:
- Use the `-n` flag to specify the wallet holding tokens (required).
- Use the `-m` flag to specify a message to sign (required).

#### Verify Signature

Use a signed message to verify that the send possess the private key associated
with the public address.

- `node psf-memo-cli.js msg-verify -a bitcoincash:qr2zqrnqdulfmeqs2qe9c5p605lrwe90v5v735s2jl -m "This is a test message" -s IOdfv+TQNCNIEJ4uvcUJmX9ZCEbkNNv9ad+TLO/JJxzeWDhqx42iBXMPEnthldl9wGx/Fwdjwp1w9532mSXzENM=`

##### Arguments:
- Use the `-a` flag to specify the BCH address you are verifying ownership of (required).
- Use the `-m` flag to specify the clear text message that was signed (required).
- Use the `-s` flag to specify the signature to be verified (required).


## Memo Protocol Commands

The `memo-*` commands read from and write to the Memo protocol. Reads go
through the read-only `psf-memo-db` REST API; writes broadcast BCH
OP_RETURN transactions through the wallet. Every command is
non-interactive and machine-readable so an agent can chain commands and parse
results without screen-scraping.

### Shared contracts

- Invocation: `node psf-memo-cli.js <command> [flags]`.
- `--json` prints exactly one JSON object to stdout; without it, a
  human-readable summary is printed.
- Success JSON: `{ "message": "<summary>", ...data }` — `message` plus the
  command's data fields.
- Failure JSON: `{ "error": "<message>" }`, printed to stderr. Diagnostics
  never go to stdout.
- Exit codes: `0` success, `1` runtime/not-found failure, `2` usage (missing or
  invalid required flag). A broadcast failure surfaces the wallet's real error
  (exit `1`), never a generic message.
- Wallet source: wallet-relative commands require exactly one of
  `-n, --name <wallet>` or `--wif <wif>`; neither or both is exit `2`.
- DB endpoint: `--db-url <url>` overrides `MEMO_DB_URL`; the default is the
  production endpoint `https://memo-api.fullstackcash.net` (local dev:
  `http://localhost:5021`).
- Page flags: `-l, --limit <number>` (default `50`) and `-o, --offset <number>`
  (default `0`). The service pagination object
  `{ limit, offset, total, hasMore }` is passed through unchanged. `total` is
  capped at `500`, so do not treat it as an exact count beyond the cap.
- Read-only safety: read commands do not touch a wallet unless viewer-relative
  data is requested, so a missing wallet file does not break `memo-feed` or
  `memo-status`.

### Async visibility

Memo writes are asynchronous: a write command returns as soon as the wallet
broadcasts the OP_RETURN, but the action is not readable until it is confirmed
and indexed.

- **Writes return before the action is visible.** Every `memo-*` write command
  reports `{ message, txid, explorerUrl }` (explorer link
  `https://bch.loping.net/tx/<txid>`) as soon as the wallet accepts the
  transaction. The `txid` is real, but nothing has been stored yet.
- **Reads reflect indexed state only.** Read commands query `psf-memo-db`,
  which `psf-memo-indexer` populates. A just-broadcast action is absent from
  `memo-feed`, `memo-thread`, `memo-get-post`, `memo-profile`, `memo-posts`,
  `memo-search`, `memo-topic`, `memo-notifications`, and the other reads until
  the transaction is confirmed in a BCH block and the indexer has processed
  that block. There is no read-after-write consistency: an immediate read is
  expected to miss the action.
- **Check the indexer with `memo-status`.** It reports `startBlockHeight`,
  `syncedBlockHeight` (the last fully indexed block), and `chainBlockHeight`
  (the chain tip at the last sync), so you can tell whether the indexer has
  reached the block containing the transaction.
- **Wait for the post with `memo-wait`.** `memo-wait -t <txid>` queries
  `GET /level/post/:txid` immediately, then every `--interval` (default 5000
  ms) until the post is stored, and reports it (exit 0). A timeout is a runtime
  error (exit 1); the default `--timeout` budget is 60000 ms. It polls the post
  store only, so it waits for posts (`0x6d02`) and replies (`0x6d03`). Other
  actions (like, follow/unfollow, name, bio, avatar, topic) have no post
  document: wait for the containing block with `memo-status`, then re-run the
  relevant read command.
- **Scriptable write → index → read:**

  ```sh
  txid=$(node psf-memo-cli.js memo-post -n wallet1 -m "hello memo" --json | jq -r .txid)
  node psf-memo-cli.js memo-wait -t "$txid" --timeout 600000 --json
  node psf-memo-cli.js memo-get-post -t "$txid" --json
  ```

  Use a long `--timeout` because BCH confirmation plus indexing can exceed the
  60 s default.

### Memo Read Commands

Read commands never broadcast. `--db-url <url>` and `--json` are optional on
all of them.

| Command | Required flags | Optional flags | JSON data fields |
|---------|----------------|----------------|------------------|
| `memo-feed` | — | `-l/--limit` (50), `-o/--offset` (0), `--viewer` | `posts`, `pagination` |
| `memo-thread` | `-t/--txid` | — | `post` |
| `memo-get-post` | `-t/--txid` | — | `post` |
| `memo-status` | — | — | `status` |
| `memo-identity` | `-n/--name` or `--wif` | — | `address`, `bchBalance`, `tokens`, `name`, `bio`, `avatar` |
| `memo-wait` | `-t/--txid` | `--timeout` (60000 ms), `--interval` (5000 ms) | `post` |
| `memo-notifications` | `-n/--name` or `--wif` | `-l/--limit` (50), `-o/--offset` (0) | `notifications`, `pagination` |
| `memo-profile` | `-a/--addr` | `--viewer`, `-l/--limit` (50), `-o/--offset` (0) | `address`, `name`, `bio`, `avatar`, `following`, `posts`, `pagination` |
| `memo-posts` | `-a/--addr` | `-l/--limit` (50), `-o/--offset` (0) | `posts`, `pagination` |
| `memo-topics` | — | `-l/--limit` (50), `-o/--offset` (0) | `topics`, `pagination` |
| `memo-topic` | `-r/--room` | `--viewer`, `-l/--limit` (50), `-o/--offset` (0) | `posts`, `pagination` |
| `memo-search` | `-q/--query` | `--viewer`, `-l/--limit` (50), `-o/--offset` (0) | `posts`, `profiles`, `pagination` |
| `memo-profiles` | — | `-l/--limit` (50), `-o/--offset` (0) | `profiles`, `pagination` |
| `memo-following` | `-n/--name` or `--wif` | — | `following` |
| `memo-followers` | `-a/--addr` | — | `followers` |
| `memo-muted` | `-n/--name` or `--wif` | — | `muted` |
| `memo-poll` | `-t/--txid` | — | `poll` |

`tokens` entries are `{ ticker, tokenId, qty }`.

Examples (one per command):

```sh
node psf-memo-cli.js memo-feed --limit 10 --json
node psf-memo-cli.js memo-thread -t <txid> --json
node psf-memo-cli.js memo-get-post -t <txid> --json
node psf-memo-cli.js memo-status --json
node psf-memo-cli.js memo-identity -n wallet1 --json
node psf-memo-cli.js memo-wait -t <txid> --timeout 60000 --interval 5000 --json
node psf-memo-cli.js memo-notifications -n wallet1 --limit 10 --json
node psf-memo-cli.js memo-profile -a <addr> --viewer <addr> --json
node psf-memo-cli.js memo-posts -a <addr> --limit 10 --json
node psf-memo-cli.js memo-topics --limit 10 --json
node psf-memo-cli.js memo-topic -r general --viewer <addr> --json
node psf-memo-cli.js memo-search -q memo --limit 10 --json
node psf-memo-cli.js memo-profiles --limit 10 --json
node psf-memo-cli.js memo-following -n wallet1 --json
node psf-memo-cli.js memo-followers -a <addr> --json
node psf-memo-cli.js memo-muted -n wallet1 --json
node psf-memo-cli.js memo-poll -t <txid> --json
```

### Memo Write Commands

Every write command also requires a wallet source (`-n/--name` or `--wif`),
accepts `--json`, and reports `{ txid, explorerUrl }` as JSON data. The
explorer link is `https://bch.loping.net/tx/<txid>`.

| Command | Action byte | Required flags | Optional flags | Protocol limit |
|---------|-------------|----------------|----------------|----------------|
| `memo-post` | `0x6d02` | `-m/--memo` | — | ≤ 217 UTF-16 code units |
| `memo-reply` | `0x6d03` | `-t/--txid`, `-m/--memo` | — | 32-byte LE txid + ≤ 184 UTF-8 bytes |
| `memo-like` | `0x6d04` | `-t/--txid` | `--tip`, `--author` | 32-byte LE txid; `--tip` 600–100000000 sats, `--author` required with `--tip` |
| `memo-name` | `0x6d01` | `-m/--memo` | — | ≤ 77 UTF-8 bytes |
| `memo-bio` | `0x6d05` | `-m/--memo` | — | ≤ 217 UTF-8 bytes |
| `memo-avatar` | `0x6d0a` | `-u/--url` | — | ≤ 217 UTF-8 bytes |
| `memo-follow` | `0x6d06` | `-a/--addr` | — | 20-byte hash160 (display order, not reversed) |
| `memo-unfollow` | `0x6d07` | `-a/--addr` | — | 20-byte hash160 |
| `memo-mute` | `0x6d16` | `-a/--addr` | — | 20-byte hash160 |
| `memo-unmute` | `0x6d17` | `-a/--addr` | — | 20-byte hash160 |
| `memo-topic-post` | `0x6d0c` | `-r/--room`, `-m/--memo` | — | room + message ≤ 214 UTF-8 bytes combined |
| `memo-topic-follow` | `0x6d0d` | `-r/--room` | — | topic room name |
| `memo-topic-unfollow` | `0x6d0e` | `-r/--room` | — | topic room name |

Write commands that reference a transaction (`memo-reply`, `memo-like`) write
the txid in little-endian wire order. All multi-field writes are one OP_RETURN
push per field.

Examples (one per command):

```sh
node psf-memo-cli.js memo-post -n wallet1 -m "Hello Memo" --json
node psf-memo-cli.js memo-reply -n wallet1 -t <txid> -m "Nice post" --json
node psf-memo-cli.js memo-like -n wallet1 -t <txid> --tip 1000 --author <addr> --json
node psf-memo-cli.js memo-name -n wallet1 -m "Alice" --json
node psf-memo-cli.js memo-bio -n wallet1 -m "Memo fan" --json
node psf-memo-cli.js memo-avatar -n wallet1 -u https://example.com/a.png --json
node psf-memo-cli.js memo-follow -n wallet1 -a <addr> --json
node psf-memo-cli.js memo-unfollow -n wallet1 -a <addr> --json
node psf-memo-cli.js memo-mute -n wallet1 -a <addr> --json
node psf-memo-cli.js memo-unmute -n wallet1 -a <addr> --json
node psf-memo-cli.js memo-topic-post -n wallet1 -r general -m "Hello topic" --json
node psf-memo-cli.js memo-topic-follow -n wallet1 -r general --json
node psf-memo-cli.js memo-topic-unfollow -n wallet1 -r general --json
```


## Testing and Quality

- Run unit tests with coverage: `npm test`
- Run the linter: `npm run lint`
- Run the CRAP metric analyzer: `npm run crap`
- Run the DRY (duplicate) analyzer: `npm run dry`
- Run mutation testing on one file: `npm run mutate -- src/commands/send-bch.js`

CRAP and mutation runs write to `target/`, which is git-ignored.


## Change History

This package was forked from `psf-bch-wallet` v3. That upstream project's v2
became too large in scope and the code base grew too complex. The code was also
stuck in CommonJS format. Version 3 uses ESM format, and strives to create a
much simpler code base, which can be forked to add on new use-cases and thereby
grow in scope in a more controlled fashion.

v2 also used the [oclif CLI framework](https://oclif.io/), which no longer provides good support for JavaScript-native software. v3 has switched to the [Commander.js](https://github.com/tj/commander.js/) library.
