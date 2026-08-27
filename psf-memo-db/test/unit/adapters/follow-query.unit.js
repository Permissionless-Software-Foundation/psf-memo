/*
  Unit tests for the FollowQuery adapter.
*/

import { assert } from 'chai'
import FollowQuery from '../../../src/adapters/follow-query.js'

function makeFollowsDb (records = {}) {
  const store = new Map(Object.entries(records))
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    iterator (opts = {}) {
      const entries = Array.from(store.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      const { gte, lt } = opts
      const filtered = entries.filter(([key]) => {
        if (gte && key < gte) return false
        if (lt && key >= lt) return false
        return true
      })
      let i = 0
      return {
        [Symbol.asyncIterator] () {
          return this
        },
        async next () {
          if (i >= filtered.length) return { value: undefined, done: true }
          const entry = filtered[i++]
          return { value: entry, done: false }
        },
        async close () {}
      }
    }
  }
}

const FOLLOWER = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const FOLLOWEE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const OTHER_FOLLOWER = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'

describe('#FollowQuery', () => {
  it('should throw when followsDb is missing', () => {
    assert.throws(() => new FollowQuery({}), /followsDb required/)
  })

  it('isFollowing returns false when no follow record exists', async () => {
    const query = new FollowQuery({ followsDb: makeFollowsDb({}) })
    const result = await query.isFollowing(FOLLOWER, FOLLOWEE)
    assert.equal(result, false)
  })

  it('isFollowing returns true for an active follow record', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const followsDb = makeFollowsDb({
      [`${FOLLOWER}:${hash160}`]: { followerAddr: FOLLOWER, followeePkHash: hash160, unfollow: false }
    })
    const query = new FollowQuery({ followsDb })
    const result = await query.isFollowing(FOLLOWER, FOLLOWEE)
    assert.equal(result, true)
  })

  it('isFollowing returns false when the latest record is an unfollow', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const followsDb = makeFollowsDb({
      [`${FOLLOWER}:${hash160}`]: { followerAddr: FOLLOWER, followeePkHash: hash160, unfollow: true }
    })
    const query = new FollowQuery({ followsDb })
    const result = await query.isFollowing(FOLLOWER, FOLLOWEE)
    assert.equal(result, false)
  })

  it('listFollowing returns active followees for a follower', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const hash160Two = '44c44cfcb6e4e00386c7b0d14eaac6b7f47695e3'
    const followsDb = makeFollowsDb({
      [`${FOLLOWER}:${hash160}`]: { followerAddr: FOLLOWER, followeePkHash: hash160, unfollow: false },
      [`${FOLLOWER}:${hash160Two}`]: { followerAddr: FOLLOWER, followeePkHash: hash160Two, unfollow: true },
      [`${OTHER_FOLLOWER}:${hash160}`]: { followerAddr: OTHER_FOLLOWER, followeePkHash: hash160, unfollow: false }
    })
    const query = new FollowQuery({ followsDb })
    const result = await query.listFollowing(FOLLOWER)
    assert.deepEqual(result, [FOLLOWEE])
  })

  it('listFollowers returns active followers for a followee', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const followsDb = makeFollowsDb({
      [`${FOLLOWER}:${hash160}`]: { followerAddr: FOLLOWER, followeePkHash: hash160, unfollow: false },
      [`${OTHER_FOLLOWER}:${hash160}`]: { followerAddr: OTHER_FOLLOWER, followeePkHash: hash160, unfollow: false },
      [`${FOLLOWER}:44c44cfcb6e4e00386c7b0d14eaac6b7f47695e3`]: { followerAddr: FOLLOWER, followeePkHash: '44c44cfcb6e4e00386c7b0d14eaac6b7f47695e3', unfollow: false }
    })
    const query = new FollowQuery({ followsDb })
    const result = await query.listFollowers(FOLLOWEE)
    assert.sameMembers(result, [FOLLOWER, OTHER_FOLLOWER])
  })

  it('listFollowers ignores unfollow records', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const followsDb = makeFollowsDb({
      [`${FOLLOWER}:${hash160}`]: { followerAddr: FOLLOWER, followeePkHash: hash160, unfollow: true }
    })
    const query = new FollowQuery({ followsDb })
    const result = await query.listFollowers(FOLLOWEE)
    assert.deepEqual(result, [])
  })
})
