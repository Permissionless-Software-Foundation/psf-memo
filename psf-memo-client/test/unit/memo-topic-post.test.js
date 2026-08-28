/*
  Unit tests for the Memo topic message behavior.

  A topic message combines the topic name and message text, then broadcasts
  it with the Memo topic-message prefix (0x6d0c). The combined topic + message
  must not exceed 214 bytes.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoTopicPost = require('../../src/services/memo-topic-post')

function makeWallet (address = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d') {
  return {
    walletInfo: { cashAddress: address },
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

test('post broadcasts topic name and message with the topic-message prefix', async () => {
  const wallet = makeWallet()
  const memoTopicPost = new MemoTopicPost({ wallet, room: 'bitcoin' })

  await memoTopicPost.post('hello bitcoin')

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoTopicPost.MEMO_TOPIC_MESSAGE_PREFIX)
  assert.equal(wallet.broadcasts[0].msg, 'bitcoinhello bitcoin')
})

test('post reflects the new topic post on the injected feed', async () => {
  const wallet = makeWallet()
  const added = []
  const feed = {
    addPost (post) {
      added.push(post)
    }
  }
  const memoTopicPost = new MemoTopicPost({ wallet, room: 'cash', feed })

  await memoTopicPost.post('hello cash')

  assert.equal(added.length, 1)
  assert.equal(added[0].text, 'hello cash')
  assert.equal(added[0].room, 'cash')
  assert.equal(added[0].address, wallet.walletInfo.cashAddress)
})

test('post rejects an empty message', async () => {
  const wallet = makeWallet()
  const memoTopicPost = new MemoTopicPost({ wallet, room: 'bitcoin' })

  await assert.rejects(
    () => memoTopicPost.post(''),
    { code: 'topic_post_validation', message: /must not be empty/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('post rejects a message that exceeds the combined byte limit', async () => {
  const wallet = makeWallet()
  const memoTopicPost = new MemoTopicPost({ wallet, room: 'bitcoin' })
  // "bitcoin" is 7 bytes; 214 - 7 = 207. Use 208 ASCII 'a' characters.
  const message = 'a'.repeat(208)

  await assert.rejects(
    () => memoTopicPost.post(message),
    { code: 'topic_post_length', message: /too long/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('post accepts a message at the combined byte limit', async () => {
  const wallet = makeWallet()
  const memoTopicPost = new MemoTopicPost({ wallet, room: 'bitcoin' })
  const message = 'a'.repeat(207)

  await memoTopicPost.post(message)

  assert.equal(wallet.broadcasts.length, 1)
})

test('remainingBytes accounts for the topic name', () => {
  const memoTopicPost = new MemoTopicPost({ room: 'bitcoin' })

  assert.equal(memoTopicPost.remainingBytes(''), 207)
  assert.equal(memoTopicPost.remainingBytes('hello'), 202)
})

test('remainingBytes counts UTF-8 bytes', () => {
  const memoTopicPost = new MemoTopicPost({ room: 'bitcoin' })

  // 'é' is 2 UTF-8 bytes.
  assert.equal(memoTopicPost.remainingBytes('é'), 205)
})

test('post requires a wallet', async () => {
  const memoTopicPost = new MemoTopicPost({ room: 'bitcoin' })

  await assert.rejects(
    () => memoTopicPost.post('hello'),
    /requires a wallet/
  )
})

test('post surfaces a broadcast failure', async () => {
  const wallet = makeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failed') }
  const memoTopicPost = new MemoTopicPost({ wallet, room: 'bitcoin' })

  await assert.rejects(
    () => memoTopicPost.post('hello'),
    /broadcast failed/
  )
})
