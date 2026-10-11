# psf-memo-cli — File-hosting commands (plan & decisions)

**Status**: PLANNED — blocked on an external request to the `bch-file-hosting`
team. Do **not** write Gherkin or hand off until that request lands and the
user reconfirms.

**Owner**: specifier.
**Created**: 2026-10-11.

This document is the durable memory for a decision session. It records context
that is not otherwise inferable from the code, so a future session can resume
without the conversation.

---

## Goal

Port a subset of the `bch-file-hosting-cli` (sibling repo
`/home/trout/work/psf/code/ipfs/bch-file-hosting`) into `psf-memo-cli`: let agents
upload a file and pay for hosting, and check a file's status, using the
`bch-file-hosting` REST API. The CLI's job is to **surface the URLs** the API
returns; downloading the file is left to the caller (`curl`, browser, etc.).

## Locked decisions (2026-10-11)

1. **Command prefix**: `file-*`, for commands that interact with the
   `bch-file-hosting` API. This is deliberately outside the `memo-*` namespace
   (file hosting is not a Memo protocol action).
2. **Command set** (four commands):
   - `file-upload` — quote-only: upload a file, print the quote (filename, size,
     billed size when it differs, price, payment address, expiry) or the
     `alreadyHosted` download/view links. No wallet.
   - `file-host` — upload, pay the quote from the wallet, poll for confirmation,
     then print the CID, download/view/gateway URLs, and the payment txid.
   - `file-status` — look up a file by CID (`-c`), print name, size, status,
     hosting window, and pins. No wallet.
   - `file-check` — look up a payment by address (`-a`), print the
     paid/unpaid/expired result (paid prints the CID and links). No wallet.
3. **Check status: both.** Support CID lookup (`file-status`) *and* address
   lookup (`file-check`). Rationale: `GET /files/:cid` returns metadata/pins but
   **no URLs**; the links come from `check-payment`/`alreadyHosted`. `file-check`
   is how a caller who only kept the payment address recovers the links.
4. **Quote-only path: yes** (`file-upload`), so a caller can get a quote and pay
   from any external wallet, then use `file-check` to retrieve the links.
5. **Base-URL env var**: `HOSTING_API_URL`, used by both the CLI and the web.
   `psf-memo-cli` `config/index.js` gains `hostingApiUrl` from
   `process.env.HOSTING_API_URL`. Default: match whatever the `bch-file-hosting`
   team standardizes (production is `https://file-hosting-api.blippost.com`;
   local dev is `http://localhost:5050`).
6. **PSF donation: keep it.** Payments go through `minimal-slp-wallet.send()`,
   which adds a 2,000-sat PSF donation. This is desired: `file-host` costs
   `priceSats + 2,000 + miner fee`. Document it; do not bypass it.
7. **Wallet version**: upgrade `psf-memo-cli` to the latest published
   `minimal-slp-wallet` (currently pinned at `5.12.1`) and verify the send path.
8. **Reuse existing code** rather than reimplementing:
   - `psf-memo-cli`: `src/lib/wallet-source.js` (`-n`/`--wif`), the reporter
     contract (`src/lib/reporter.js`, exit 0/1/2, human vs one JSON object), the
     acceptance harness, and the injected-clock polling pattern from
     `src/lib/memo-wait.js`.
   - `bch-file-hosting-cli`: port/adapt `src/lib/hosting-api.js` (injected
     `fetch`, `HostingApiError`); do not copy the class-based `Command`
     hierarchy — map onto `psf-memo-cli`'s `lib` + thin `commander` command.
9. **Polling defaults** (specifier's choice, per "do what you think is best"):
   reuse the upstream `file-host` defaults — 10 attempts, 3,000 ms apart — with
   the sleep injected for tests. Make them overridable if a flag is cheap.
10. **No download command.** Omitted by user decision (2026-10-11); callers
    fetch the printed URLs themselves.

## Reference implementation (bch-file-hosting-cli)

| Concern | Upstream file | Notes |
|---|---|---|
| HTTP adapter | `src/lib/hosting-api.js` | `upload`, `checkPayment`, `getStatus`, `listFiles`; injected `fetch`; `HostingApiError` |
| Config | `config/index.js` | `apiUrl` from `HOSTING_API_URL` |
| Quote command | `src/commands/file-upload.js` | read file, `FormData`/`Blob`, print quote or `alreadyHosted` |
| Pay command | `src/commands/file-pay.js` | check-payment, then `wallet.send()` outstanding sats |
| Combined command | `src/commands/file-host.js` | upload → short-circuit `alreadyHosted` → pay → poll |
| Status command | `src/commands/file-status.js` | `GET /files/:cid` |
| Check command | `src/commands/file-check.js` | `POST /files/check-payment` |
| Specs | `bch-file-hosting-cli/specs/file-{upload,pay,host,status,check}.feature` | ported/anchored, see below |

API behavior reference: `bch-file-hosting-api/examples/README.md` and
`bch-file-hosting-api/src/use-cases/file-use-cases.js`.

## API facts to rely on

- `POST /files` (multipart field `file`): returns either the quote
  (`filename`, `sizeBytes`, `billedBytes`, `priceSats`, `paymentAddress`,
  `quoteExpiresAt`) or `alreadyHosted` plus `downloadUrl`/`viewUrl`.
- `POST /files/check-payment { paymentAddress }`: `status` is
  `unpaid` (`receivedSats`/`requiredSats`/`quoteExpiresAt`), `paid` (`cid`,
  `downloadUrl`, `viewUrl`, `gatewayUrls`, `hostedUntil`), or `expired`.
- `GET /files/:cid`: `cid`, `filename`, `sizeBytes`, `status`, `pins`,
  `paidAt`, `hostedUntil` — **no URLs**.
- File statuses: `staged`, `pinning`, `pinned`, `pinFailed`, `deleted`.
- Errors are `{ success: false, error }` with 400/401/404/413/422/429/503.
- Payments use 0-conf; unpaid uploads are deleted after the quote window.

## Risks & gotchas

1. **URL asymmetry** — `GET /files/:cid` returns no links; only
   `check-payment`/`alreadyHosted`/feed do. Covered by `file-check`.
2. **The 2,000-sat PSF donation** is kept (see decision 6).
3. **Wallet version gap** — upgrade `psf-memo-cli` to the latest
   `minimal-slp-wallet`; the port must be validated on the installed version,
   not the file-hosting CLI's version.
4. **`fetch` receiver binding** — bind the injected `fetch` to `globalThis` in
   the ported adapter (the file-hosting web app shipped this bug).
5. **Env var consistency** — the bch web currently reads `REACT_APP_API_URL`;
   the request to the bch team asks for `HOSTING_API_URL` (with a CRA-compatible
   mirror if needed).
6. **Command naming** — settled: `file-*`.
7. **Polling defaults** — 10 × 3,000 ms, injectable (decision 9).
8. **Spec quality** — the upstream specs carry unasserted `upload_path` and
   non-JSON `api_txid` columns that survive soft mutation. When writing our
   Gherkin, anchor them with a `Then` or prune them.
9. **`psf-memo-client` web note** — the client web app currently reads
   `REACT_APP_FILE_HOSTING_URL` (`psf-memo-client/src/services/hosting-api.js`,
   gotcha #90). Aligning it to the `HOSTING_API_URL` convention is a separate
   client-side follow-up, not part of this CLI port.

## External dependency

The bch-file-hosting team request is written up verbatim in
`psf-memo-cli/dev-docs/bch-file-hosting-cli-request.md`. It asks them to:

1. standardize `HOSTING_API_URL` across CLI and web;
2. bind `fetch` to `globalThis` in `HostingApi`;
3. upgrade `minimal-slp-wallet` (keep the donation);
4. publish or document the reusable `HostingApi` adapter;
5. commit `dev-docs/api-contract.md`;
6. keep `downloadUrl`/`viewUrl`/`gatewayUrls` stable.

## Next steps (after the bch team lands)

1. Reconfirm the env-var default and the adapter's final shape with the user.
2. Upgrade `psf-memo-cli` to the latest `minimal-slp-wallet` (may be its own
   hardening task if it touches existing commands).
3. Add `hostingApiUrl` to `psf-memo-cli/config/index.js` and `.env.example`.
4. Write Gherkin (one feature per command, or a shared `file-hosting` background)
   for `file-upload`, `file-host`, `file-status`, `file-check`; prune; run
   `gherkin-ir-dry-checker`; sound the chime; seek approval.
5. Hand off as separate `file-upload` / `file-host` / `file-status` /
   `file-check` tasks (or grouped, per the user's preference).

## Non-goals

- Adding a download/`file-get` command.
- Changing the Memo protocol, `psf-memo-db`, or `psf-memo-indexer`.
- Changing `psf-memo-client` as part of this port.
- The `file-list` feed command (not requested; revisit if wanted).
