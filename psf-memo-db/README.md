# psf-memo-db

LevelDB REST API for the Memo protocol indexer. Architecture mirrors [psf-slp-db](https://github.com/Permissionless-Software-Foundation/psf-slp-db).

Database-focused architecture notes live in the indexer repo: [psf-memo-indexer/dev-docs/psf-memo-db.md](../psf-memo-indexer/dev-docs/psf-memo-db.md).

## Requirements

- node ^20
- npm ^10

## Installation

```bash
cd psf-memo-db
npm install
cp .env-example .env   # optional
npm start
```

Default port: **5021**

API documentation is served at the root URL (`http://localhost:5021/`). Regenerate with `npm run docs`.

## API

All indexer data is exposed under `/level/*` with CRUD routes per entity (`post`, `like`, `name`, `profile`, `status`, etc.) plus:

- `GET /profile/recent` — paginated list of profiles, sorted by block height (newest first)
- `GET /posts/recent` — paginated list of posts, sorted by block height (newest first)
- `POST /level/backup` — zip database snapshot
- `POST /level/restore` — restore from snapshot (exits process)
- `GET /health` — health check

### List recent profiles

```bash
# First page (default limit 100)
curl -sS "http://localhost:5021/profile/recent"

# Page size and offset
curl -sS "http://localhost:5021/profile/recent?limit=50&offset=50"
```

Query parameters: `limit` (default `100`, max `100`), `offset` (default `0`). Block height is read from the stored profile document (`blockHeight` field, set at indexing time).

### List recent posts

```bash
curl -sS "http://localhost:5021/posts/recent"
curl -sS "http://localhost:5021/posts/recent?limit=50&offset=50"
```

Same query parameters as `/profile/recent`.

## Tests

```bash
npm test
```

## Production (Docker)

The production Docker setup is in [psf-memo-indexer/production/docker](../psf-memo-indexer/production/docker/). Compose builds `memo-db` by copying this package from the monorepo root.

## License

MIT
