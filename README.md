# psf-memo

[Memo.cash](https://memo.cash) is a social media site that uses the Bitcoin Cash (BCH) blockchain to store the messages and
send other social media signals, as per the [memo protocol](https://memo.sv/protocol).

This is a vibe-coded mono-repo that replicates the memo infrastructure:
- psf-memo-client - React web app using Bootstrap for styling. It provides a client for interacting with the BCH blockchain and social media network.
- psf-memo-indexer - node.js JavaScript indexer that interfaces with the RPC port of a BCHN full node and crawls the blockchain, indexing transaction that conform to the memo protocol.
- psf-memo-db - A Level database with a REST API for reading and writing to the database. The indexer writes data, the client reads it.

In addition to the three core pieces of infrastructure above, this repository integrates [Uncle Bob's Swarm Forge](https://github.com/unclebob/swarm-forge) idea for vibe-coded development by a team of four AI agents.

