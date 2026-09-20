/*
  Property tests for the indexer's profileRecency maintenance.

  The unit tests probe fixed fixtures. These properties pin the invariants that
  must hold across broad random, out-of-order post streams:

    - Convergence: recordProfileRecency ends on the greatest confirmed height,
      with seen as the tie-breaker, regardless of processing order.
    - Confirmation: posts above status.chainBlockHeight never move recency.
    - Idempotence: replaying the same stream leaves the index unchanged.
    - Establishment: establishProfileRecency recovers the same newest confirmed
      qualifying post from addrPostHeights, excluding replies and polls.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen } from './harness.js'
import { makeMemoryDb } from '../support/memory-db.js'
import {
  recordProfileRecency,
  establishProfileRecency
} from '../../src/use-cases/action-types/profile-recency.js'

const rng = seededRandom(20260921)
const ADDR = 'bitcoincash:qaddr-a'

function makeAdapters (chainBlockHeight) {
  return {
    profileDb: makeMemoryDb(),
    profileRecencyDb: makeMemoryDb(),
    addrPostHeightDb: makeMemoryDb(),
    postParentDb: makeMemoryDb(),
    pollDb: makeMemoryDb(),
    postDb: makeMemoryDb(),
    statusDb: { getStatus: async () => ({ chainBlockHeight }) }
  }
}

function expectedBest (posts, chainBlockHeight) {
  let best = null
  for (const post of posts) {
    if (post.blockHeight > chainBlockHeight) continue
    if (!best || post.blockHeight > best.blockHeight || (post.blockHeight === best.blockHeight && post.seen > best.seen)) {
      best = post
    }
  }
  return best
}

function postStreamGen () {
  return () => {
    const chainBlockHeight = intGen(rng, 10, 1000)()
    const count = intGen(rng, 0, 12)()
    const posts = []
    for (let i = 0; i < count; i++) {
      posts.push({
        blockHeight: chainBlockHeight + intGen(rng, -4, 4)(),
        seen: intGen(rng, 0, 50)()
      })
    }
    const shuffled = [...posts]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const swap = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = swap
    }
    return { chainBlockHeight, posts: shuffled }
  }
}

test('recordProfileRecency converges on the newest confirmed post and is idempotent', async () => {
  await forAll(postStreamGen(), async ({ chainBlockHeight, posts }) => {
    const adapters = makeAdapters(chainBlockHeight)
    await adapters.profileDb.update(ADDR, { addr: ADDR, text: 'bio' })

    for (const post of posts) {
      await recordProfileRecency(adapters, ADDR, post.blockHeight, post.seen)
    }

    const expected = expectedBest(posts, chainBlockHeight)
    const stored = adapters.profileRecencyDb.store.get(ADDR)

    if (!expected) {
      if (stored !== undefined) return false
    } else {
      if (!stored) return false
      if (stored.blockHeight !== expected.blockHeight || stored.seen !== expected.seen) return false
    }

    const before = JSON.stringify(stored ?? null)
    for (const post of posts) {
      await recordProfileRecency(adapters, ADDR, post.blockHeight, post.seen)
    }
    return JSON.stringify(adapters.profileRecencyDb.store.get(ADDR) ?? null) === before
  }, { label: 'recordProfileRecency convergence and idempotence' })
})

function establishWorldGen () {
  return () => {
    const chainBlockHeight = intGen(rng, 10, 1000)()
    const adapters = makeAdapters(chainBlockHeight)
    const entries = []
    const count = intGen(rng, 0, 10)()

    for (let i = 0; i < count; i++) {
      const txid = `tx-${i}`
      const blockHeight = chainBlockHeight + intGen(rng, -4, 4)()
      const seen = intGen(rng, 0, 50)()
      const key = `${ADDR}:${String(blockHeight).padStart(12, '0')}:${txid}`
      adapters.addrPostHeightDb.store.set(key, { txid, addr: ADDR, blockHeight })
      adapters.postDb.store.set(txid, { addr: ADDR, seen, blockHeight })

      const roll = rng()
      let kind = 'post'
      if (roll < 0.3) {
        kind = 'reply'
        adapters.postParentDb.store.set(txid, { txid, parentTxid: 'parent' })
      } else if (roll < 0.5) {
        kind = 'poll'
        adapters.pollDb.store.set(txid, { txid })
      }
      entries.push({ txid, blockHeight, seen, kind })
    }

    return { adapters, entries, chainBlockHeight }
  }
}

test('establishProfileRecency recovers the newest confirmed qualifying post', async () => {
  await forAll(establishWorldGen(), async ({ adapters, entries, chainBlockHeight }) => {
    await establishProfileRecency(adapters, ADDR)

    let expected = null
    for (const entry of entries) {
      if (entry.kind !== 'post') continue
      if (entry.blockHeight > chainBlockHeight) continue
      if (!expected || entry.blockHeight > expected.blockHeight ||
        (entry.blockHeight === expected.blockHeight && entry.seen > expected.seen)) {
        expected = entry
      }
    }

    const stored = adapters.profileRecencyDb.store.get(ADDR)
    if (!expected) return stored === undefined
    return Boolean(stored) &&
      stored.blockHeight === expected.blockHeight &&
      stored.seen === expected.seen
  }, { label: 'establishProfileRecency newest qualifying post' })
})
