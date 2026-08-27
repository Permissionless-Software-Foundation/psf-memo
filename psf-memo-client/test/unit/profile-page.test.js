/*
  Unit tests for the profile page controller.

  The profile page loads a single address's posts from the MemoDb client.  The
  like count returned by the API must be preserved so the view can display it.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ProfilePage = require('../../src/services/profile-page')

function makeMemoDb (postsByAddr) {
  return {
    async getPostsByAddr (addr, { limit, offset }) {
      return { posts: postsByAddr[addr] || [], pagination: { total: (postsByAddr[addr] || []).length } }
    }
  }
}

test('load returns posts with like counts for the address', async () => {
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const posts = [{ txid: 'a'.repeat(64), likeCount: 17 }]
  const page = new ProfilePage({ memoDb: makeMemoDb({ [addr]: posts }), addr })

  const result = await page.load()

  assert.equal(result.posts[0].likeCount, 17)
})

test('getPost returns the like count for a loaded post', async () => {
  const addr = 'bitcoincash:second'
  const posts = [{ txid: 'b'.repeat(64), likeCount: 3 }]
  const page = new ProfilePage({ memoDb: makeMemoDb({ [addr]: posts }), addr })

  await page.load()

  assert.equal(page.getPost('b'.repeat(64)).likeCount, 3)
})

test('load throws when no memo db client is provided', async () => {
  const page = new ProfilePage({ addr: 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d' })

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})
