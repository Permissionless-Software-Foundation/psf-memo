/*
  Property tests for WalletBalance.getTokenBalances.

  Unit tests cover a couple of fixed wallets. These properties exercise broad
  input ranges to confirm:

    - conservation: the summed quantity for each token id matches the inputs.
    - uniqueness: each token id appears at most once in the result.
    - completeness: the result covers exactly the token ids present in the
      inputs, with the matching ticker.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import WalletBalance from '../../src/commands/wallet-balance.js'

const rng = seededRandom(20261007)
const TOKEN_IDS = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)]

function tickerFor (tokenId) {
  return `T${TOKEN_IDS.indexOf(tokenId)}`
}

function randomTokenUtxos () {
  const count = Math.floor(rng() * 8)
  const utxos = []

  for (let i = 0; i < count; i++) {
    const tokenId = TOKEN_IDS[Math.floor(rng() * TOKEN_IDS.length)]
    utxos.push({
      tokenId,
      ticker: tickerFor(tokenId),
      qtyStr: String(1 + Math.floor(rng() * 1000))
    })
  }

  return utxos
}

test('getTokenBalances conserves quantity and keeps token ids unique', () => {
  const walletBalance = new WalletBalance()

  for (let i = 0; i < 300; i++) {
    const utxos = randomTokenUtxos()
    const tokens = walletBalance.getTokenBalances(utxos)

    const ids = tokens.map((token) => token.tokenId)
    assert.equal(new Set(ids).size, ids.length, 'token ids are unique')

    const expected = new Map()
    for (const utxo of utxos) {
      expected.set(utxo.tokenId, (expected.get(utxo.tokenId) ?? 0) + parseFloat(utxo.qtyStr))
    }

    assert.equal(tokens.length, expected.size, 'result covers exactly the input token ids')

    for (const token of tokens) {
      assert.equal(token.qty, expected.get(token.tokenId))
      assert.equal(token.ticker, tickerFor(token.tokenId))
    }

    const summedOutput = tokens.reduce((sum, token) => sum + token.qty, 0)
    const summedInput = utxos.reduce((sum, utxo) => sum + parseFloat(utxo.qtyStr), 0)
    assert.equal(summedOutput, summedInput, 'total quantity is conserved')
  }
})
