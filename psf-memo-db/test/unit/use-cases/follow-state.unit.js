/*
  Unit tests for the FollowState use case.
*/

import { assert } from 'chai'
import FollowState from '../../../src/use-cases/follow-state.js'

function makeAdapters (isFollowingResult) {
  return {
    followQuery: {
      async isFollowing (followerAddr, followeeAddr) {
        return isFollowingResult
      }
    }
  }
}

describe('#FollowState', () => {
  it('should throw when adapters is missing', () => {
    assert.throws(() => new FollowState({}), /Adapters required/)
  })

  it('should throw when followQuery adapter is missing', () => {
    assert.throws(() => new FollowState({ adapters: {} }), /followQuery adapter required/)
  })

  it('should return following=true', async () => {
    const useCase = new FollowState({ adapters: makeAdapters(true) })
    const result = await useCase.execute({
      followerAddr: 'bitcoincash:follower',
      followeeAddr: 'bitcoincash:followee'
    })
    assert.deepEqual(result, {
      followerAddr: 'bitcoincash:follower',
      followeeAddr: 'bitcoincash:followee',
      following: true
    })
  })

  it('should return following=false', async () => {
    const useCase = new FollowState({ adapters: makeAdapters(false) })
    const result = await useCase.execute({
      followerAddr: 'bitcoincash:follower',
      followeeAddr: 'bitcoincash:followee'
    })
    assert.deepEqual(result, {
      followerAddr: 'bitcoincash:follower',
      followeeAddr: 'bitcoincash:followee',
      following: false
    })
  })

  it('should reject a missing followerAddr', async () => {
    const useCase = new FollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ followeeAddr: 'bitcoincash:followee' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /followerAddr is required/)
    }
  })

  it('should reject a missing followeeAddr', async () => {
    const useCase = new FollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ followerAddr: 'bitcoincash:follower' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /followeeAddr is required/)
    }
  })

  it('should reject an empty-string followerAddr', async () => {
    const useCase = new FollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ followerAddr: '', followeeAddr: 'bitcoincash:followee' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /followerAddr is required/)
    }
  })

  it('should reject an empty-string followeeAddr', async () => {
    const useCase = new FollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ followerAddr: 'bitcoincash:follower', followeeAddr: '' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /followeeAddr is required/)
    }
  })

  it('should reject a non-string followerAddr', async () => {
    const useCase = new FollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ followerAddr: 42, followeeAddr: 'bitcoincash:followee' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /followerAddr is required/)
    }
  })
})
