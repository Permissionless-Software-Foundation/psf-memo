# psf-memo

[Memo.cash](https://memo.cash) is a social media site that uses the Bitcoin Cash (BCH) blockchain to store the messages and
send other social media signals, as per the [memo protocol](https://memo.sv/protocol).

This is a vibe-coded mono-repo that replicates the memo infrastructure:
- psf-memo-client - React web app using Bootstrap for styling. It provides a client for interacting with the BCH blockchain and social media network.
- psf-memo-indexer - node.js JavaScript indexer that interfaces with the RPC port of a BCHN full node and crawls the blockchain, indexing transaction that conform to the memo protocol.
- psf-memo-db - A Level database with a REST API for reading and writing to the database. The indexer writes data, the client reads it.

In addition to the three core pieces of infrastructure above, this repository integrates [Uncle Bob's Swarm Forge](https://github.com/unclebob/swarm-forge) idea for vibe-coded development by a team of four AI agents.

## Repository layout

```text
psf-memo-client/    React SPA for reading/writing Memo actions
psf-memo-indexer/   BCH block + mempool indexer for the Memo protocol
psf-memo-db/        LevelDB REST API (indexer writes, client reads)
specs/              Cross-component backlog and specification notes
swarmforge/         SwarmForge constitution, roles, scripts, and config
```

## Development

### Running the stack locally

```bash
# 1. Database
cd psf-memo-db && npm install && cp .env-example .env && npm start

# 2. Indexer (two processes, separate terminals)
cd psf-memo-indexer && npm install && cp .env-example .env
npm run block-indexer
npm run tx-indexer

# 3. Client
cd psf-memo-client && npm install && cp .env.example .env.development.local
npm start
```

See each component's `README.md` and `dev-docs/` for architecture details.

## SwarmForge development

This project is configured for SwarmForge with four pi-backed agents:

| Role | Worktree / branch | Responsibility |
|------|-------------------|----------------|
| specifier | `master` | Writes Gherkin specs and acceptance criteria |
| coder | `.worktrees/coder` (`swarmforge-coder`) | TDD implementation |
| refactorer | `.worktrees/refactorer` (`swarmforge-refactorer`) | Cleanup, coverage, structure |
| architect | `.worktrees/architect` (`swarmforge-architect`) | Architecture, mutation hardening |

Start the swarm:

```bash
./swarm
```

Handoff helpers are on `PATH` via `swarmforge/scripts/` when an agent launches.

Standing briefing for the specifier: [`specifier-prompt.md`](specifier-prompt.md).
Prioritized feature backlog: [`specs/feature-backlog.md`](specs/feature-backlog.md).

