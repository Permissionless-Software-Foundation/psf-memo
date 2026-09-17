/*
  Unit tests for the txid encoding repair library.

  Older psf-memo-client broadcasts embedded a referenced txid in big-endian
  display order. The indexer expected little-endian wire order, so it stored a
  byte-reversed reference. The repair library rewrites a reversed reference to
  display order and rebuilds the affected secondary index. It leaves
  correctly-encoded records untouched, leaves references whose target is
  unknown in either byte order untouched, and is idempotent.
*/

import { assert } from 'chai'
import {
  reverseTxid,
  correctReference,
  repairTxidEncoding
} from '../../../src/lib/repair-txid-encoding.js'
import { makeLevel } from '../../support/level-double.js'

const DISPLAY_POST = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const REVERSED_POST = 'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301'
const DISPLAY_POLL = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
const REVERSED_POLL = 'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100'
const UNKNOWN = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'

function loadReversedFixture (level) {
  level.postsDb.put(DISPLAY_POST, { addr: 'addr-a', text: 'post', blockHeight: 1 })
  level.pollsDb.put(DISPLAY_POLL, { question: 'q', pollType: 1, optionCount: 2, blockHeight: 2 })

  level.likesDb.put('like-1', { postTxid: REVERSED_POST, addr: 'addr-b', blockHeight: 3 })
  level.likesDb.put('like-2', { postTxid: DISPLAY_POST, addr: 'addr-c', blockHeight: 4 })
  level.likesDb.put('like-3', { postTxid: UNKNOWN, addr: 'addr-d', blockHeight: 5 })
  level.postLikesDb.put(`${REVERSED_POST}:like-1`, { postTxid: REVERSED_POST, txid: 'like-1' })
  level.postLikesDb.put(`${DISPLAY_POST}:like-2`, { postTxid: DISPLAY_POST, txid: 'like-2' })

  level.postParentsDb.put('reply-1', { parentTxid: REVERSED_POST, childTxid: 'reply-1', blockHeight: 6 })
  level.postParentsDb.put('reply-2', { parentTxid: DISPLAY_POST, childTxid: 'reply-2', blockHeight: 7 })
  level.postChildrenDb.put(`${REVERSED_POST}:reply-1`, { parentTxid: REVERSED_POST, childTxid: 'reply-1' })
  level.postChildrenDb.put(`${DISPLAY_POST}:reply-2`, { parentTxid: DISPLAY_POST, childTxid: 'reply-2' })

  level.pollOptionsDb.put('option-1', { pollTxid: REVERSED_POLL, option: 'yes', blockHeight: 8 })
  level.pollOptionsDb.put('option-2', { pollTxid: DISPLAY_POLL, option: 'no', blockHeight: 9 })
  level.pollVotesDb.put('vote-1', { pollTxid: REVERSED_POLL, comment: 'yes', blockHeight: 10 })
  level.pollVotesDb.put('vote-2', { pollTxid: DISPLAY_POLL, comment: 'no', blockHeight: 11 })
}

// Load the reversed-reference fixture, run the repair once, and return the
// repaired level for assertions.
async function repairedFixture () {
  const level = makeLevel()
  loadReversedFixture(level)
  await repairTxidEncoding(level)
  return level
}

describe('#RepairTxidEncoding', () => {
  describe('reverseTxid', () => {
    it('reverses the byte order of a display txid', () => {
      assert.equal(reverseTxid(DISPLAY_POST), REVERSED_POST)
    })

    it('returns null for a value that is not a 64-character hex txid', () => {
      assert.isNull(reverseTxid('not-a-txid'))
      assert.isNull(reverseTxid(null))
      assert.isNull(reverseTxid('zz'.repeat(32)))
    })
  })

  describe('correctReference', () => {
    it('keeps a reference whose target exists in display order', async () => {
      const level = makeLevel()
      level.postsDb.put(DISPLAY_POST, {})
      assert.equal(await correctReference(level.postsDb, DISPLAY_POST), DISPLAY_POST)
    })

    it('reverses a reference whose reversed form is the existing target', async () => {
      const level = makeLevel()
      level.postsDb.put(DISPLAY_POST, {})
      assert.equal(await correctReference(level.postsDb, REVERSED_POST), DISPLAY_POST)
    })

    it('keeps an unknown reference unchanged', async () => {
      const level = makeLevel()
      assert.equal(await correctReference(level.postsDb, UNKNOWN), UNKNOWN)
    })

    it('propagates an unexpected store error', async () => {
      const targetDb = {
        async get () {
          const err = new Error('io failure')
          err.code = 'EIO'
          throw err
        }
      }

      let caught = null
      try {
        await correctReference(targetDb, DISPLAY_POST)
      } catch (err) {
        caught = err
      }

      assert.isNotNull(caught)
      assert.equal(caught.code, 'EIO')
    })
  })

  describe('repairTxidEncoding', () => {
    it('corrects a reversed like reference and rebuilds postLikes', async () => {
      const level = await repairedFixture()

      assert.equal((await level.likesDb.get('like-1')).postTxid, DISPLAY_POST)
      assert.include(level.postLikesDb.keys(), `${DISPLAY_POST}:like-1`)
      assert.notInclude(level.postLikesDb.keys(), `${REVERSED_POST}:like-1`)
    })

    it('corrects a reversed reply reference and rebuilds postChildren', async () => {
      const level = await repairedFixture()

      assert.equal((await level.postParentsDb.get('reply-1')).parentTxid, DISPLAY_POST)
      assert.include(level.postChildrenDb.keys(), `${DISPLAY_POST}:reply-1`)
      assert.notInclude(level.postChildrenDb.keys(), `${REVERSED_POST}:reply-1`)
    })

    it('corrects reversed poll option and vote references', async () => {
      const level = await repairedFixture()

      assert.equal((await level.pollOptionsDb.get('option-1')).pollTxid, DISPLAY_POLL)
      assert.equal((await level.pollVotesDb.get('vote-1')).pollTxid, DISPLAY_POLL)
    })

    it('leaves correctly-encoded references unchanged', async () => {
      const level = await repairedFixture()

      assert.equal((await level.likesDb.get('like-2')).postTxid, DISPLAY_POST)
      assert.equal((await level.postParentsDb.get('reply-2')).parentTxid, DISPLAY_POST)
      assert.equal((await level.pollOptionsDb.get('option-2')).pollTxid, DISPLAY_POLL)
      assert.equal((await level.pollVotesDb.get('vote-2')).pollTxid, DISPLAY_POLL)
    })

    it('leaves an unknown reference unchanged', async () => {
      const level = await repairedFixture()

      assert.equal((await level.likesDb.get('like-3')).postTxid, UNKNOWN)
    })

    it('skips records without a reference field', async () => {
      const level = makeLevel()
      level.likesDb.put('like-empty', { addr: 'addr' })
      level.postParentsDb.put('reply-empty', { childTxid: 'reply-empty' })
      level.pollOptionsDb.put('option-empty', { option: 'x' })
      level.pollVotesDb.put('vote-empty', { comment: 'x' })

      const summary = await repairTxidEncoding(level)

      assert.deepEqual(summary, { likes: 0, replies: 0, pollOptions: 0, pollVotes: 0 })
    })

    it('is idempotent', async () => {
      const level = await repairedFixture()
      await repairTxidEncoding(level)

      const postLikes = level.postLikesDb.keys()
      assert.include(postLikes, `${DISPLAY_POST}:like-1`)
      assert.notInclude(postLikes, `${REVERSED_POST}:like-1`)
      const postChildren = level.postChildrenDb.keys()
      assert.include(postChildren, `${DISPLAY_POST}:reply-1`)
      assert.notInclude(postChildren, `${REVERSED_POST}:reply-1`)
    })
  })
})
