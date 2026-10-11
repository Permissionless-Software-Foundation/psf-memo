/*
  Unit tests for the wallet payment adapter.

  The file-host command pays a quote through this adapter, so the initialize ->
  send call shape and the txid validation are pinned here with a fake wallet.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { sendPayment } from '../../../src/lib/send-payment.js'

// A wallet stand-in that records its initialize/send calls.
function fakeWallet ({ txid = 'txid-1' } = {}) {
  const calls = { initialize: 0, send: null }
  return {
    calls,
    walletInfo: { cashAddress: 'bitcoincash:qpayer' },
    async initialize () {
      calls.initialize++
    },
    async send (outputs) {
      calls.send = outputs
      return txid
    }
  }
}

describe('#send-payment', () => {
  it('initializes the wallet and sends the exact output', async () => {
    const wallet = fakeWallet({ txid: 'tx-abc' })

    const txid = await sendPayment({
      wallet,
      toAddress: 'bitcoincash:qto',
      amountSats: 2000
    })

    assert.equal(txid, 'tx-abc')
    assert.equal(wallet.calls.initialize, 1)
    assert.deepEqual(wallet.calls.send, [{ address: 'bitcoincash:qto', amountSat: 2000 }])
  })

  it('rejects an unexpected transaction id from the wallet backend', async () => {
    const wallet = fakeWallet({ txid: null })

    try {
      await sendPayment({ wallet, toAddress: 'bitcoincash:qto', amountSats: 1 })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, 'Unexpected transaction id')
    }
  })

  it('rejects an empty transaction id from the wallet backend', async () => {
    const wallet = fakeWallet({ txid: '' })

    try {
      await sendPayment({ wallet, toAddress: 'bitcoincash:qto', amountSats: 1 })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, 'Unexpected transaction id')
    }
  })
})
