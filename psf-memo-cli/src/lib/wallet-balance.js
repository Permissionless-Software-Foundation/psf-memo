/*
  Pure helpers for the wallet-balance command.

  The command initializes a wallet and reports its BCH and SLP token balances.
  This module owns the balance summarization and the human-readable rendering so
  the command stays a thin wiring layer over the wallet and the shared reporter.
*/

// Local libraries
import { getTokenBalances } from './token-balances.js'

// Summarize a wallet's BCH balance and token and minting-baton holdings. The
// wallet is expected to carry satBalance/bchBalance set by the command.
export function summarizeBalance (walletData = {}) {
  const store = walletData.utxos.utxoStore

  const tokenUtxos = store.slpUtxos.type1.tokens.concat(
    store.slpUtxos.group.tokens,
    store.slpUtxos.nft.tokens
  )

  const mintBatons = store.slpUtxos.type1.mintBatons.concat(
    store.slpUtxos.group.mintBatons
  )

  return {
    satBalance: walletData.satBalance,
    bchBalance: walletData.bchBalance,
    tokens: getTokenBalances(tokenUtxos),
    mintBatons
  }
}

// Render the human-readable balance summary: the BCH balance, then the token
// holdings, then the minting batons when any are held.
export function formatBalanceMessage (summary = {}) {
  const lines = [
    `BCH balance: ${summary.satBalance} satoshis or ${summary.bchBalance} BCH`,
    '',
    'Tokens:'
  ]

  for (const token of summary.tokens || []) {
    lines.push(`${token.ticker} ${token.qty} ${token.tokenId}`)
  }

  if ((summary.mintBatons || []).length > 0) {
    lines.push('', 'Minting Batons: ')

    for (const baton of summary.mintBatons) {
      const type = baton.tokenType === 129 ? 'Group' : 'Fungible'
      lines.push(`${baton.ticker} (${type}) ${baton.tokenId}`)
    }
  }

  return lines.join('\n')
}
