/*
  Property tests for the bounded thread query in GetPostThread.

  The unit tests pin the thread endpoint to a fixed fixture. These properties
  exercise broad random thread shapes and assert the feature's invariants:

    - closure / conservation: execute returns exactly the reachable posts and
      requests like counts for exactly those txids, once each.
    - bounded work: it loads at most one post per visited txid and never falls
      back to the whole-database buildLikeCountMap scan.
    - bounded reads: every postChildren iteration is a prefix-bounded scan for
      the parent being expanded (gte "<txid>:" / lte "<txid>:\uffff").
    - ordering: replies are sorted by blockHeight ascending, then seen ascending.
    - acyclicity: back-edges and shared children terminate and appear at most
      once in the returned thread.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import GetPostThread from '../../src/use-cases/get-post-thread.js'

const rng = seededRandom(20260915)

// In-memory postChildren store honoring the LevelDB gte/lte prefix contract,
// recording each iterator call so the bounds can be asserted.
function makePostChildrenDb (edges, calls) {
  const store = new Map()
  for (const edge of edges) {
    store.set(`${edge.parentTxid}:${edge.childTxid}`, {
      parentTxid: edge.parentTxid,
      childTxid: edge.childTxid
    })
  }

  return {
    iterator (options = {}) {
      calls.push(options)
      const { gte, lte } = options
      const keys = Array.from(store.keys())
        .filter((key) => (gte === undefined || key >= gte) && (lte === undefined || key <= lte))
        .sort()

      return (async function * () {
        for (const key of keys) yield [key, store.get(key)]
      })()
    }
  }
}

// Build a GetPostThread around a mock postQuery adapter, exposing call records.
function makeEnvironment ({ posts, edges }) {
  const env = {
    postsGetCount: 0,
    iteratorCalls: [],
    likeCalls: [],
    buildLikeCountMapCalled: false
  }

  const postQuery = {
    postsDb: {
      async get (txid) {
        env.postsGetCount++
        if (posts[txid]) return posts[txid]
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
    },
    postChildrenDb: makePostChildrenDb(edges, env.iteratorCalls),
    async countLikesForTxids (txids) {
      env.likeCalls.push([...txids])
      const counts = new Map()
      txids.forEach((txid, index) => counts.set(txid, index % 3))
      return counts
    },
    async buildLikeCountMap () {
      env.buildLikeCountMapCalled = true
      return new Map()
    }
  }

  return { env, uut: new GetPostThread({ adapters: { postQuery } }) }
}

// A random directed graph over n posts. Node 0 is the root and edges may point
// backwards, so cycles and shared children occur; some posts are missing to
// exercise subtree pruning.
function threadGen () {
  return () => {
    const n = intGen(rng, 1, 10)()
    const nodes = []
    for (let i = 0; i < n; i++) {
      nodes.push({
        txid: txidGen(rng),
        addr: `addr-${i}`,
        text: `text-${i}`,
        seen: intGen(rng, 0, 9)(),
        blockHeight: intGen(rng, 0, 9)()
      })
    }

    const edges = []
    for (let i = 0; i < n; i++) {
      if (rng() < 0.6) {
        let parent = intGen(rng, 0, n - 1)()
        if (n > 1 && parent === i) parent = (parent + 1) % n
        edges.push({ parentTxid: nodes[parent].txid, childTxid: nodes[i].txid })
      }
    }

    const posts = {}
    for (let i = 0; i < n; i++) {
      if (i === 0 || rng() < 0.8) posts[nodes[i].txid] = nodes[i]
    }

    return { root: nodes[0].txid, posts, edges }
  }
}

// Every txid execute can reach: follow edges from the root, stopping at missing
// posts, and remember every txid it attempts to fetch (visited).
function reachableFromRoot (root, posts, edges) {
  const childrenByParent = new Map()
  for (const { parentTxid, childTxid } of edges) {
    if (!childrenByParent.has(parentTxid)) childrenByParent.set(parentTxid, [])
    childrenByParent.get(parentTxid).push(childTxid)
  }

  const visited = new Set()
  const present = new Set()
  const pending = [root]
  while (pending.length) {
    const txid = pending.pop()
    if (visited.has(txid)) continue
    visited.add(txid)
    if (!posts[txid]) continue
    present.add(txid)
    for (const child of childrenByParent.get(txid) || []) pending.push(child)
  }

  return { visited, present }
}

function collectTxids (node, out = []) {
  out.push(node.txid)
  for (const reply of node.replies || []) collectTxids(reply, out)
  return out
}

function sameSet (a, b) {
  const left = new Set(a)
  const right = new Set(b)
  if (left.size !== right.size) return false
  for (const value of left) {
    if (!right.has(value)) return false
  }
  return true
}

function compareByOrder (a, b) {
  const blockDifference = (a.blockHeight ?? 0) - (b.blockHeight ?? 0)
  if (blockDifference !== 0) return blockDifference
  return (a.seen ?? 0) - (b.seen ?? 0)
}

function isOrdered (node) {
  const replies = node.replies || []
  if (node.replyCount !== replies.length) return false
  for (let i = 1; i < replies.length; i++) {
    if (compareByOrder(replies[i - 1], replies[i]) > 0) return false
  }
  return replies.every(isOrdered)
}

test('execute returns exactly the reachable thread and counts likes for it only', async () => {
  await forAll(
    threadGen(),
    async ({ root, posts, edges }) => {
      const { env, uut } = makeEnvironment({ posts, edges })
      const result = await uut.execute({ txid: root })
      const expected = reachableFromRoot(root, posts, edges)

      const returned = collectTxids(result.post)
      if (new Set(returned).size !== returned.length) return false
      if (!sameSet(returned, expected.present)) return false

      if (env.buildLikeCountMapCalled) return false
      if (env.likeCalls.length !== 1) return false
      if (!sameSet(env.likeCalls[0], expected.present)) return false
      if (new Set(env.likeCalls[0]).size !== env.likeCalls[0].length) return false

      // One post lookup per distinct txid visited (present or missing).
      if (env.postsGetCount !== expected.visited.size) return false

      return true
    },
    { label: 'thread closure and like-count conservation' }
  )
})

test('every postChildren read is prefix-bounded to the expanded parent', async () => {
  await forAll(
    threadGen(),
    async ({ root, posts, edges }) => {
      const { env, uut } = makeEnvironment({ posts, edges })
      await uut.execute({ txid: root })

      for (const options of env.iteratorCalls) {
        if (typeof options?.gte !== 'string' || typeof options?.lte !== 'string') return false
        if (!options.gte.endsWith(':')) return false
        if (options.lte !== options.gte + '\uffff') return false
      }
      return true
    },
    { label: 'bounded postChildren reads' }
  )
})

test('thread replies are ordered by blockHeight then seen ascending', async () => {
  await forAll(
    threadGen(),
    async ({ root, posts, edges }) => {
      const { uut } = makeEnvironment({ posts, edges })
      const result = await uut.execute({ txid: root })
      return isOrdered(result.post)
    },
    { label: 'thread reply ordering' }
  )
})
