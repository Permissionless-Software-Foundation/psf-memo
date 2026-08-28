import { assert } from 'chai'
import TopicFollowState from '../../../src/use-cases/topic-follow-state.js'

function makeAdapters (followingResult) {
  return {
    topicQuery: {
      async isFollowingRoom (addr, room) {
        return followingResult
      }
    }
  }
}

describe('#TopicFollowState', () => {
  it('should throw when adapters is missing', () => {
    assert.throws(() => new TopicFollowState({}), /Adapters required/)
  })

  it('should throw when topicQuery adapter is missing', () => {
    assert.throws(() => new TopicFollowState({ adapters: {} }), /topicQuery adapter required/)
  })

  it('should return following=true', async () => {
    const useCase = new TopicFollowState({ adapters: makeAdapters(true) })
    const result = await useCase.execute({ room: 'bitcoin', addr: 'bitcoincash:addr-a' })
    assert.deepEqual(result, {
      room: 'bitcoin',
      addr: 'bitcoincash:addr-a',
      following: true
    })
  })

  it('should return following=false', async () => {
    const useCase = new TopicFollowState({ adapters: makeAdapters(false) })
    const result = await useCase.execute({ room: 'bitcoin', addr: 'bitcoincash:addr-a' })
    assert.deepEqual(result, {
      room: 'bitcoin',
      addr: 'bitcoincash:addr-a',
      following: false
    })
  })

  it('should reject a missing room', async () => {
    const useCase = new TopicFollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ addr: 'bitcoincash:addr-a' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /room is required/)
    }
  })

  it('should reject a missing addr', async () => {
    const useCase = new TopicFollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ room: 'bitcoin' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /addr is required/)
    }
  })

  it('should reject an empty-string room', async () => {
    const useCase = new TopicFollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ room: '', addr: 'bitcoincash:addr-a' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /room is required/)
    }
  })

  it('should reject an empty-string addr', async () => {
    const useCase = new TopicFollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ room: 'bitcoin', addr: '' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /addr is required/)
    }
  })

  it('should reject a non-string room', async () => {
    const useCase = new TopicFollowState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ room: 42, addr: 'bitcoincash:addr-a' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /room is required/)
    }
  })
})
