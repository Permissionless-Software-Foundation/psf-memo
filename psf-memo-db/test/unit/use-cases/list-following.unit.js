/*
  Unit tests for the ListFollowing use case.
*/

import { assert } from 'chai'
import ListFollowing from '../../../src/use-cases/list-following.js'

function makeAdapters (following) {
  return {
    followQuery: {
      async listFollowing (followerAddr) {
        return following
      }
    }
  }
}

describe('#ListFollowing', () => {
  it('should throw when adapters is missing', () => {
    assert.throws(() => new ListFollowing({}), /Adapters required/)
  })

  it('should throw when followQuery adapter is missing', () => {
    assert.throws(() => new ListFollowing({ adapters: {} }), /followQuery adapter required/)
  })

  it('should return the following list', async () => {
    const useCase = new ListFollowing({ adapters: makeAdapters(['bitcoincash:a', 'bitcoincash:b']) })
    const result = await useCase.execute({ followerAddr: 'bitcoincash:follower' })
    assert.deepEqual(result, {
      followerAddr: 'bitcoincash:follower',
      following: ['bitcoincash:a', 'bitcoincash:b']
    })
  })

  it('should reject a missing followerAddr', async () => {
    const useCase = new ListFollowing({ adapters: makeAdapters([]) })
    try {
      await useCase.execute({})
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /followerAddr is required/)
    }
  })
})
