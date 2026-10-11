/*
  Unit tests for the pure file-host helpers.

  The command reports the paid result or the already-hosted links, and polls
  check-payment until it is paid. These tests pin the rendering and the
  injected-poll loop without a network or a clock.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatFileHostMessage, pollPayment } from '../../../src/lib/file-host.js'

describe('#file-host helper', () => {
  describe('#formatFileHostMessage', () => {
    it('renders the paid result with the CID, links, gateways, and transaction', () => {
      const message = formatFileHostMessage({
        cid: 'bafy-paid',
        downloadUrl: 'http://localhost:5050/download/bafy-paid',
        viewUrl: 'http://localhost:5050/view/bafy-paid/photo.jpg',
        gatewayUrls: ['https://ipfs.io/ipfs/bafy-paid/photo.jpg'],
        txid: 'tx-1'
      })

      assert.include(message, 'CID: bafy-paid')
      assert.include(message, 'Download URL: http://localhost:5050/download/bafy-paid')
      assert.include(message, 'View URL: http://localhost:5050/view/bafy-paid/photo.jpg')
      assert.include(message, 'Gateway URL: https://ipfs.io/ipfs/bafy-paid/photo.jpg')
      assert.include(message, 'Transaction: tx-1')
    })

    it('renders the already-hosted links only', () => {
      const message = formatFileHostMessage({
        alreadyHosted: true,
        downloadUrl: 'http://localhost:5050/download/bafy-already',
        viewUrl: 'http://localhost:5050/view/bafy-already/photo.jpg'
      })

      assert.include(message, 'Download URL: http://localhost:5050/download/bafy-already')
      assert.include(message, 'View URL: http://localhost:5050/view/bafy-already/photo.jpg')
      assert.notInclude(message, 'CID')
      assert.notInclude(message, 'Transaction')
    })

    it('omits gateway URLs when the API reports none', () => {
      const message = formatFileHostMessage({ cid: 'bafy', downloadUrl: 'd', viewUrl: 'v', txid: 'tx' })

      assert.notInclude(message, 'Gateway URL')
    })
  })

  describe('#pollPayment', () => {
    it('returns the paid result after retrying once', async () => {
      const responses = [
        { status: 'unpaid' },
        { status: 'paid', cid: 'bafy-paid' }
      ]
      const sleeps = []
      let calls = 0

      const result = await pollPayment({
        checkPayment: async () => responses[calls++],
        paymentAddress: 'bitcoincash:qinvoice',
        attempts: 10,
        delayMs: 3000,
        sleep: async (ms) => { sleeps.push(ms) }
      })

      assert.equal(result.cid, 'bafy-paid')
      assert.equal(calls, 2)
      assert.deepEqual(sleeps, [3000])
    })

    it('returns immediately when the first check is already paid', async () => {
      const sleeps = []
      let calls = 0

      const result = await pollPayment({
        checkPayment: async () => { calls++; return { status: 'paid', cid: 'bafy-now' } },
        paymentAddress: 'bitcoincash:qinvoice',
        attempts: 10,
        delayMs: 3000,
        sleep: async (ms) => { sleeps.push(ms) }
      })

      assert.equal(result.cid, 'bafy-now')
      assert.equal(calls, 1)
      assert.deepEqual(sleeps, [])
    })

    it('throws Payment not confirmed after exhausting the attempts', async () => {
      const sleeps = []
      let calls = 0

      try {
        await pollPayment({
          checkPayment: async () => { calls++; return { status: 'unpaid' } },
          paymentAddress: 'bitcoincash:qinvoice',
          attempts: 3,
          delayMs: 3000,
          sleep: async (ms) => { sleeps.push(ms) }
        })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.message, 'Payment not confirmed.')
      }

      assert.equal(calls, 3)
      assert.deepEqual(sleeps, [3000, 3000])
    })
  })
})
