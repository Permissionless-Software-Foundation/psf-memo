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
