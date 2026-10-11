# Request to the bch-file-hosting team — CLI/API hardening for downstream reuse

**Status**: ready to post to the bch-file-hosting maintainers.
**Owner**: psf-memo specifier.
**Created**: 2026-10-11.

Paste the section below ("Request") to the team that owns the
`bch-file-hosting` repo. It is self-contained: it states who is asking, why,
what already works, and the exact changes requested.

---

## Request

### Who is asking and why

The `psf-memo` project is porting file-hosting commands into its own CLI
(`psf-memo-cli`). The new commands will talk directly to the
`bch-file-hosting` REST API and use the `bch-file-hosting-cli` as the reference
implementation. To make that port safe, non-duplicative, and consistent, we
need a small set of changes and hardening items in your repo. Nothing in our
port is built yet — we are making this request first.

The `psf-memo-cli` commands planned against your API are `file-upload`
(quote only), `file-host` (upload + pay + confirm), `file-status` (by CID), and
`file-check` (by payment address). We will print the `downloadUrl` / `viewUrl` /
`gatewayUrls` your API returns; we are **not** adding a download command.

### What already works — no change needed, just reference

- `POST /files`, `POST /files/check-payment`, `GET /files/:cid`,
  `GET /files`, `GET /download/:cid`, `GET /view/:cid[/:name]`.
- The CLI commands `file-upload`, `file-check`, `file-status`, `file-list`,
  `file-pay`, `file-host`, `wallet-create`, `wallet-balance`.
- Paid and `alreadyHosted` results carry `downloadUrl`, `viewUrl`, and
  `gatewayUrls`.
- The CLI's `HostingApi` adapter and its dependency injection (injected
  `fetch`, injected config) are a good shape to reuse.

### Requested changes

1. **Standardize the API base-URL environment variable on `HOSTING_API_URL`
   across the CLI and the web.**
   - The CLI already uses `HOSTING_API_URL`; the web currently reads
     `REACT_APP_API_URL` (`bch-file-hosting-web/src/config/index.js`).
   - Make the web read `HOSTING_API_URL` too.
   - CRA constraint: Create React App only inlines `process.env.REACT_APP_*`
     into the browser bundle, so a bare `HOSTING_API_URL` will not reach the
     client at runtime. If CRA requires the prefix, keep `HOSTING_API_URL` as
     the canonical name and expose a documented mirror (for example
     `REACT_APP_HOSTING_API_URL` or a runtime config endpoint) so the CLI and
     web still share one name and one default. Document the constraint.
   - Pick one default and document it (the API's own default is
     `http://localhost:5050`; production is served at
     `https://file-hosting-api.blippost.com`). `psf-memo-cli` will match
     whatever you choose.

2. **Bind the injected `fetch` to `globalThis` inside `HostingApi`.**
   - Store `(fetchImpl || fetch).bind(globalThis)` once in the constructor and
     use it for `upload`, `checkPayment`, `getStatus`, and `listFiles`.
   - This is the exact bug the web app hit: a stored bare `fetch` called as
     `this.fetch(...)` is rejected by browser transports because the receiver is
     the adapter instance ("'fetch' called on an object that does not implement
     interface Window"). Node tolerates it, but we want the adapter correct
     everywhere.
   - Add a unit/property test that calls every method with a receiver-sensitive
     fake fetch and asserts the global receiver.

3. **Upgrade to the latest published `minimal-slp-wallet`** and verify the
   `file-host` / `file-pay` send paths still work. The 2,000-sat PSF donation
   added by `wallet.send()` is **expected and desired** — keep it and keep the
   comment/test that documents it.

4. **Extract or publish the `HostingApi` adapter as a reusable module.**
   - Preferred: publish it (or document a stable internal import path) as a
     small ESM module with an injected `fetch` and a `HostingApiError` carrying
     the API's `error` message, so `psf-memo-cli` can depend on it instead of
     copying it.
   - If publishing is out of scope, commit a `dev-docs/api-contract.md` that
     pins the module boundary and the request/response shapes, and say so in the
     reply.
   - Either way, do not add dependencies that are unavailable to a Node ESM
     consumer.

5. **Document the API contract in one place** (`dev-docs/api-contract.md`):
   endpoint, method, request fields, response fields, status values
   (`unpaid`/`paid`/`expired`; file `staged`/`pinning`/`pinned`/`pinFailed`/
   `deleted`), and HTTP error statuses/messages. Include the explicit note that
   `GET /files/:cid` returns metadata and pins but **no** download/view URLs
   (those come from `check-payment`, `alreadyHosted`, and the feed).

6. **Keep the URL-bearing fields stable.** `downloadUrl`, `viewUrl`, and
   `gatewayUrls` must stay present on the paid and `alreadyHosted` payloads
   (and `downloadUrl`/`viewUrl` on the feed). If `GET /files/:cid` should also
   return links, treat that as a product decision and tell us; our port does not
   require it.

7. **Optional (parity, not required):** accept `--wif <wif>` beside `-n <name>`
   on the wallet commands, matching `psf-memo-cli`'s wallet resolution.

### Definition of done

- CLI and web read `HOSTING_API_URL` (or the documented CRA mirror) with one
  documented default.
- `HostingApi` binds `fetch` to `globalThis`, pinned by a test.
- Latest `minimal-slp-wallet`, with `file-host`/`file-pay` passing and the
  2,000-sat donation still present.
- The reusable adapter is published or documented, and `dev-docs/api-contract.md`
  is committed.
- `verify.sh cli` (unit, property, acceptance, lint) is green.

Please reply with the chosen env-var default, whether the adapter will be
published, and the commit(s) to reference for the port.
