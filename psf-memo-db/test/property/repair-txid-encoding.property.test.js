/*
  Property tests for the txid encoding repair library.

  Unit tests probe the repair at a fixed fixture. These properties pin the
  invariants over broad random inputs:

    - Selection: correctReference prefers the stored reference when its target
      exists, falls back to the reversed reference when only that target
      exists, and leaves an unknown reference unchanged.
    - Involution: reversing a txid twice returns the original display txid.
    - Idempotence: a second repair run changes nothing.
    - Conservation: repair never adds or drops primary records.
    - Resolution: after repair every reference points at an existing target
      when either byte order had one.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import {
  reverseTxid,
  correctReference,
  repairTxidEncoding
} from '../../src/lib/repair-txid-encoding.js'
import { makeLevel } from '../support/level-double.js'

const rng = seededRandom(20260916)

// Snapshot every store as a stable string so a second run can be compared.
function snapshot (level) {
  const stores = {}
  for (const [name, db] of Object.entries(level)) {
    stores[name] = [...db.map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }
  return JSON.stringify(stores)
}

// A reference that is the display target, its reverse, or an unrelated txid.
function referenceTo (rng, targets, unknown) {
  if (targets.length === 0) return unknown
  const roll = rng()
  const target = targets[intGen(rng, 0, targets.length - 1)()]
  if (roll < 1 / 3) return target
  if (roll < 2 / 3) return reverseTxid(target)
  return unknown
}

// Build a random level with display posts/polls and a mix of correct,
// reversed, and unknown references in each primary store. FakeDb.put mutates
// synchronously, so this builder is synchronous for the property harness.
function buildFixture () {
  const level = makeLevel()
  const postTxids = []
  const pollTxids = []

  const postCount = intGen(rng, 0, 5)()
  for (let i = 0; i < postCount; i++) {
    const txid = txidGen(rng)
    postTxids.push(txid)
    level.postsDb.put(txid, { addr: `addr-${i}`, text: 'post', blockHeight: i })
  }

  const pollCount = intGen(rng, 0, 4)()
  for (let i = 0; i < pollCount; i++) {
    const txid = txidGen(rng)
    pollTxids.push(txid)
    level.pollsDb.put(txid, { question: 'q', pollType: 1, optionCount: 2, blockHeight: i })
  }

  const likeCount = intGen(rng, 0, 6)()
  for (let i = 0; i < likeCount; i++) {
    const likeTxid = `like-${i}`
    const postTxid = referenceTo(rng, postTxids, txidGen(rng))
    level.likesDb.put(likeTxid, { postTxid, addr: 'addr', blockHeight: i })
    level.postLikesDb.put(`${postTxid}:${likeTxid}`, { postTxid, txid: likeTxid })
  }

  const replyCount = intGen(rng, 0, 6)()
  for (let i = 0; i < replyCount; i++) {
    const replyTxid = `reply-${i}`
    const parentTxid = referenceTo(rng, postTxids, txidGen(rng))
    level.postParentsDb.put(replyTxid, { parentTxid, childTxid: replyTxid, blockHeight: i })
    level.postChildrenDb.put(`${parentTxid}:${replyTxid}`, { parentTxid, childTxid: replyTxid })
  }

  const optionCount = intGen(rng, 0, 5)()
  for (let i = 0; i < optionCount; i++) {
    const pollTxid = referenceTo(rng, pollTxids, txidGen(rng))
    level.pollOptionsDb.put(`option-${i}`, { pollTxid, option: `opt-${i}`, blockHeight: i })
  }

  const voteCount = intGen(rng, 0, 5)()
  for (let i = 0; i < voteCount; i++) {
    const pollTxid = referenceTo(rng, pollTxids, txidGen(rng))
    level.pollVotesDb.put(`vote-${i}`, { pollTxid, comment: `vote-${i}`, blockHeight: i })
  }

  return { level, postTxids, pollTxids }
}

function primaryCounts (level) {
  return {
    likes: level.likesDb.map.size,
    replies: level.postParentsDb.map.size,
    pollOptions: level.pollOptionsDb.map.size,
    pollVotes: level.pollVotesDb.map.size
  }
}

// True when every reference in a store is either a known target or unknown in
// both byte orders. Repair must not leave a resolvable reference unresolved.
function allResolvableOrUnknown (db, targetDb, field) {
  for (const record of db.map.values()) {
    const reference = record[field]
    if (targetDb.map.has(reference)) continue
    if (targetDb.map.has(reverseTxid(reference))) return false
  }
  return true
}

test('reverseTxid is an involution on valid txids', async () => {
  await forAll(
    () => txidGen(rng),
    (txid) => reverseTxid(reverseTxid(txid)) === txid,
    { label: 'reverseTxid involution' }
  )
})

test('correctReference selects an existing target in either byte order', async () => {
  await forAll(
    () => txidGen(rng),
    async (txid) => {
      const display = makeLevel()
      await display.postsDb.put(txid, {})
      if (await correctReference(display.postsDb, txid) !== txid) return false

      const reversed = makeLevel()
      await reversed.postsDb.put(txid, {})
      if (await correctReference(reversed.postsDb, reverseTxid(txid)) !== txid) return false

      const unknown = makeLevel()
      const missing = txid
      if (await correctReference(unknown.postsDb, missing) !== missing) return false

      return true
    },
    { label: 'correctReference selection' }
  )
})

test('repairTxidEncoding is idempotent and conserves records', async () => {
  await forAll(
    () => buildFixture(),
    async ({ level }) => {
      const before = primaryCounts(level)

      await repairTxidEncoding(level)
      const afterFirst = snapshot(level)

      await repairTxidEncoding(level)
      if (snapshot(level) !== afterFirst) return false

      const after = primaryCounts(level)
      return JSON.stringify(before) === JSON.stringify(after)
    },
    { label: 'repairTxidEncoding idempotence' }
  )
})

test('repairTxidEncoding resolves every resolvable reference', async () => {
  await forAll(
    () => buildFixture(),
    async ({ level }) => {
      await repairTxidEncoding(level)

      return allResolvableOrUnknown(level.likesDb, level.postsDb, 'postTxid') &&
        allResolvableOrUnknown(level.postParentsDb, level.postsDb, 'parentTxid') &&
        allResolvableOrUnknown(level.pollOptionsDb, level.pollsDb, 'pollTxid') &&
        allResolvableOrUnknown(level.pollVotesDb, level.pollsDb, 'pollTxid')
    },
    { label: 'repairTxidEncoding resolution' }
  )
})

test('repairTxidEncoding rebuilds the secondary indexes for corrected records', async () => {
  await forAll(
    () => buildFixture(),
    async ({ level }) => {
      await repairTxidEncoding(level)

      for (const [likeTxid, like] of level.likesDb.map) {
        if (!level.postLikesDb.map.has(`${like.postTxid}:${likeTxid}`)) return false
      }
      for (const [replyTxid, reply] of level.postParentsDb.map) {
        if (!level.postChildrenDb.map.has(`${reply.parentTxid}:${replyTxid}`)) return false
      }
      return true
    },
    { label: 'repairTxidEncoding index rebuild' }
  )
})

test('an unknown reference is left unchanged by repair', async () => {
  await forAll(
    () => txidGen(rng),
    async (unknown) => {
      const level = makeLevel()
      await level.likesDb.put('like-unknown', { postTxid: unknown, addr: 'addr' })

      await repairTxidEncoding(level)

      return (await level.likesDb.get('like-unknown')).postTxid === unknown
    },
    { label: 'repairTxidEncoding unknown reference' }
  )
})
