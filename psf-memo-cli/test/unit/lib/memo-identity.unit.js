/*
  Unit tests for the pure memo-identity helpers.

  These pin the BCH satoshi sum, the satoshi-to-BCH conversion, the token-UTXO
  collection across the SLP stores, and the human-readable identity summary.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  sumBchSats,
  satsToBch,
  walletTokenUtxos,
  formatIdentityMessage
} from '../../../src/lib/memo-identity.js'

function walletWith ({ bchUtxos = [], type1 = [], group = [], nft = [] } = {}) {
  return {
    utxos: {
      utxoStore: {
        bchUtxos,
        slpUtxos: {
          type1: { tokens: type1 },
          group: { tokens: group },
          nft: { tokens: nft }
        }
      }
    }
  }
}

describe('#memo-identity helpers', () => {
  describe('sumBchSats', () => {
    it('adds the satoshi values', () => {
      assert.equal(sumBchSats([{ value: 100 }, { value: 50 }]), 150)
    })

    it('is zero for no UTXOs', () => {
      assert.equal(sumBchSats([]), 0)
      assert.equal(sumBchSats(), 0)
    })
  })

  describe('satsToBch', () => {
    it('converts satoshis to whole BCH', () => {
      assert.equal(satsToBch(100000000), 1)
      assert.equal(satsToBch(123456789), 1.23456789)
      assert.equal(satsToBch(0), 0)
    })
  })

  describe('walletTokenUtxos', () => {
    it('collects type1, group, and nft token UTXOs in order', () => {
      const wallet = walletWith({
        type1: [{ ticker: 'A' }],
        group: [{ ticker: 'B' }],
        nft: [{ ticker: 'C' }]
      })

      assert.deepEqual(walletTokenUtxos(wallet), [
        { ticker: 'A' },
        { ticker: 'B' },
        { ticker: 'C' }
      ])
    })

    it('tolerates a wallet with no UTXO store', () => {
      assert.deepEqual(walletTokenUtxos({}), [])
      assert.deepEqual(walletTokenUtxos(), [])
    })
  })

  describe('formatIdentityMessage', () => {
    it('summarizes the address, balances, and profile', () => {
      const message = formatIdentityMessage({
        address: 'addrA',
        bchBalance: 1,
        tokens: [{ ticker: 'TKN', qty: 150 }],
        name: 'alice',
        bio: 'hello memo',
        avatar: 'https://example/a.png'
      })

      assert.include(message, 'addrA')
      assert.include(message, '1')
      assert.include(message, 'TKN:150')
      assert.include(message, 'alice')
      assert.include(message, 'hello memo')
      assert.include(message, 'https://example/a.png')
    })

    it('marks unset profile fields', () => {
      const message = formatIdentityMessage({ address: 'addrA', bchBalance: 0, tokens: [] })

      assert.include(message, 'none')
      assert.include(message, '(unset)')
    })
  })
})
