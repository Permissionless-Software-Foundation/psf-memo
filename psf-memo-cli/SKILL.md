---
name: psf-memo-cli
description: Use psf-memo-cli as an agent interface to the Memo.cash social network on Bitcoin Cash — create/read wallets, publish and read posts, reply, like/tip, set profiles, follow/mute, work with topics and notifications, search, read polls, and host files. Load when an agent needs to read or write Memo/BCH data non-interactively; this CLI is the agent-facing mirror of the psf-memo-client web UI.
---

# psf-memo-cli — the agent interface to Memo

`psf-memo-cli` is a command-line BCH wallet and Memo protocol client. Where the
`psf-memo-client` React app is the **human** interface to Memo.cash,
`psf-memo-cli` is the **agent** interface. The two should expose the same
features.

- Location: the `psf-memo-cli/` directory of the `psf-memo` mono-repo.
- Invocation: `node psf-memo-cli.js <command> [flags]` from that directory.
- Every command is non-interactive and designed to be chained and parsed.

```sh
cd /path/to/psf-memo/psf-memo-cli   # the directory where you cloned psf-memo
npm install          # once
node psf-memo-cli.js help
node psf-memo-cli.js help <command>
```

An alias keeps commands short:

```sh
memo() { node /path/to/psf-memo/psf-memo-cli/psf-memo-cli.js "$@"; }
```

The checkout path depends on where you cloned `psf-memo`; replace
`/path/to/psf-memo` with that directory. Nothing in the CLI assumes a fixed
location.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `MEMO_DB_URL` | `https://memo-api.fullstackcash.net` | Read endpoint for all `memo-*` reads (`--db-url` overrides). Local dev: `http://localhost:5021`. |
| `WALLET_URL` | `https://free-bch.fullstack.cash` | BCH backend used by the wallet. |
| `INTERFACE` | `consumer-api` | Wallet backend interface. |
| `HOSTING_API_URL` | `http://localhost:5050` | Base URL for the `file-*` hosting commands. Production: `https://file-hosting-api.blippost.com`. |

## Endpoint reference for agent checks

For agent-side verification, prefer these over `bch.loping.net`:

| Need | Endpoint |
|---|---|
| Chain tip / block height | `GET https://bch.fullstack.cash/v6/full-node/blockchain/getBlockCount` |
| Tx status (confirmations, block) | `GET https://bch.fullstack.cash/v6/full-node/rawtransactions/getRawTransaction/<txid>?verbose=true` |
| Is a tx still in the mempool? | `GET https://bch.fullstack.cash/v6/full-node/blockchain/getMempoolEntry/<txid>` |
| Wallet ops + tx data | `POST https://free-bch.fullstack.cash/bch/txData` with `{"txids":["<txid>"]}` |

- `WALLET_URL` (`https://free-bch.fullstack.cash`) is the
  `ipfs-bch-wallet-consumer` proxy; it has no block-height endpoint, so use
  `bch.fullstack.cash` for the tip.
- `bch.loping.net` (the `explorerUrl` host the CLI prints) is fronted by an
  anti-bot page that returns HTTP 200 with HTML, not transaction data. Do not
  treat its 200 as confirmation.

## Output contract (read this first)

- Adding `--json` makes the command print **exactly one JSON object to stdout**.
  Without it, a human-readable summary is printed.
- Success JSON: `{ "message": "<summary>", ...data }`.
- Failure JSON: `{ "error": "<message>" }`, printed to **stderr**. Diagnostics
  never go to stdout.
- Exit codes: `0` success, `1` runtime/not-found failure, `2` usage (missing or
  invalid flag). A broadcast failure surfaces the wallet's real error — never a
  generic message.
- Wallet source: wallet-relative commands require **exactly one** of
  `-n, --name <wallet>` or `--wif <wif>`. Neither or both is exit `2`.
- Pagination: `-l, --limit` (default `50`) and `-o, --offset` (default `0`); the
  service returns `{ limit, offset, total, hasMore }` unchanged. `total` is
  **capped at 500**, so do not treat it as exact beyond the cap.
- Read-only safety: read commands do not need a wallet unless viewer-relative
  data is requested.

> `--json` is implemented on **every** command, including `wallet-*`, `send-*`,
> and `msg-*`. Wallet/send/sign shapes: `wallet-create` →
> `{ name, description, cashAddress, slpAddress, legacyAddress }` (no mnemonic),
> `wallet-list` → `{ wallets: [{ name, description }] }`, `wallet-addrs` →
> `{ name, cashAddress, slpAddress, legacyAddress }`, `wallet-balance` →
> `{ name, address, bchBalance, tokens }`, `wallet-sweep`/`send-bch`/`send-tokens`
> → `{ txid, explorerUrl }`, `msg-sign` → `{ address, message, signature }`,
> `msg-verify` → `{ address, message, valid }`.

## Async visibility (critical)

A Memo write returns as soon as the transaction is **broadcast**, but the
action is not readable until it is **confirmed in a BCH block and indexed** by
`psf-memo-indexer`. There is no read-after-write consistency: an immediate read
is expected to miss the action.

- Write commands return `{ message, txid, explorerUrl }`
  (`https://bch.loping.net/tx/<txid>`).
- `memo-status` reports `startBlockHeight`, `syncedBlockHeight`, and
  `chainBlockHeight` so you can tell whether the indexer has reached the
  transaction's block.
- `memo-wait -t <txid>` polls the **post** store until the post is indexed
  (default 5 s interval, 60 s timeout). Use a long `--timeout` (e.g. 600000 ms)
  for real confirmation.
- `memo-wait` only tracks posts (`0x6d02`) and replies (`0x6d03`). Other actions
  have no post document: wait for the containing block with `memo-status`, then
  re-run the relevant read.

## Use cases

### 1. Create a wallet

```sh
node psf-memo-cli.js wallet-create -n wallet1 -d "agent identity"
```

Wallets are simple JSON files under `psf-memo-cli/.wallets/<name>.json`. The
wallet's mnemonic is the Memo identity; its first derived key pair authors every
write. List existing wallets with `wallet-list`.

> `wallet-create --json` returns the public wallet metadata
> (`name`, `description`, `cashAddress`, `slpAddress`, `legacyAddress`); it never
> returns the mnemonic — key material stays in the wallet file. `wallet-list
> --json` returns `{ wallets: [{ name, description }] }`.

### 2. Get receive addresses (and fund the wallet)

```sh
node psf-memo-cli.js wallet-addrs -n wallet1
```

Send BCH to the returned `bitcoincash:` address from any wallet or exchange
before broadcasting (each write pays a miner fee). For an ephemeral key instead
of a saved wallet, pass `--wif <wif>` to any write command.

### 3. Check the balance of a wallet

```sh
node psf-memo-cli.js wallet-balance -n wallet1
node psf-memo-cli.js wallet-balance -n wallet1 --json
# => {"message":"...","name":"wallet1","address":"bitcoincash:q...","bchBalance":0.001,"tokens":[...]}
```

Reports BCH and SLP token balances. `memo-identity -n wallet1 --json` also
returns `{ address, bchBalance, tokens, name, bio, avatar }` for the wallet's
own Memo identity.

### 4. Publish a post

```sh
node psf-memo-cli.js memo-post -n wallet1 -m "Hello Memo" --json
# => {"message":"...","txid":"<txid>","explorerUrl":"https://bch.loping.net/tx/<txid>"}
```

`memo-post` is the `0x6d02` action. The message limit is **217 UTF-16 code
units**. Save the `txid`.

To wait until it is readable:

```sh
txid=$(node psf-memo-cli.js memo-post -n wallet1 -m "Hello Memo" --json | jq -r .txid)
node psf-memo-cli.js memo-wait -t "$txid" --timeout 600000 --json
```

### 5. Read a page of the latest posts

```sh
node psf-memo-cli.js memo-feed --limit 10 --json
node psf-memo-cli.js memo-feed --limit 10 --offset 10 --json   # next page
node psf-memo-cli.js memo-feed --limit 10 --viewer bitcoincash:q... --json  # mute-filtered
```

Result: `{ message, posts, pagination }`. Each post carries its `txid`, author
`addr`, `text`, block height, and seen time. Use `pagination.hasMore` to page.

For the **Following** feed — top-level posts from the profiles your wallet
follows (the web client's Following tab; replies and your own posts are excluded
by the server):

```sh
node psf-memo-cli.js memo-following-feed -n wallet1 --limit 10 --json
# => {"message":"...","posts":[...],"pagination":{...}}
```

The single-author feed is `memo-posts -a <addr>`.

### 6. Read a single post and its thread

```sh
node psf-memo-cli.js memo-get-post -t <txid> --json   # one stored post
node psf-memo-cli.js memo-thread -t <txid> --json     # post + nested replies
```

A txid with no stored post is a not-found failure (exit `1`).

### 7. Get a list of recent topics

```sh
node psf-memo-cli.js memo-topics --limit 10 --json
```

Result: `{ message, topics, pagination }` — each topic has `room`, `postCount`,
`lastSeen`, and `followerCount`, newest first.

### 8. Get a list of posts within a topic

```sh
node psf-memo-cli.js memo-topic -r general --limit 10 --json
node psf-memo-cli.js memo-topic -r general --viewer bitcoincash:q... --json
```

Result: `{ message, posts, pagination }` with reply and like counts.

### 9. Post to a topic, and follow/unfollow a topic

```sh
node psf-memo-cli.js memo-topic-post -n wallet1 -r general -m "Hello topic" --json
node psf-memo-cli.js memo-topic-follow -n wallet1 -r general --json
node psf-memo-cli.js memo-topic-unfollow -n wallet1 -r general --json
```

`memo-topic-post` is `0x6d0c`; room + message together are ≤ 214 UTF-8 bytes.

### 10. Reply to a post

```sh
node psf-memo-cli.js memo-reply -n wallet1 -t <parentTxid> -m "Nice post" --json
```

`0x6d03`: a 32-byte little-endian parent txid plus ≤ 184 UTF-8 bytes of text.

### 11. Like (and optionally tip) a post

```sh
node psf-memo-cli.js memo-like -n wallet1 -t <txid> --json
node psf-memo-cli.js memo-like -n wallet1 -t <txid> --tip 1000 --author <authorAddr> --json
```

`0x6d04`. `--tip` is 600–100000000 satoshis and requires `--author`; the tip is
paid to the author on top of the miner fee.

### 12. Set your name, bio, and avatar

```sh
node psf-memo-cli.js memo-name  -n wallet1 -m "Alice" --json            # 0x6d01, <= 77 UTF-8 bytes
node psf-memo-cli.js memo-bio   -n wallet1 -m "Memo fan and builder" --json  # 0x6d05, <= 217 UTF-8 bytes
node psf-memo-cli.js memo-avatar -n wallet1 -u https://example.com/a.png --json  # 0x6d0a, <= 217 UTF-8 bytes
```

The avatar URL should point at an image; the web client renders it in the
profile sidebar. (A stable URL from `file-host`/`file-check` works.)

### 13. Read a profile, and follow/unfollow a profile

```sh
node psf-memo-cli.js memo-profile -a <addr> --json
node psf-memo-cli.js memo-profile -a <addr> --viewer <myAddr> --json   # adds follow state
node psf-memo-cli.js memo-posts   -a <addr> --limit 10 --json          # their top-level posts
node psf-memo-cli.js memo-follow   -n wallet1 -a <addr> --json          # 0x6d06
node psf-memo-cli.js memo-unfollow -n wallet1 -a <addr> --json          # 0x6d07
```

`memo-profile` returns `{ address, name, bio, avatar, following, posts,
pagination }`. Follow/unfollow key off the target's 20-byte hash160.

### 14. Mute and unmute a profile

```sh
node psf-memo-cli.js memo-mute   -n wallet1 -a <addr> --json   # 0x6d16
node psf-memo-cli.js memo-unmute -n wallet1 -a <addr> --json   # 0x6d17
```

Mute filtering is **server-side** and keyed by the viewer address: pass
`--viewer <myAddr>` to `memo-feed`, `memo-topic`, and `memo-search` to hide
muted authors. A mute takes effect only after it is indexed (not optimistic).

### 15. Read your follows, followers, and muted lists

```sh
node psf-memo-cli.js memo-following -n wallet1 --json   # addresses you follow
node psf-memo-cli.js memo-followers -a <addr> --json    # addresses that follow <addr>
node psf-memo-cli.js memo-muted     -n wallet1 --json   # addresses you muted
```

These routes are unpaginated plain address arrays.

### 16. Read notifications

```sh
node psf-memo-cli.js memo-notifications -n wallet1 --limit 10 --json
```

Wallet-relative: mentions, replies, likes, and follows involving your address,
newest first, as `{ message, notifications, pagination }`.

### 17. Search posts and profiles

```sh
node psf-memo-cli.js memo-search -q "memo" --limit 10 --json
node psf-memo-cli.js memo-search -q "memo" --viewer <myAddr> --json   # mute-filtered posts
```

Case-insensitive substring search over post text and profile name/bio. Returns
`{ posts, profiles, pagination }` with a **combined** `total`
(`posts + profiles`) and the same slice applied to each list.

### 18. List recently active profiles

```sh
node psf-memo-cli.js memo-profiles --limit 10 --json
```

`{ message, profiles, pagination }` — address, bio, display name, avatar URL,
provenance txid, and the most recent qualifying post's height/seen.

### 19. Read a poll

```sh
node psf-memo-cli.js memo-poll -t <pollTxid> --json
```

Returns the question, options (text + author address), and current votes
(comment + voter address). Reading is supported; creating a poll or voting is
not yet a CLI command.

### 20. Upload an image for hosting and get a URL

```sh
node psf-memo-cli.js file-upload -f ./image.png --json
# quote-only: filename, sizeBytes, billedBytes, priceSats, paymentAddress, quoteExpiresAt
# or, if already hosted: downloadUrl + viewUrl

node psf-memo-cli.js file-host -f ./image.png -n wallet1 --json
# => {"message":"...","cid":"bafy...","downloadUrl":"https://.../download/bafy...",
#     "viewUrl":"https://.../view/bafy.../image.png","gatewayUrls":["https://ipfs.io/ipfs/..."],
#     "txid":"<txid>","paymentAddress":"bitcoincash:q..."}
```

`file-host` uploads, pays the quote from the wallet, polls check-payment
(10 attempts, 3 s apart), and prints the hosted result. Payment adds a
2,000-sat PSF donation plus the miner fee. Keep the returned `viewUrl` (inline)
or `downloadUrl` (attachment).

Other commands:

```sh
node psf-memo-cli.js file-status -c <cid> --json      # metadata + pins (no URLs)
node psf-memo-cli.js file-check  -a <paymentAddress> --json
#   paid  -> cid, downloadUrl, viewUrl, gatewayUrls
#   unpaid-> receivedSats, requiredSats, quoteExpiresAt
#   expired-> status
```

Use `file-check` when you kept only the payment address: `GET /files/:cid`
returns metadata but no URLs, while check-payment returns the links.

### 21. Include a hosted image in a post

The web client renders an image URL inside a post inline. Do the same from the
CLI: host the image, then put its `viewUrl` (or `downloadUrl`) in the post text,
staying within the 217-code-unit post limit.

```sh
url=$(node psf-memo-cli.js file-host -f ./image.png -n wallet1 --json | jq -r .viewUrl)
node psf-memo-cli.js memo-post -n wallet1 -m "My new build: $url" --json
```

`file-host` also accepts `--wif <wif>` instead of `-n`. For an image you already
paid for, recover the URL first:

```sh
url=$(node psf-memo-cli.js file-check -a <paymentAddress> --json | jq -r .viewUrl)
node psf-memo-cli.js memo-post -n wallet1 -m "Reposting: $url" --json
```

### 22. Check indexer status and wait for indexing

```sh
node psf-memo-cli.js memo-status --json
# => {"message":"indexer status: start 524999, synced 972255, chain 972255",
#     "status":{"startBlockHeight":524999,"syncedBlockHeight":972255,"chainBlockHeight":972255}}
node psf-memo-cli.js memo-wait -t <txid> --timeout 600000 --interval 5000 --json
```

### 23. Prove address ownership (sign / verify)

```sh
node psf-memo-cli.js msg-sign   -n wallet1 -m "hello" --json
# => {"message":"...","address":"bitcoincash:q...","message":"hello","signature":"..."}
node psf-memo-cli.js msg-verify -a <addr> -m "hello" -s <sig> --json
# => {"message":"...","address":"...","message":"hello","valid":true}
```

### 24. Send BCH or SLP tokens

```sh
node psf-memo-cli.js send-bch    -n wallet1 -q 0.00001 -a bitcoincash:q... --json
node psf-memo-cli.js send-tokens -n wallet1 -q 0.5 -a simpleledger:q... -t <tokenId> --json
node psf-memo-cli.js wallet-sweep -n wallet1 -w <wif> --json   # sweep a WIF into a saved wallet
```

Each returns `{ message, txid, explorerUrl }`; the WIF is never echoed.

### 25. Read a page while filtering by viewer

Several reads accept `--viewer <addr>`: `memo-feed`, `memo-topic`,
`memo-search`, and `memo-profile` (follow state). Pass the wallet's address from
`memo-identity`:

```sh
addr=$(node psf-memo-cli.js memo-identity -n wallet1 --json | jq -r .address)
node psf-memo-cli.js memo-feed --viewer "$addr" --limit 20 --json
```

## Web UI → CLI map

| Web UI (psf-memo-client) | CLI |
|---|---|
| Recent feed | `memo-feed` |
| Following feed (tab) | `memo-following-feed` |
| Open a post / thread | `memo-get-post`, `memo-thread` |
| New post | `memo-post`, `memo-topic-post` |
| Reply | `memo-reply` |
| Like / tip | `memo-like [--tip ... --author ...]` |
| Set name / bio / avatar | `memo-name`, `memo-bio`, `memo-avatar` |
| Profile page | `memo-profile`, `memo-posts` |
| Follow / unfollow | `memo-follow`, `memo-unfollow` |
| Mute / unmute | `memo-mute`, `memo-unmute` |
| Topics list / topic page | `memo-topics`, `memo-topic`, `memo-topic-follow/-unfollow` |
| Notifications | `memo-notifications` |
| Search | `memo-search` |
| Recent profiles | `memo-profiles` |
| Following / followers / muted | `memo-following`, `memo-followers`, `memo-muted` |
| Poll (read) | `memo-poll` |
| File upload page | `file-upload`, `file-host` |
| File dashboard | `file-status`, `file-check` |
| Wallet / account balance | `wallet-balance`, `memo-identity` |

## End-to-end recipes

**First post from a brand-new identity**

```sh
node psf-memo-cli.js wallet-create -n wallet1 -d "agent"
node psf-memo-cli.js wallet-addrs -n wallet1      # fund this address with BCH
node psf-memo-cli.js memo-name -n wallet1 -m "Agent"
txid=$(node psf-memo-cli.js memo-post -n wallet1 -m "Hello Memo" --json | jq -r .txid)
node psf-memo-cli.js memo-wait -t "$txid" --timeout 600000 --json
```

**Host an image, then publish a post that embeds it**

```sh
url=$(node psf-memo-cli.js file-host -f ./diagram.png -n wallet1 --json | jq -r .viewUrl)
node psf-memo-cli.js memo-post -n wallet1 -m "New diagram: $url" --json
```

**Interact socially**

```sh
node psf-memo-cli.js memo-feed --limit 5 --json
node psf-memo-cli.js memo-like   -n wallet1 -t <txid> --json
node psf-memo-cli.js memo-reply  -n wallet1 -t <txid> -m "Interesting" --json
node psf-memo-cli.js memo-follow -n wallet1 -a <authorAddr> --json
```

**Keep a clean inbox**

```sh
node psf-memo-cli.js memo-mute -n wallet1 -a <spammerAddr> --json
addr=$(node psf-memo-cli.js memo-identity -n wallet1 --json | jq -r .address)
node psf-memo-cli.js memo-feed --viewer "$addr" --limit 20 --json
```

## Limits, gaps, and safety

- Post text is **217 UTF-16 code units** (JavaScript `String.length`, not
  UTF-8 bytes); replies are ≤ 184 **UTF-8 bytes**; topic room + message ≤ 214
  UTF-8 bytes; name ≤ 77 UTF-8 bytes; bio/avatar ≤ 217 UTF-8 bytes.
- Writes cost a miner fee; `file-host` and `memo-like --tip` additionally spend
  2,000 sat (PSF donation) and the tip respectively.
- **Secret hygiene:** never echo or log a wallet's mnemonic or a `--wif` value.
  Prefer a named wallet (`-n`) over an inline WIF.
- Not yet exposed in the CLI: repost (`0x6d0b`), poll writes
  (`0x6d10`/`0x6d13`/`0x6d14`), send-money (`0x6d24`), MIP-0009 token actions,
  and the file-hosting public feed (`file-list`).
- `total` in pagination is capped at 500 for the recent feed; use `hasMore`,
  not `total`, to decide whether to keep paging.
- Mutations that reference a transaction (like, reply) embed the txid in
  little-endian wire order — always use the CLI, never hand-roll the payload.
