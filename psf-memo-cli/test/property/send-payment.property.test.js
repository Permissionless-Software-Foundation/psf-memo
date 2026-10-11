/*
  Property tests for the wallet payment adapter.

  Unit tests cover one fixed payment. These properties exercise broad input
  ranges to confirm:

    - order and fidelity: the wallet is initialized before sending, and the
      send output always carries the requested address and satoshi amount
      verbatim, with the returned txid passed through.
    - validation: an empty or non-string txid is always rejected.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { sendPayment } from '../../src/lib/send-payment.js'

const rng = seededRandom(20261012)

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomText (maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += CHARS[Math.floor(rng() * CHARS.length)]
  return text
}

test('sendPayment initializes then sends the exact output and returns the txid', async () => {
  for (let i = 0; i < 300; i++) {
    const toAddress = `bitcoincash:q${randomText(24)}`
    const amountSats = Math.floor(rng() * 1e8)
    const txid = `tx-${randomText(24)}`
    const order = []

    const wallet = {
      async initialize () {
        order.push('initialize')
      },
      async send (outputs) {
        order.push('send')
        assert.deepEqual(outputs, [{ address: toAddress, amountSat: amountSats }])
        return txid
      }
    }

    const result = await sendPayment({ wallet, toAddress, amountSats })

    assert.equal(result, txid)
    assert.deepEqual(order, ['initialize', 'send'])
  }
})

test('sendPayment rejects an empty or non-string transaction id', async () => {
  for (let i = 0; i < 200; i++) {
    const txid = rng() < 0.5 ? '' : null
    const wallet = {
      async initialize () {},
      async send () { return txid }
    }

    let err
    try {
      await sendPayment({ wallet, toAddress: 'bitcoincash:qto', amountSats: 1 })
    } catch (e) {
      err = e
    }

    assert.ok(err instanceof Error)
    assert.match(err.message, /Unexpected transaction id/)
  }
})
