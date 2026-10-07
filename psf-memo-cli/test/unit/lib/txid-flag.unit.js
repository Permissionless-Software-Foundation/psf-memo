/*
  Unit tests for the shared required -t txid flag parser.

  Both the memo-thread and memo-get-post read commands identify a post by
  transaction id, so the validation (and its exact usage message) lives here.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { parseTxidFlag, TXID_FLAG_ERROR } from '../../../src/lib/txid-flag.js'
import { UsageError } from '../../../src/lib/reporter.js'

describe('#txid-flag', () => {
  it('resolves the txid from the -t/--txid flag', () => {
    assert.deepEqual(parseTxidFlag({ txid: 'abc123' }), { txid: 'abc123' })
  })

  it('documents the exact usage message', () => {
    assert.equal(
      TXID_FLAG_ERROR,
      'You must specify a post txid with the -t flag.'
    )
  })

  const missing = [{}, { txid: '' }, { txid: null }, { txid: undefined }]

  for (const flags of missing) {
    it(`rejects ${JSON.stringify(flags)} as a usage error`, () => {
      try {
        parseTxidFlag(flags)
        assert.fail('Expected a usage error')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, TXID_FLAG_ERROR)
      }
    })
  }
})
