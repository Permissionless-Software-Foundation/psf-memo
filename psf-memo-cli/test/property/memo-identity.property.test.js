/*
  Property tests for the memo-identity pure helpers.

  Unit tests pin a fixed wallet and profile. These properties exercise broad
  random UTXOs and tokens to confirm:

    - balance math: the BCH satoshi sum is the exact total and does not depend
      on UTXO order, and satsToBch is exact division by 10^8.
    - token collection: the fungible token UTXOs of type1, group, and nft are
      gathered in order, and a missing store yields an empty list.
    - summary fidelity: the identity summary carries every field, marks unset
      profile fields, renders token balances, and is deterministic.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import {
  sumBchSats,
  satsToBch,
  walletTokenUtxos,
  formatIdentityMessage
} from '../../src/lib/memo-identity.js'

const rng = seededRandom(20261018)

function randomSats () {
  return Math.floor(rng() * 1e9)
}

function randomTokens () {
  const count = Math.floor(rng() * 5)
  const tokens = []
  for (let i = 0; i < count; i++) {
    tokens.push({ ticker: `T${Math.floor(rng() * 100)}`, qty: Math.floor(rng() * 1000) })
  }
  return tokens
}

function randomAddress () {
  return `bitcoincash:q${Math.floor(rng() * 1e12)}`
}

test('sumBchSats adds every UTXO value independently of order', () => {
  for (let i = 0; i < 300; i++) {
    const count = Math.floor(rng() * 12)
    const values = []
    for (let j = 0; j < count; j++) values.push(randomSats())
    const utxos = values.map((value) => ({ value }))
    const expected = values.reduce((sum, value) => sum + value, 0)

    assert.equal(sumBchSats(utxos), expected)
    assert.equal(sumBchSats([...utxos].reverse()), expected)
  }

  assert.equal(sumBchSats([]), 0)
  assert.equal(sumBchSats(), 0)
})

test('satsToBch is exact division by 10^8', () => {
  for (let i = 0; i < 300; i++) {
    const sats = Math.floor(rng() * 1e12)
    assert.equal(satsToBch(sats), sats / 100000000)
  }
})

test('walletTokenUtxos gathers type1, group, and nft tokens in order', () => {
  for (let i = 0; i < 200; i++) {
    const type1 = randomTokens()
    const group = randomTokens()
    const nft = randomTokens()
    const wallet = {
      utxos: {
        utxoStore: {
          slpUtxos: {
            type1: { tokens: type1 },
            group: { tokens: group },
            nft: { tokens: nft }
          }
        }
      }
    }

    assert.deepEqual(walletTokenUtxos(wallet), [...type1, ...group, ...nft])
  }

  assert.deepEqual(walletTokenUtxos(), [])
  assert.deepEqual(walletTokenUtxos({}), [])
  assert.deepEqual(walletTokenUtxos({ utxos: {} }), [])
})

test('formatIdentityMessage carries every field and marks unset profile fields', () => {
  for (let i = 0; i < 200; i++) {
    const tokens = randomTokens()
    const identity = {
      address: randomAddress(),
      bchBalance: rng() * 10,
      tokens,
      name: rng() < 0.5 ? 'alice' : '',
      bio: rng() < 0.5 ? 'hello memo' : '',
      avatar: rng() < 0.5 ? 'https://example/a.png' : ''
    }

    const message = formatIdentityMessage(identity)
    const balances = tokens.map((token) => `${token.ticker}:${token.qty}`).join(', ') || 'none'

    assert.ok(message.includes(`address: ${identity.address}`))
    assert.ok(message.includes(`BCH: ${identity.bchBalance}`))
    assert.ok(message.includes(`tokens: ${balances}`))
    assert.ok(message.includes(`name: ${identity.name || '(unset)'}`))
    assert.ok(message.includes(`bio: ${identity.bio || '(unset)'}`))
    assert.ok(message.includes(`avatar: ${identity.avatar || '(unset)'}`))
    assert.equal(message, formatIdentityMessage(identity))
  }
})
