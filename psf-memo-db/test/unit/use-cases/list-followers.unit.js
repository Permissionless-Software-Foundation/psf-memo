/*
  Unit tests for the ListFollowers use case.
*/

import { assert } from 'chai'
import ListFollowers from '../../../src/use-cases/list-followers.js'

function makeAdapters (followers) {
  return {
    followQuery: {
      async listFollowers (followeeAddr) {
        return followers
      }
    }
  }
}

describe('#ListFollowers', () => {
  it('should throw when adapters is missing', () => {
    assert.throws(() => new ListFollowers({}), /Adapters required/)
  })

  it('should throw when followQuery adapter is missing', () => {
    assert.throws(() => new ListFollowers({ adapters: {} }), /followQuery adapter required/)
  })

  it('should return the followers list', async () => {
    const useCase = new ListFollowers({ adapters: makeAdapters(['bitcoincash:a', 'bitcoincash:b']) })
    const result = await useCase.execute({ followeeAddr: 'bitcoincash:followee' })
    assert.deepEqual(result, {
      followeeAddr: 'bitcoincash:followee',
      followers: ['bitcoincash:a', 'bitcoincash:b']
    })
  })

  it('should reject a missing followeeAddr', async () => {
    const useCase = new ListFollowers({ adapters: makeAdapters([]) })
    try {
      await useCase.execute({})
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /followeeAddr is required/)
    }
  })
})
