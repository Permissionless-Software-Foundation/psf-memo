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
// {"version":1,"tested_at":"2026-10-08T14:52:06.158Z","module_hash":"d4bd71476de2be21944a9ba5b6906440e14f828b2a6083379fb508088473370b","functions":[{"id":"func/sumBchSats","name":"sumBchSats","line":11,"end_line":13,"hash":"9a4afaa1e900c19ea9e0a933febe4f337000a6d8520ea26a74b6d20ac1da3c8e"},{"id":"func/satsToBch","name":"satsToBch","line":16,"end_line":18,"hash":"27429322481282f0e735be272658553633488e4d36e19bab888127a6408043cf"},{"id":"func/walletTokenUtxos","name":"walletTokenUtxos","line":22,"end_line":30,"hash":"46b2d6abc6f98c37480c37b1f0d22e741630f3c21772622fa7f9f8af8a24f823"},{"id":"func/formatIdentityMessage","name":"formatIdentityMessage","line":33,"end_line":51,"hash":"163c866d9be15cbe824b6d4550b9560a5d84ba231e50b66a7baf5c9e9f0b1c98"}]}
// mutate4javascript-manifest-end
