/*
  Pure helpers for the memo-identity read command.

  The command reports the signing wallet's own Memo identity. This module owns
  the balance math, the SLP token-UTXO collection, and the human-readable
  summary; the command is a thin wiring layer over the shared reporter, the
  wallet resolver, and the read-only Memo DB client.
*/

// Sum the satoshi values of a wallet's BCH UTXOs.
export function sumBchSats (bchUtxos = []) {
  return bchUtxos.reduce((sum, utxo) => sum + utxo.value, 0)
}

// Convert satoshis to whole BCH.
export function satsToBch (sats) {
  return sats / 100000000
}

// Collect the wallet's fungible token UTXOs (type1, group, and nft), matching
// the wallet-balance command.
export function walletTokenUtxos (wallet) {
  const store = wallet?.utxos?.utxoStore?.slpUtxos || {}

  return [
    ...(store.type1?.tokens || []),
    ...(store.group?.tokens || []),
    ...(store.nft?.tokens || [])
  ]
}

// Render the human-readable identity summary.
export function formatIdentityMessage ({
  address,
  bchBalance,
  tokens = [],
  name,
  bio,
  avatar
} = {}) {
  const balances = tokens.map((token) => `${token.ticker}:${token.qty}`).join(', ') || 'none'

  return [
    `address: ${address}`,
    `BCH: ${bchBalance}`,
    `tokens: ${balances}`,
    `name: ${name || '(unset)'}`,
    `bio: ${bio || '(unset)'}`,
    `avatar: ${avatar || '(unset)'}`
  ].join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
