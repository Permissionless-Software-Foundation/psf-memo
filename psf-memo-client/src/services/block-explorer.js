/*
  Block explorer link for a Bitcoin Cash transaction.

  Single source for the bch.loping.net transaction URL shared by the New Post
  result modal, the post options menu, and the like/tip broadcast result, so
  the base URL and link shape cannot drift between features.
*/

const BLOCK_EXPLORER_TX_BASE = 'https://bch.loping.net/tx'

// Block explorer URL for a transaction, or '' without a txid.
function blockExplorerTxUrl (txid) {
  if (!txid) return ''
  return `${BLOCK_EXPLORER_TX_BASE}/${txid}`
}

module.exports = {
  BLOCK_EXPLORER_TX_BASE,
  blockExplorerTxUrl
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T19:07:27.216Z","module_hash":"941a53501bc90a2ae36e1c0dc3890fd24add133e651c868a1a8f4f6a31035cb7","functions":[{"id":"func/blockExplorerTxUrl","name":"blockExplorerTxUrl","line":12,"end_line":15,"hash":"a8d84886234e25a946eb3363e23583b621851a2778990aa57df7d32fb8ed949a"}]}
// mutate4javascript-manifest-end
