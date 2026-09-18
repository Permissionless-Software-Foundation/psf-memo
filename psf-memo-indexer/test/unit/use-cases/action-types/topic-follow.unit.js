import { assert } from 'chai'
import { handleTopicFollow } from '../../../../src/use-cases/action-types/topic-follow.js'
import { PREFIX_TOPIC_FOLLOW, PREFIX_TOPIC_UNFOLLOW } from '../../../../src/lib/memo-codes.js'
import { topicRecencyKey } from '../../../../src/use-cases/action-types/helpers.js'
import { makeMemoryDb } from '../../../support/memory-db.js'

function makeAdapters () {
  return {
    roomDb: makeMemoryDb(),
    topicSummaryDb: makeMemoryDb(),
    topicRecencyDb: makeMemoryDb(),
    processErrorDb: makeMemoryDb()
  }
}

async function processFollow (adapters, { txid, room, addr, prefix = PREFIX_TOPIC_FOLLOW }) {
  await handleTopicFollow({
    adapters,
    txid,
    signerAddr: addr,
    seen: 1,
    blockHeight: 600000,
    decoded: {
      action: 'topic-follow',
      prefix,
      pushDatas: [prefix, Buffer.from(room, 'utf8')]
    }
  })
}

describe('#handleTopicFollow topic indexes', () => {
  it('should record a zero-post room with one follower for a follow-only room', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, { txid: 'follow-1', room: 'lone', addr: 'bitcoincash:qaddr-a' })

    assert.deepEqual(adapters.topicSummaryDb.store.get('lone'), {
      room: 'lone',
      postCount: 0,
      lastHeight: 0,
      lastSeen: 0,
      followerCount: 1
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(0, 'lone')), {
      room: 'lone',
      blockHeight: 0
    })
  })

  it('should preserve post metadata and increase the follower count for an existing room', async () => {
    const adapters = makeAdapters()
    adapters.topicSummaryDb.store.set('bitcoin', {
      room: 'bitcoin',
      postCount: 1,
      lastHeight: 600400,
      lastSeen: 1700012345000,
      followerCount: 0
    })
    adapters.topicRecencyDb.store.set(topicRecencyKey(600400, 'bitcoin'), { room: 'bitcoin', blockHeight: 600400 })

    await processFollow(adapters, { txid: 'follow-2', room: 'bitcoin', addr: 'bitcoincash:qaddr-a' })

    assert.deepEqual(adapters.topicSummaryDb.store.get('bitcoin'), {
      room: 'bitcoin',
      postCount: 1,
      lastHeight: 600400,
      lastSeen: 1700012345000,
      followerCount: 1
    })
    assert.deepEqual(adapters.topicRecencyDb.store.get(topicRecencyKey(600400, 'bitcoin')), {
      room: 'bitcoin',
      blockHeight: 600400
    })
    assert.isFalse(adapters.topicRecencyDb.store.has(topicRecencyKey(0, 'bitcoin')))
  })

  it('should not create a zero-post room for an unfollow with no prior summary', async () => {
    const adapters = makeAdapters()

    await processFollow(adapters, {
      txid: 'unfollow-1',
      room: 'lone',
      addr: 'bitcoincash:qaddr-a',
      prefix: PREFIX_TOPIC_UNFOLLOW
    })

    assert.equal(adapters.topicSummaryDb.store.size, 0)
    assert.equal(adapters.topicRecencyDb.store.size, 0)
  })

  const followerAddrA = 'bitcoincash:qaddr-a'
  const followerAddrB = 'bitcoincash:qaddr-b'
  const followStep = (txid, addr) => ({ txid, room: 'bitcoin', addr, prefix: PREFIX_TOPIC_FOLLOW })
  const unfollowStep = (txid, addr) => ({ txid, room: 'bitcoin', addr, prefix: PREFIX_TOPIC_UNFOLLOW })

  const followerCases = [
    {
      name: 'should count two distinct followers',
      steps: [followStep('follow-3', followerAddrA), followStep('follow-4', followerAddrB)],
      expected: 2
    },
    {
      name: 'should decrease the follower count on an unfollow',
      steps: [
        followStep('follow-5', followerAddrA),
        followStep('follow-6', followerAddrB),
        unfollowStep('unfollow-2', followerAddrA)
      ],
      expected: 1
    },
    {
      name: 'should not change the follower count when a follow is reprocessed',
      steps: [followStep('follow-7', followerAddrA), followStep('follow-7', followerAddrA)],
      expected: 1
    },
    {
      name: 'should not double-decrement when an unfollow is reprocessed',
      steps: [
        followStep('follow-8', followerAddrA),
        followStep('follow-9', followerAddrB),
        unfollowStep('unfollow-3', followerAddrA),
        unfollowStep('unfollow-3', followerAddrA)
      ],
      expected: 1
    },
    {
      name: 'should let a re-follow increase the count after an unfollow',
      steps: [
        followStep('follow-10', followerAddrA),
        unfollowStep('unfollow-4', followerAddrA),
        followStep('follow-11', followerAddrA)
      ],
      expected: 1
    }
  ]

  for (const { name, steps, expected } of followerCases) {
    it(name, async () => {
      const adapters = makeAdapters()

      for (const step of steps) {
        await processFollow(adapters, step)
      }

      assert.equal(adapters.topicSummaryDb.store.get('bitcoin').followerCount, expected)
    })
  }

  it('should log a process error and write nothing when the push data count is invalid', async () => {
    const adapters = makeAdapters()

    await handleTopicFollow({
      adapters,
      txid: 'follow-bad',
      signerAddr: 'bitcoincash:qaddr-a',
      seen: 1,
      blockHeight: 600000,
      decoded: {
        action: 'topic-follow',
        prefix: PREFIX_TOPIC_FOLLOW,
        pushDatas: [PREFIX_TOPIC_FOLLOW]
      }
    })

    assert.equal(adapters.processErrorDb.store.size, 1)
    assert.equal(adapters.roomDb.store.size, 0)
    assert.equal(adapters.topicSummaryDb.store.size, 0)
    assert.equal(adapters.topicRecencyDb.store.size, 0)
  })
})
