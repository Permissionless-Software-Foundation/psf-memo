/*
  Unit tests for the thread page controller.

  The thread page loads a post and its nested replies from the MemoDb client.
  The like count returned for the root post and for every reply must be
  preserved so the view can display it.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ThreadPage = require('../../src/services/thread-page')

function makeMemoDb (threads) {
  return {
    async getPostThread (txid) {
      return threads[txid]
    }
  }
}

test('load preserves the root post like count', async () => {
  const txid = 'a'.repeat(64)
  const memoDb = makeMemoDb({
    [txid]: { post: { txid, likeCount: 17, replies: [] } }
  })
  const page = new ThreadPage({ memoDb })

  await page.load(txid)

  assert.equal(page.rootPost.likeCount, 17)
})

test('load flattens replies and preserves their like counts', async () => {
  const txid = 'a'.repeat(64)
  const replyTxid = 'd'.repeat(64)
  const memoDb = makeMemoDb({
    [txid]: {
      post: {
        txid,
        likeCount: 17,
        replies: [{ txid: replyTxid, likeCount: 5, replies: [] }]
      }
    }
  })
  const page = new ThreadPage({ memoDb })

  await page.load(txid)

  assert.equal(page.getPost(replyTxid).likeCount, 5)
})

test('load recursively flattens nested replies', async () => {
  const txid = 'a'.repeat(64)
  const replyTxid = 'd'.repeat(64)
  const nestedTxid = 'n'.repeat(64)
  const memoDb = makeMemoDb({
    [txid]: {
      post: {
        txid,
        likeCount: 17,
        replies: [{
          txid: replyTxid,
          likeCount: 5,
          replies: [{ txid: nestedTxid, likeCount: 9, replies: [] }]
        }]
      }
    }
  })
  const page = new ThreadPage({ memoDb })

  await page.load(txid)

  assert.equal(page.getPost(replyTxid).likeCount, 5)
  assert.equal(page.getPost(nestedTxid).likeCount, 9)
})

test('load throws when no memo db client is provided', async () => {
  const page = new ThreadPage({})

  await assert.rejects(
    () => page.load('a'.repeat(64)),
    /requires a memo db client/
  )
})
