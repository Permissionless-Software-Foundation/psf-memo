/*
  Unit tests for the multi-push OP_RETURN adapter.

  Memo actions that carry more than one field must encode each field as its
  own OP_RETURN script push. minimal-slp-wallet broadcasts a single msg push,
  so the adapter wraps the wallet's sendOpReturn: an array first argument is
  expanded to separate pushes, while single-field calls keep delegating to the
  original wallet method.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  toPushBuffer,
  buildPushes,
  broadcastMultiPush,
  attachMultiPushOpReturn
} = require('../../src/services/memo-multipush')

// Encode a script the way Bitcoin does: an opcode number is one byte, a
// Buffer/string becomes a length-prefixed push. Enough to observe the pushes.
function encodeScript (script) {
  const parts = script.map((el) => {
    if (typeof el === 'number') return Buffer.from([el])
    const buf = Buffer.from(el)
    return Buffer.concat([Buffer.from([buf.length]), buf])
  })
  return Buffer.concat(parts)
}

// A double of the minimal-slp-wallet surface the adapter reuses.
function makeSlpWalletDouble () {
  const sent = []
  const wallet = {
    walletInfo: { cashAddress: 'bitcoincash:qtest' },
    fee: 1,
    walletInfoPromise: Promise.resolve(),
    utxos: { utxoStore: { bchUtxos: [{ tx_hash: 'aa', tx_pos: 0, value: 100000 }] } },
    calls: [],
    async sendOpReturn (msg, prefix, bchOutput = []) {
      this.calls.push({ msg, prefix, bchOutput })
      return 'single-txid'
    },
    opReturn: {
      bchjs: {
        Script: {
          opcodes: { OP_RETURN: 0x6a },
          encode2: encodeScript
        }
      },
      async createTransaction (walletInfo, bchUtxos, msg, prefix) {
        this.lastScript = [
          this.bchjs.Script.opcodes.OP_RETURN,
          Buffer.from(prefix, 'hex'),
          Buffer.from(msg)
        ]
        this.lastEncoded = this.bchjs.Script.encode2(this.lastScript)
        return { hex: 'beef' }
      },
      ar: {
        async sendTx (hex) {
          sent.push(hex)
          return 'txid-1'
        }
      }
    }
  }
  return { wallet, sent }
}

test('toPushBuffer encodes a string as UTF-8 and passes bytes through', () => {
  assert.equal(toPushBuffer('hi').toString('hex'), '6869')
  assert.equal(toPushBuffer(Uint8Array.from([1, 2])).toString('hex'), '0102')
})

test('buildPushes puts the prefix first and each field in order', () => {
  const pushes = buildPushes('6d03', [Buffer.from('aa', 'hex'), 'hi'])

  assert.equal(pushes.length, 3)
  assert.equal(pushes[0].toString('hex'), '6d03')
  assert.equal(pushes[1].toString('hex'), 'aa')
  assert.equal(pushes[2].toString('utf8'), 'hi')
})

test('array fields broadcast as separate OP_RETURN pushes', async () => {
  const { wallet, sent } = makeSlpWalletDouble()
  attachMultiPushOpReturn(wallet)

  const txid = await wallet.sendOpReturn(
    [Buffer.from('aabb', 'hex'), Buffer.from('hello')],
    '6d03'
  )

  assert.equal(txid, 'txid-1')
  assert.deepEqual(sent, ['beef'])
  // OP_RETURN, push(6d03), push(aabb), push(hello) — each its own push.
  assert.equal(
    wallet.opReturn.lastEncoded.toString('hex'),
    '6a026d0302aabb0568656c6c6f'
  )
})

test('a single field delegates to the original wallet sendOpReturn', async () => {
  const { wallet } = makeSlpWalletDouble()
  attachMultiPushOpReturn(wallet)

  const txid = await wallet.sendOpReturn('single', '6d02', [])

  assert.equal(txid, 'single-txid')
  assert.equal(wallet.calls.length, 1)
  assert.equal(wallet.calls[0].msg, 'single')
})

test('attaching twice does not double-wrap the wallet', async () => {
  const { wallet } = makeSlpWalletDouble()
  attachMultiPushOpReturn(wallet)
  attachMultiPushOpReturn(wallet)

  await wallet.sendOpReturn('single', '6d02')

  assert.equal(wallet.calls.length, 1)
})

test('broadcastMultiPush rejects a wallet without the OP_RETURN builder', async () => {
  await assert.rejects(
    broadcastMultiPush({ opReturn: {} }, ['hi'], '6d02'),
    /does not support multi-push OP_RETURN broadcasts/
  )
})
