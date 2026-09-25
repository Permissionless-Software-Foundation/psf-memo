/*
  Property tests for the indexer's profileRecency maintenance.

  The unit tests probe fixed fixtures. These properties pin the invariants that
  must hold across broad random post streams:

    - Convergence: recordProfileRecency ends on the greatest confirmed height,
      with seen as the tie-breaker, regardless of processing order.
    - Confirmation: posts above status.chainBlockHeight never move recency.
    - Idempotence: replaying the same stream leaves the index unchanged.
    - Establishment: establishProfileRecency stores exactly the newest
      qualifying post reported by psf-memo-db's read API.
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

function makeAdapters (chainBlockHeight, newestPost = null) {
  return {
    profileDb: makeMemoryDb(),
    profileRecencyDb: makeMemoryDb(),
    statusDb: { getStatus: async () => ({ chainBlockHeight }) },
    newestQualifyingPost: { get: async () => newestPost }
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
    const count = intGen(rng, 0, 8)()
    const candidates = []
    for (let i = 0; i < count; i++) {
      candidates.push({
        blockHeight: chainBlockHeight + intGen(rng, -4, 4)(),
        seen: intGen(rng, 0, 50)()
      })
    }
    const newest = candidates.length > 0 ? expectedBest(candidates, chainBlockHeight) : null
    const adapters = makeAdapters(chainBlockHeight, newest ? { addr: ADDR, ...newest } : null)
    return { adapters, newest }
  }
}

test('establishProfileRecency stores the newest qualifying post reported by the read API', async () => {
  await forAll(establishWorldGen(), async ({ adapters, newest }) => {
    await establishProfileRecency(adapters, ADDR)

    const stored = adapters.profileRecencyDb.store.get(ADDR)
    if (!newest) return stored === undefined
    return Boolean(stored) &&
      stored.blockHeight === newest.blockHeight &&
      stored.seen === newest.seen
  }, { label: 'establishProfileRecency read API result' })
})
