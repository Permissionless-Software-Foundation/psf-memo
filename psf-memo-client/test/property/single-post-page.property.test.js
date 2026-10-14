/*
  Property tests for the single-post permalink page controller.

  The unit tests probe SinglePostPage at a few fixed threads. These properties
  pin down the page's invariants over broad random reply trees and page sizes:

    - flattening: every nested reply appears exactly once, in oldest-first
      (pre-order) order, and getPost finds the root and every reply.
    - pagination: the first page is min(pageSize, total) replies; each
      loadMoreReplies reveals the next page, never exceeds the total, is
      monotonic and idempotent once complete, and canLoadMoreReplies agrees.
    - state: a successful load resets not-found, error, link-copied, and the
      reply target; a failed request and a missing thread each set exactly one
      of the error/not-found states.
    - reply target: the next reply defaults to the root post and follows
      selectReply / clearReplyTarget.
    - addReply: appends the reply and reveals at most one more.
    - copyLink: composes origin + path, copies exactly it, and confirms.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen, randomFrom } = require('./harness')
const SinglePostPage = require('../../src/services/single-post-page')

const rng = seededRandom(20261014)

// Build a random nested reply tree under `root` with 0..maxNodes non-root
// nodes. Txids are counter-based so they are always unique within a sample.
function buildReplies (root, maxNodes) {
  const total = intGen(rng, 0, maxNodes)()
  let created = 0

  const attach = (parent) => {
    if (created >= total) return
    const count = intGen(rng, 0, Math.min(3, total - created))()
    for (let i = 0; i < count && created < total; i++) {
      const node = {
        txid: `n${created}`,
        addr: 'bitcoincash:reply-author',
        text: 'a reply',
        replies: []
      }
      created++
      parent.replies.push(node)
      attach(node)
    }
  }

  attach(root)
  return root
}

// The expected oldest-first flattening: each reply before its own replies.
function preOrder (node, out = []) {
  for (const reply of node.replies || []) {
    out.push(reply.txid)
    preOrder(reply, out)
  }
  return out
}

// A memo db that serves `root` for its own txid and no thread for any other.
function makeThreadDb (root) {
  return {
    async getPostThread (txid) {
      return txid === root.txid ? { post: root } : { post: null }
    }
  }
}

test('flattening a reply tree is complete, unique, and oldest-first', async () => {
  await forAll(
    () => buildReplies({ txid: 'root', replies: [] }, 40),
    async (root) => {
      const page = new SinglePostPage({ memoDb: makeThreadDb(root) })
      await page.load(root.txid)

      const expected = preOrder(root)
      const actual = page.replies.map((reply) => reply.txid)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) return false

      const seen = new Set()
      for (const reply of page.replies) {
        if (seen.has(reply.txid)) return false
        seen.add(reply.txid)
        if (page.getPost(reply.txid) !== reply) return false
      }

      return page.getPost(root.txid) === root && page.getPost('missing') === null
    },
    { label: 'single post flatten', samples: 1000 }
  )
})

test('pagination reveals pages of pageSize and stops at the end', async () => {
  await forAll(
    () => ({
      root: buildReplies({ txid: 'root', replies: [] }, 60),
      pageSize: intGen(rng, 1, 15)()
    }),
    async ({ root, pageSize }) => {
      const page = new SinglePostPage({ memoDb: makeThreadDb(root), pageSize })
      await page.load(root.txid)

      const total = page.replies.length
      if (page.visibleCount !== Math.min(pageSize, total)) return false
      if (page.visibleReplies().length !== page.visibleCount) return false

      let previous = page.visibleCount
      let guard = 0
      while (page.canLoadMoreReplies() && guard++ < 500) {
        page.loadMoreReplies()
        if (page.visibleCount !== Math.min(previous + pageSize, total)) return false
        if (page.visibleReplies().length !== page.visibleCount) return false
        previous = page.visibleCount
      }

      if (page.visibleCount !== total || page.canLoadMoreReplies()) return false

      // Once complete, loading more is a no-op.
      page.loadMoreReplies()
      page.loadMoreReplies()
      return page.visibleCount === total
    },
    { label: 'single post pagination', samples: 500 }
  )
})

test('a successful load resets not-found, error, link-copied, and reply target', async () => {
  await forAll(
    () => buildReplies({ txid: 'root', replies: [] }, 5),
    async (root) => {
      const page = new SinglePostPage({ memoDb: makeThreadDb(root) })

      await page.load('missing')
      page.selectedReplyTxid = 'leftover'
      page.linkCopied = true

      await page.load(root.txid)

      return page.notFound === false &&
        page.error === null &&
        page.linkCopied === false &&
        page.selectedReplyTxid === null &&
        page.replyTargetTxid() === root.txid
    },
    { label: 'single post reset', samples: 300 }
  )
})

test('a failed request sets the error; a missing thread sets not-found', async () => {
  await forAll(
    () => randomFrom(rng, 'abcdefghijklmnopqrstuvwxyz ', 1, 24),
    async (message) => {
      const failing = new SinglePostPage({
        memoDb: { async getPostThread () { throw new Error(message) } }
      })
      await failing.load('root')
      if (failing.error !== message) return false
      if (failing.notFound || failing.rootPost !== null || failing.loaded) return false

      const missing = new SinglePostPage({
        memoDb: { async getPostThread () { return { post: null } } }
      })
      const result = await missing.load('root')
      return result.notFound === true &&
        missing.notFound === true &&
        missing.error === null &&
        missing.rootPost === null &&
        missing.loaded === false
    },
    { label: 'single post error and not-found', samples: 300 }
  )
})

test('replyTargetTxid defaults to the root and follows select and clear', async () => {
  await forAll(
    () => buildReplies({ txid: 'root', replies: [] }, 10),
    async (root) => {
      const page = new SinglePostPage({ memoDb: makeThreadDb(root) })
      await page.load(root.txid)

      if (page.replyTargetTxid() !== root.txid) return false
      if (page.replies.length === 0) return true

      const target = page.replies[intGen(rng, 0, page.replies.length - 1)()]
      page.selectReply(target.txid)
      if (page.replyTargetTxid() !== target.txid) return false

      page.clearReplyTarget()
      return page.replyTargetTxid() === root.txid
    },
    { label: 'single post reply target', samples: 500 }
  )
})

test('addReply appends the reply and reveals at most one more', async () => {
  await forAll(
    () => buildReplies({ txid: 'root', replies: [] }, 30),
    async (root) => {
      const page = new SinglePostPage({ memoDb: makeThreadDb(root) })
      await page.load(root.txid)

      const totalBefore = page.replies.length
      const visibleBefore = page.visibleCount
      const reply = { txid: 'new-reply', addr: 'bitcoincash:me', text: 'hi', replies: [] }

      page.addReply(reply)

      return page.replies.length === totalBefore + 1 &&
        page.replies[page.replies.length - 1] === reply &&
        page.visibleCount === Math.min(totalBefore + 1, visibleBefore + 1) &&
        page.visibleCount <= page.replies.length &&
        page.visibleReplies().length === page.visibleCount
    },
    { label: 'single post addReply', samples: 500 }
  )
})

test('copyLink composes, copies, and confirms the absolute permalink', async () => {
  await forAll(
    () => ({
      root: buildReplies({ txid: 'root', replies: [] }, 3),
      origin: randomFrom(rng, 'abcdefghijklmnopqrstuvwxyz:/', 0, 20)
    }),
    async ({ root, origin }) => {
      const copied = []
      const page = new SinglePostPage({
        memoDb: makeThreadDb(root),
        origin,
        copyToClipboard: async (text) => { copied.push(text) }
      })
      await page.load(root.txid)

      const url = await page.copyLink()

      return url === `${origin}/posts/thread/${root.txid}` &&
        copied.length === 1 &&
        copied[0] === url &&
        page.linkCopied === true
    },
    { label: 'single post copyLink', samples: 500 }
  )
})
