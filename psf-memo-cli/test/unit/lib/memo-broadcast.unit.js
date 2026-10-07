/*
  Unit tests for the shared Memo broadcast scaffolding.

  These pin push construction, single-field delegation, multi-field expansion
  through the wallet's own transaction builder, and the txid + explorer result.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  toPushBuffer,
  buildMemoPushes,
  attachMultiPushOpReturn,
  broadcastMemo,
  MEMO_EXPLORER_URL
} from '../../../src/lib/memo-broadcast.js'

// A wallet stand-in with minimal-slp-wallet's OP_RETURN surface: createTransaction
// composes [OP_RETURN, prefix, msg] and calls Script.encode2.
function multiPushWallet ({ txid = 'txid-multi' } = {}) {
  const calls = { scripts: [], createTransaction: [], sentHex: null, single: null }
  const wallet = {
    fee: 1.2,
    walletInfo: { cashAddress: 'bitcoincash:qwallet' },
    utxos: {
      utxoStore: { bchUtxos: [{ tx_hash: 'a'.repeat(64), tx_pos: 0, value: 10000 }] }
    },
    walletInfoPromise: Promise.resolve({}),
    opReturn: {
      bchjs: {
        Script: {
          encode2 (script) {
            calls.scripts.push(script)
            return Buffer.from('script', 'utf8')
          }
        }
      },
      async createTransaction (walletInfo, utxos, msg, prefix, bchOutput, fee) {
        calls.createTransaction.push({ msg, prefix, bchOutput, fee })
        wallet.opReturn.bchjs.Script.encode2([
          0x6a,
          Buffer.from(prefix, 'hex'),
          Buffer.from(msg)
        ])
        return { hex: 'deadbeef' }
      },
      ar: {
        async sendTx (hex) {
          calls.sentHex = hex
          return txid
        }
      }
    },
    async sendOpReturn (msg, prefix, bchOutput) {
      calls.single = { msg, prefix, bchOutput }
      return 'txid-single'
    }
  }
  return { wallet, calls }
}

describe('#memo-broadcast', () => {
  describe('toPushBuffer', () => {
    it('encodes a UTF-8 string', () => {
      assert.equal(toPushBuffer('hi').toString('hex'), '6869')
    })

    it('accepts byte arrays', () => {
      assert.equal(toPushBuffer(Buffer.from([1, 2])).toString('hex'), '0102')
      assert.equal(toPushBuffer(new Uint8Array([3, 4])).toString('hex'), '0304')
    })
  })

  describe('buildMemoPushes', () => {
    it('puts the prefix first, then each field in order', () => {
      const pushes = buildMemoPushes('6d03', ['hi', Buffer.from([9])])

      assert.equal(pushes.length, 3)
      assert.equal(pushes[0].toString('hex'), '6d03')
      assert.equal(pushes[1].toString('utf8'), 'hi')
      assert.equal(pushes[2].toString('hex'), '09')
    })
  })

  describe('attachMultiPushOpReturn', () => {
    it('leaves wallets without OP_RETURN support unchanged', () => {
      const plain = { sendOpReturn: async () => 'x' }
      const partial = { opReturn: {}, sendOpReturn: async () => 'x' }

      assert.equal(attachMultiPushOpReturn(plain), plain)
      assert.equal(attachMultiPushOpReturn(partial), partial)
      assert.isNull(attachMultiPushOpReturn(null))
      assert.isUndefined(plain.__multiPushAttached)
    })

    it('is idempotent', () => {
      const { wallet } = multiPushWallet()

      const first = attachMultiPushOpReturn(wallet)
      const second = attachMultiPushOpReturn(first)

      assert.isTrue(first.__multiPushAttached)
      assert.equal(second, first)
    })

    it('delegates a single field to the original sendOpReturn', async () => {
      const { wallet, calls } = multiPushWallet()
      attachMultiPushOpReturn(wallet)

      const txid = await wallet.sendOpReturn('hello', '6d02', [])

      assert.equal(txid, 'txid-single')
      assert.equal(calls.single.msg, 'hello')
      assert.equal(calls.single.prefix, '6d02')
    })

    it('broadcasts an array as one push per field', async () => {
      const { wallet, calls } = multiPushWallet()
      const originalEncode2 = wallet.opReturn.bchjs.Script.encode2
      attachMultiPushOpReturn(wallet)

      const txid = await wallet.sendOpReturn(['a', Buffer.from([0x0b])], '6d10', [])

      assert.equal(txid, 'txid-multi')
      assert.equal(calls.sentHex, 'deadbeef')
      assert.equal(calls.scripts.length, 1)
      const script = calls.scripts[0]
      assert.equal(script[0], 0x6a)
      assert.equal(script[1].toString('hex'), '6d10')
      assert.equal(script[2].toString('utf8'), 'a')
      assert.equal(script[3].toString('hex'), '0b')
      // The wallet's original encoder is restored after the broadcast.
      assert.equal(wallet.opReturn.bchjs.Script.encode2, originalEncode2)
    })
  })

  describe('broadcastMemo', () => {
    it('refreshes UTXOs and reports the txid and explorer link', async () => {
      let initialized = false
      const wallet = {
        async initialize () {
          initialized = true
        },
        async sendOpReturn () {
          return 'txid-1'
        }
      }

      const result = await broadcastMemo({ wallet, prefix: '6d02', fields: ['hello'] })

      assert.isTrue(initialized)
      assert.equal(result.txid, 'txid-1')
      assert.equal(result.explorerUrl, `${MEMO_EXPLORER_URL}txid-1`)
    })

    it('passes a single field as a scalar and multiple fields as an array', async () => {
      const calls = []
      const wallet = {
        async initialize () {},
        async sendOpReturn (msg) {
          calls.push(msg)
          return 't'
        }
      }

      await broadcastMemo({ wallet, prefix: '6d02', fields: ['one'] })
      await broadcastMemo({ wallet, prefix: '6d03', fields: ['two', 'three'] })

      assert.isTrue(Buffer.isBuffer(calls[0]))
      assert.isTrue(Array.isArray(calls[1]))
      assert.equal(calls[1].length, 2)
    })

    it('wraps a capable wallet and broadcasts multiple fields as pushes', async () => {
      const { wallet, calls } = multiPushWallet({ txid: 'txid-wrapped' })
      wallet.initialize = async () => {}

      const result = await broadcastMemo({ wallet, prefix: '6d10', fields: ['a', 'b'] })

      assert.equal(result.txid, 'txid-wrapped')
      assert.equal(calls.scripts.length, 1)
    })
  })
})
