# psf-memo-indexer

Indexes [Memo protocol](https://memo.cash) transactions on Bitcoin Cash. Architecture mirrors [psf-slp-indexer-g2](https://github.com/Permissionless-Software-Foundation/psf-slp-indexer-g2).

## Overview

Two processes:

- **Block indexer** — IBD from block 525000, then ZMQ new-block processing
- **TX indexer** — mempool transactions via ZMQ after IBD signals `/tx-start`

Data is stored in [psf-memo-db](../psf-memo-db) via REST.

## Developer documentation

Architecture, theory of operation, and design tradeoffs: [dev-docs/](./dev-docs/README.md).

## Requirements

- node ^20
- npm ^10
- BCH full node (RPC + ZMQ)
- Running psf-memo-db

## Installation

```bash
cd psf-memo-indexer
npm install
cp .env-example .env
```

## Usage

Start the database:

```bash
cd ../psf-memo-db && npm start
```

Block indexer:

```bash
npm run block-indexer
```

TX indexer (separate terminal):

```bash
npm run tx-indexer
```

## Configuration

See `.env-example`. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PSF_MEMO_DB_URL` | `http://localhost:5021` | psf-memo-db URL |
| `START_BLOCK_HEIGHT` | `525000` | First block to index |
| `RPC_IP` / `RPC_PORT` | `172.17.0.1` / `8332` | Full node RPC |
| `ZMQ_PORT` | `28332` | Full node ZMQ |
| `TX_REST_API_PORT` | `5455` | TX indexer control API |
| `FILTER_CONCURRENCY` | `20` | Parallel Memo tx detection per block |
| `MEMO_TX_CONCURRENCY` | `20` | Parallel Memo tx processing per block |
| `DEBUG_LEVEL` | `0` | `0` = block summary only; `1` = log each Memo tx action type and success/failure |

## Tests

```bash
npm test
```

## Production (Docker)

Docker Compose under [production/docker](./production/docker) runs the full stack. Images clone their source from GitHub at build time (same pattern as [psf-slp-indexer-g2](https://github.com/Permissionless-Software-Foundation/psf-slp-indexer-g2)).

### Services

| Service | Container | Host port | Purpose |
|---------|-----------|-----------|---------|
| `memo-db` | `memo-db` | `5021` | LevelDB REST API ([psf-memo-db](https://github.com/Permissionless-Software-Foundation/psf-memo-db)) |
| `block-indexer` | `memo-block-indexer` | — | IBD + ZMQ block indexing |
| `tx-indexer` | `memo-tx-indexer` | `5455` | Mempool TX indexing (`/tx-start` control API) |
| `memo-client` | `memo-client` | `3000` | React SPA ([psf-memo-client](https://github.com/Permissionless-Software-Foundation/psf-memo-client)), nginx |

LevelDB data persists on the host at `production/data/leveldb`.

### Prerequisites

- Docker Engine and Docker Compose v2 (`docker compose`)
- A Bitcoin Cash full node with RPC and ZMQ reachable from the containers
- On a typical Linux Docker host, the bridge gateway `172.17.0.1` reaches services on the host (RPC, ZMQ, and sibling containers published on host ports)

### 1. Configure environment files

```bash
cd production/docker

cp memo-db/.env-example memo-db/.env
cp block-indexer/.env-example block-indexer/.env
cp tx-indexer/.env-example tx-indexer/.env
cp memo-client/.env-example memo-client/.env
```

Edit each `.env` before building or starting.

#### `memo-db/.env`

| Variable | Typical value | Description |
|----------|---------------|-------------|
| `PORT` | `5021` | REST API listen port |
| `SVC_ENV` | `prod` | Runtime environment |
| `BACKUP_QTY` | `3` | How many epoch zip backups to keep |
| `EXIT_ON_MISSING_BACKUP` | `false` | Exit if expected backup is missing |

#### `block-indexer/.env` and `tx-indexer/.env`

| Variable | Typical Docker value | Description |
|----------|----------------------|-------------|
| `PSF_MEMO_DB_URL` | `http://172.17.0.1:5021` | URL of `memo-db` from inside the container |
| `RPC_IP` / `RPC_PORT` | `172.17.0.1` / `8332` | BCH full node RPC |
| `ZMQ_PORT` | `28332` | BCH full node ZMQ |
| `RPC_USER` / `RPC_PASS` | *(your node auth)* | RPC credentials |
| `TX_REST_API_PORT` | `5455` | TX indexer HTTP port |
| `TX_REST_API_IP` | `172.17.0.1` | Where the block indexer reaches the TX indexer |
| `START_BLOCK_HEIGHT` | `525000` | First block (block indexer only) |
| `FILTER_CONCURRENCY` / `MEMO_TX_CONCURRENCY` | `20` | Parallelism (block indexer) |
| `DEBUG_LEVEL` | `0` | Block-indexer log verbosity |
| `SEEN_TX_MAX` | `100000` | TX indexer seen-tx cache size |

Use a hostname or IP your containers can actually reach for RPC, ZMQ, and `memo-db`. `172.17.0.1` is the usual Docker bridge address when those services are published on the host.

#### `memo-client/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `REACT_APP_MEMO_DB_URL` | `http://localhost:5021` | Browser-facing base URL of `memo-db` (no trailing slash) |

This value is **baked into the SPA at image build time**. Create React App reads it from `memo-client/.env` during `npm run build`.

- Local / same-machine browser: `http://localhost:5021` (or `http://<host-ip>:5021`)
- Separate domains: `https://api.mydomain.com` when the client is at `https://client.mydomain.com`

Changing `REACT_APP_MEMO_DB_URL` requires rebuilding the `memo-client` image (see below).

### 2. Build images

```bash
cd production/docker
docker compose build
```

Rebuild a single service after changing its Dockerfile or (for the client) `.env`:

```bash
docker compose build --no-cache memo-client
docker compose build block-indexer
docker compose build tx-indexer
docker compose build memo-db
```

`block-indexer` and `tx-indexer` use explicit image names (`memo-block-indexer`, `memo-tx-indexer`) so they do not collide with similarly named images from other projects (for example `psf-slp-indexer-g2`).

### 3. Start the stack

Preferred order: database first, then indexers, then the client.

```bash
cd production/docker

docker compose up -d memo-db
docker compose up -d block-indexer tx-indexer
docker compose up -d memo-client
```

Or start everything at once:

```bash
docker compose up -d
```

### 4. Verify

| Check | URL / command |
|-------|----------------|
| Database API / docs | http://localhost:5021/ |
| Database health | http://localhost:5021/health |
| TX indexer | http://localhost:5455/ (control API; `/tx-start` after IBD) |
| Front-end client | http://localhost:3000/ |

```bash
docker compose ps
docker compose logs -f memo-db
docker compose logs -f block-indexer
docker compose logs -f tx-indexer
docker compose logs -f memo-client
```

### 5. Day-to-day operations

```bash
# Stop all services
docker compose down

# Restart one service
docker compose restart block-indexer

# Rebuild and recreate after config or image changes
docker compose up -d --build memo-client
```

Start scripts under each service directory (`start-*.sh`) and `.env` files are bind-mounted into the containers. Edit them on the host and restart the service (no rebuild) unless you changed something that only applies at image build time (notably `memo-client/.env`).

### Production domains example

When the client and API are on different hostnames:

1. Set `memo-client/.env`:

   ```bash
   REACT_APP_MEMO_DB_URL=https://api.mydomain.com
   ```

2. Rebuild and redeploy the client:

   ```bash
   docker compose build --no-cache memo-client
   docker compose up -d memo-client
   ```

3. Reverse-proxy:
   - `client.mydomain.com` → host port `3000` (`memo-client`)
   - `api.mydomain.com` → host port `5021` (`memo-db`)

`memo-db` enables CORS with `origin: '*'`, so the browser may call the API from another subdomain once HTTPS and DNS are in place.

## License

GPL v3
