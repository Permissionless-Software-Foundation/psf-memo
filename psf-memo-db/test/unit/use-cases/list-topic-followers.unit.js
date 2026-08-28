import { assert } from 'chai'
import ListTopicFollowers from '../../../src/use-cases/list-topic-followers.js'

function makeAdapters (followers) {
  return {
    topicQuery: {
      async listRoomFollowers (room) {
        return followers
      }
    }
  }
}

describe('#ListTopicFollowers', () => {
  it('should throw when adapters is missing', () => {
    assert.throws(() => new ListTopicFollowers({}), /Adapters required/)
  })

  it('should throw when topicQuery adapter is missing', () => {
    assert.throws(() => new ListTopicFollowers({ adapters: {} }), /topicQuery adapter required/)
  })

  it('should return the followers list', async () => {
    const useCase = new ListTopicFollowers({ adapters: makeAdapters(['bitcoincash:a', 'bitcoincash:b']) })
    const result = await useCase.execute({ room: 'bitcoin' })
    assert.deepEqual(result, {
      room: 'bitcoin',
      followers: ['bitcoincash:a', 'bitcoincash:b']
    })
  })

  it('should return an empty list', async () => {
    const useCase = new ListTopicFollowers({ adapters: makeAdapters([]) })
    const result = await useCase.execute({ room: 'lone' })
    assert.deepEqual(result, {
      room: 'lone',
      followers: []
    })
  })

  it('should reject a missing room', async () => {
    const useCase = new ListTopicFollowers({ adapters: makeAdapters([]) })
    try {
      await useCase.execute({})
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /room is required/)
    }
  })

  it('should reject an empty-string room', async () => {
    const useCase = new ListTopicFollowers({ adapters: makeAdapters([]) })
    try {
      await useCase.execute({ room: '' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /room is required/)
    }
  })

  it('should reject a non-string room', async () => {
    const useCase = new ListTopicFollowers({ adapters: makeAdapters([]) })
    try {
      await useCase.execute({ room: 42 })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /room is required/)
    }
  })
})
