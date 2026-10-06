/*
  Unit tests for the shared token-balances helper.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { getTokenBalances } from '../../../src/lib/token-balances.js'

describe('#token-balances', () => {
  describe('#getTokenBalances', () => {
    it('should summarize duplicate token ids in first-seen order', () => {
      const tokenIdA = 'a'.repeat(64)
      const tokenIdB = 'b'.repeat(64)

      const utxos = [
        { tokenId: tokenIdA, ticker: 'AAA', qtyStr: '2.5' },
        { tokenId: tokenIdB, ticker: 'BBB', qtyStr: '3' },
        { tokenId: tokenIdA, ticker: 'AAA', qtyStr: '1.5' }
      ]

      const result = getTokenBalances(utxos)

      assert.deepEqual(result, [
        { tokenId: tokenIdA, ticker: 'AAA', qty: 4 },
        { tokenId: tokenIdB, ticker: 'BBB', qty: 3 }
      ])
    })

    it('should return an empty array when there are no token UTXOs', () => {
      assert.deepEqual(getTokenBalances([]), [])
    })
  })
})
