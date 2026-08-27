/*
  Property tests for the thread page tree flattening.

  ThreadPage._flatten walks a nested reply tree and collects every node into
  a flat list. The invariants that unit tests only probe at a few fixed trees:

    - completeness: every node in the tree appears in the flattened list.
    - uniqueness: no node appears more than once.
    - lookup: getPost(txid) finds any node that was flattened.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const ThreadPage = require('../../src/services/thread-page')

const rng = seededRandom(20260827)

// Build a random nested reply tree with a bounded number of nodes.
function buildTree (budget) {
  const txid = 't' + rng().toString(36).slice(2, 10) + Math.floor(rng() * 1e6)
  const node = { txid, likeCount: Math.floor(rng() * 50), replies: [] }
  const remaining = budget - 1
  if (remaining <= 0) return node

  const childCount = intGen(rng, 0, Math.min(3, remaining))()
  for (let i = 0; i < childCount; i++) {
    node.replies.push(buildTree(remaining))
  }
  return node
}

function collect (node, out) {
  out.push(node.txid)
  for (const reply of node.replies || []) {
    collect(reply, out)
  }
}

test('flattening a reply tree is complete and unique', async () => {
  await forAll(
    (i) => buildTree(intGen(rng, 1, 12)()),
    async (root) => {
      const memoDb = { async getPostThread () { return { post: root } } }
      const page = new ThreadPage({ memoDb })
      await page.load(root.txid)

      const expected = []
      collect(root, expected)

      if (page.allPosts.length !== expected.length) return false

      const seen = new Set()
      for (const post of page.allPosts) {
        if (seen.has(post.txid)) return false
        seen.add(post.txid)
      }

      for (const txid of expected) {
        if (!seen.has(txid)) return false
        if (page.getPost(txid) === null) return false
      }

      return true
    },
    { label: 'thread flatten completeness and uniqueness' }
  )
})
