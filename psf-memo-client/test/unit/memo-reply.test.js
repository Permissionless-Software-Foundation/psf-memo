/*
  Unit tests for the Memo reply wire encoding.

  A reply action embeds the parent transaction txid as 32 raw bytes in
  little-endian wire order: the reverse of the 64-character display txid. The
  indexer reverses those bytes back into display order, so the client must
  reverse before embedding.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoReply = require('../../src/services/memo-reply')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const PARENT_TXID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const WIRE_HEX = 'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301'

function makeWallet () {
  return {
    walletInfo: { cashAddress: MY_ADDRESS },
    broadcasts: [],
    async getUtxos () {
      return []
    },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      return 'aa'.repeat(32)
    }
  }
}

test('reply broadcasts the parent txid and text as separate pushes', async () => {
  const wallet = makeWallet()
  const memoReply = new MemoReply({ wallet })

  await memoReply.reply('hello memo', PARENT_TXID)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoReply.MEMO_REPLY_PREFIX)
  const pushes = wallet.broadcasts[0].msg
  assert.ok(Array.isArray(pushes), 'expected separate pushes')
  assert.equal(pushes.length, 2)
  assert.equal(Buffer.from(pushes[0]).toString('hex'), WIRE_HEX)
  assert.equal(Buffer.from(pushes[1]).toString('utf8'), 'hello memo')
})

test('isTooLong accepts a message exactly at the byte limit', () => {
  const memoReply = new MemoReply()

  assert.equal(memoReply.isTooLong('a'.repeat(MemoReply.MAX_REPLY_BYTES)), false)
})

test('isTooLong rejects a message over the byte limit', () => {
  const memoReply = new MemoReply()

  assert.equal(memoReply.isTooLong('a'.repeat(MemoReply.MAX_REPLY_BYTES + 1)), true)
})

test('reply reflects the parent txid in display order on the thread store', async () => {
  const wallet = makeWallet()
  const added = []
  const thread = {
    addReply (reply) {
      added.push(reply)
    }
  }
  const memoReply = new MemoReply({ wallet, thread })

  await memoReply.reply('hello memo', PARENT_TXID)

  assert.equal(added.length, 1)
  assert.equal(added[0].parentTxid, PARENT_TXID)
})
