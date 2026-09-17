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
const { encodeScript } = require('../support/script-encoding')

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

// The browser bundle has no global Buffer (CRA 5 does not polyfill Node
// globals and the wallet script does not set window.Buffer), so the adapter
// must import its own. Re-require it with the global removed to prove it.
test('the adapter builds pushes without a browser-global Buffer', () => {
  const modulePath = require.resolve('../../src/services/memo-multipush')
  const savedBuffer = global.Buffer
  global.Buffer = undefined
  delete require.cache[modulePath]
  try {
    const fresh = require('../../src/services/memo-multipush')
    assert.equal(fresh.toPushBuffer('hi').toString('hex'), '6869')
    assert.equal(fresh.buildPushes('6d03', ['hi'])[0].toString('hex'), '6d03')
  } finally {
    global.Buffer = savedBuffer
    delete require.cache[modulePath]
  }
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
  const wrapped = wallet.sendOpReturn
  attachMultiPushOpReturn(wallet)

  // The second attach must leave the wrapper untouched rather than nesting it.
  assert.equal(wallet.sendOpReturn, wrapped)

  await wallet.sendOpReturn('single', '6d02')

  assert.equal(wallet.calls.length, 1)
})

test('attaching to a falsy wallet is a no-op', () => {
  assert.equal(attachMultiPushOpReturn(null), null)
  assert.equal(attachMultiPushOpReturn(undefined), undefined)
})

test('broadcastMultiPush rejects a wallet without the OP_RETURN builder', async () => {
  await assert.rejects(
    broadcastMultiPush({ opReturn: {} }, ['hi'], '6d02'),
    /does not support multi-push OP_RETURN broadcasts/
  )
})
