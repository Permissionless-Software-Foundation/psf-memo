/*
  Property tests for the wallet-balance helpers.

  Unit tests pin fixed shapes. These properties exercise broad input ranges to
  confirm:

    - summarizeBalance: the satoshi/BCH fields are passed through, the batons
      are the concatenation of the type-1 and group batons, and the token list
      conserves every UTXO's quantity under its token id.
    - formatBalanceMessage: the header is always the balance line, one line per
      token, and the baton section appears exactly when batons are held.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { summarizeBalance, formatBalanceMessage } from '../../src/lib/wallet-balance.js'

const rng = seededRandom(20261016)

const TICKERS = ['AAA', 'BBB', 'CCC', 'DDD']

function randomQty () {
  return Math.floor(rng() * 1e6) / 10
}

// A wallet-shaped object carrying the given token UTXOs and minting batons.
function walletData ({ tokenUtxos, mintBatons }) {
  return {
    satBalance: Math.floor(rng() * 1e10),
    bchBalance: rng() * 100,
    utxos: {
      utxoStore: {
        slpUtxos: {
          type1: { tokens: tokenUtxos, mintBatons },
          group: { tokens: [], mintBatons: [] },
          nft: { tokens: [] }
        }
      }
    }
  }
}

test('summarizeBalance passes balances through and conserves every token quantity', () => {
  for (let i = 0; i < 300; i++) {
    const tokenUtxos = Array.from({ length: Math.floor(rng() * 6) }, () => ({
      ticker: TICKERS[Math.floor(rng() * TICKERS.length)],
      tokenId: `tkn-${Math.floor(rng() * 4)}`,
      qtyStr: String(randomQty())
    }))
    const mintBatons = Array.from({ length: Math.floor(rng() * 4) }, () => ({
      ticker: TICKERS[Math.floor(rng() * TICKERS.length)],
      tokenType: rng() < 0.5 ? 129 : 1,
      tokenId: `tkn-${Math.floor(rng() * 4)}`
    }))
    const data = walletData({ tokenUtxos, mintBatons })

    const summary = summarizeBalance(data)

    assert.equal(summary.satBalance, data.satBalance)
    assert.equal(summary.bchBalance, data.bchBalance)
    assert.deepEqual(summary.mintBatons, mintBatons)

    const expectedQty = {}
    for (const utxo of tokenUtxos) {
      expectedQty[utxo.tokenId] = (expectedQty[utxo.tokenId] || 0) + parseFloat(utxo.qtyStr)
    }
    assert.equal(summary.tokens.length, Object.keys(expectedQty).length)
    for (const token of summary.tokens) {
      assert.ok(Math.abs(token.qty - expectedQty[token.tokenId]) < 1e-9, `qty for ${token.tokenId}`)
    }
  }
})

test('formatBalanceMessage renders the balance, each token, and the batons when present', () => {
  for (let i = 0; i < 500; i++) {
    const tokens = Array.from({ length: Math.floor(rng() * 5) }, () => ({
      ticker: TICKERS[Math.floor(rng() * TICKERS.length)],
      tokenId: `tkn-${Math.floor(rng() * 6)}`,
      qty: randomQty()
    }))
    const mintBatons = Array.from({ length: Math.floor(rng() * 4) }, () => ({
      ticker: TICKERS[Math.floor(rng() * TICKERS.length)],
      tokenType: rng() < 0.5 ? 129 : 1,
      tokenId: `tkn-${Math.floor(rng() * 6)}`
    }))
    const summary = {
      satBalance: Math.floor(rng() * 1e10),
      bchBalance: rng() * 100,
      tokens,
      mintBatons
    }

    const lines = formatBalanceMessage(summary).split('\n')

    assert.equal(lines[0], `BCH balance: ${summary.satBalance} satoshis or ${summary.bchBalance} BCH`)
    assert.equal(lines[1], '')
    assert.equal(lines[2], 'Tokens:')

    for (const token of tokens) {
      assert.ok(lines.includes(`${token.ticker} ${token.qty} ${token.tokenId}`))
    }

    if (mintBatons.length > 0) {
      assert.ok(lines.includes('Minting Batons: '))
      for (const baton of mintBatons) {
        const type = baton.tokenType === 129 ? 'Group' : 'Fungible'
        assert.ok(lines.includes(`${baton.ticker} (${type}) ${baton.tokenId}`))
      }
    } else {
      assert.ok(!lines.some((line) => line.startsWith('Minting Batons')))
    }
  }
})
