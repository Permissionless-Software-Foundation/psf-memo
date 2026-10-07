/*
  Unit tests for the pure memo-get-post helper.

  The command reads a single stored post from psf-memo-db; this pins the
  human-readable summary of its stored fields (txid, text, address, block
  height, seen).
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatGetPostMessage } from '../../../src/lib/memo-get-post.js'

describe('#memo-get-post helpers', () => {
  it('renders the stored post fields', () => {
    const message = formatGetPostMessage({
      txid: 'post-abc',
      text: 'hello memo',
      addr: 'bitcoincash:qaddr-a',
      blockHeight: 600001,
      seen: 1000
    })

    assert.include(message, 'post-abc')
    assert.include(message, 'hello memo')
    assert.include(message, 'bitcoincash:qaddr-a')
    assert.include(message, '600001')
    assert.include(message, '1000')
  })
})
