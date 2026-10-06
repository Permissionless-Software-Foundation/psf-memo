/*
  Summarize a wallet's SLP token UTXOs into one entry per token id.

  This is pure and wallet-library free, so both the wallet-balance display
  command and the send-tokens command can share it without one command
  depending on another.
*/

// Global npm libraries
import collect from 'collect.js'

// Add up the token balances.
// At the moment, minting batons, NFTs, and group tokens are not supported.
export function getTokenBalances (tokenUtxos) {
  const tokens = []
  const tokenIds = []

  // Summarize token data into an array of token UTXOs.
  for (let i = 0; i < tokenUtxos.length; i++) {
    const thisUtxo = tokenUtxos[i]

    const thisToken = {
      ticker: thisUtxo.ticker,
      tokenId: thisUtxo.tokenId,
      qty: parseFloat(thisUtxo.qtyStr)
    }

    tokens.push(thisToken)
    tokenIds.push(thisUtxo.tokenId)
  }

  // Create a unique collection of tokenIds
  const collection = collect(tokenIds)
  let unique = collection.unique()
  unique = unique.toArray()

  // Add up any duplicate entries.
  // The finalTokenData array contains unique objects, one for each token,
  // with a total quantity of tokens for the entire wallet.
  const finalTokenData = []
  for (let i = 0; i < unique.length; i++) {
    const thisTokenId = unique[i]

    const thisTokenData = {
      tokenId: thisTokenId,
      qty: 0
    }

    // Add up the UTXO quantities for the current token ID.
    for (let j = 0; j < tokens.length; j++) {
      const thisToken = tokens[j]

      if (thisTokenId === thisToken.tokenId) {
        thisTokenData.ticker = thisToken.ticker
        thisTokenData.qty += thisToken.qty
      }
    }

    finalTokenData.push(thisTokenData)
  }

  return finalTokenData
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-06T22:41:35.931Z","module_hash":"24fe14772c33a2e8107723a2a340975280789b5a14bbbb45c4e9d616821dcd37","functions":[{"id":"func/getTokenBalances","name":"getTokenBalances","line":14,"end_line":63,"hash":"caf0cacdac3162c18ab9158a36a4f52ff952a0c51cfdb8e55db7c11602a6f3ce"}]}
// mutate4javascript-manifest-end
