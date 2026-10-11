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

  lines.push(...formatMintBatonLines(summary.mintBatons))

  return lines.join('\n')
}

// The minting-baton section: one labelled line per baton, or nothing when the
// wallet holds none.
function formatMintBatonLines (mintBatons = []) {
  if (mintBatons.length === 0) {
    return []
  }

  const lines = ['', 'Minting Batons: ']

  for (const baton of mintBatons) {
    lines.push(`${baton.ticker} (${batonType(baton)}) ${baton.tokenId}`)
  }

  return lines
}

// A type-129 baton mints a group token; every other type mints a fungible one.
function batonType (baton) {
  return baton.tokenType === 129 ? 'Group' : 'Fungible'
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T18:37:56.635Z","module_hash":"c5e70e2c1b466c6593c14479125e86905ec75d1990d266be40162c1edecb5137","functions":[{"id":"func/summarizeBalance","name":"summarizeBalance","line":14,"end_line":32,"hash":"11c9dd2d048e792a1cfa2e689692359d1eb78c5818dcd285d16562d51c7338e3"},{"id":"func/formatBalanceMessage","name":"formatBalanceMessage","line":36,"end_line":50,"hash":"adf0ba13f19bcc932c2dc4e79353f1b143b954b991f039b3d533d3791ec2bfea"},{"id":"func/formatMintBatonLines","name":"formatMintBatonLines","line":54,"end_line":66,"hash":"272b3e1abc244c5125539b4b9aef2c4477ca79ab58d52e01001aafcd583dda74"},{"id":"func/batonType","name":"batonType","line":69,"end_line":71,"hash":"2fc8ea3a523b5693dda8f6a7dbeabce69758557f61952d949dc2066d57f96124"}]}
// mutate4javascript-manifest-end
