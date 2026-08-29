/*
  Unit tests for the ListMuted use case.
*/

import { assert } from 'chai'
import ListMuted from '../../../src/use-cases/list-muted.js'

function makeAdapters (listResult) {
  return {
    muteQuery: {
      async listMuted (muterAddr) {
        return listResult
      }
    }
  }
}

describe('#ListMuted', () => {
  it('should throw when adapters is missing', () => {
    assert.throws(() => new ListMuted({}), /Adapters required/)
  })

  it('should throw when muteQuery adapter is missing', () => {
    assert.throws(() => new ListMuted({ adapters: {} }), /muteQuery adapter required/)
  })

  it('should return muted list', async () => {
    const useCase = new ListMuted({ adapters: makeAdapters(['bitcoincash:a', 'bitcoincash:b']) })
    const result = await useCase.execute({ muterAddr: 'bitcoincash:muter' })
    assert.deepEqual(result, {
      muterAddr: 'bitcoincash:muter',
      muted: ['bitcoincash:a', 'bitcoincash:b']
    })
  })

  it('should reject a missing muterAddr', async () => {
    const useCase = new ListMuted({ adapters: makeAdapters([]) })
    try {
      await useCase.execute({})
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /muterAddr is required/)
    }
  })
})
