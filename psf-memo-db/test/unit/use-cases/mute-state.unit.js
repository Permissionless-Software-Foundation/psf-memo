/*
  Unit tests for the MuteState use case.
*/

import { assert } from 'chai'
import MuteState from '../../../src/use-cases/mute-state.js'

function makeAdapters (isMutedResult) {
  return {
    muteQuery: {
      async isMuted (muterAddr, muteeAddr) {
        return isMutedResult
      }
    }
  }
}

describe('#MuteState', () => {
  it('should throw when adapters is missing', () => {
    assert.throws(() => new MuteState({}), /Adapters required/)
  })

  it('should throw when muteQuery adapter is missing', () => {
    assert.throws(() => new MuteState({ adapters: {} }), /muteQuery adapter required/)
  })

  it('should return muted=true', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(true) })
    const result = await useCase.execute({
      muterAddr: 'bitcoincash:muter',
      muteeAddr: 'bitcoincash:mutee'
    })
    assert.deepEqual(result, {
      muterAddr: 'bitcoincash:muter',
      muteeAddr: 'bitcoincash:mutee',
      muted: true
    })
  })

  it('should return muted=false', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(false) })
    const result = await useCase.execute({
      muterAddr: 'bitcoincash:muter',
      muteeAddr: 'bitcoincash:mutee'
    })
    assert.deepEqual(result, {
      muterAddr: 'bitcoincash:muter',
      muteeAddr: 'bitcoincash:mutee',
      muted: false
    })
  })

  it('should reject a missing muterAddr', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ muteeAddr: 'bitcoincash:mutee' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /muterAddr is required/)
    }
  })

  it('should reject a missing muteeAddr', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ muterAddr: 'bitcoincash:muter' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /muteeAddr is required/)
    }
  })

  it('should reject an empty-string muterAddr', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ muterAddr: '', muteeAddr: 'bitcoincash:mutee' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /muterAddr is required/)
    }
  })

  it('should reject a non-string muterAddr', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ muterAddr: 123, muteeAddr: 'bitcoincash:mutee' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /muterAddr is required/)
    }
  })

  it('should reject an empty-string muteeAddr', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ muterAddr: 'bitcoincash:muter', muteeAddr: '' })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /muteeAddr is required/)
    }
  })

  it('should reject a non-string muteeAddr', async () => {
    const useCase = new MuteState({ adapters: makeAdapters(false) })
    try {
      await useCase.execute({ muterAddr: 'bitcoincash:muter', muteeAddr: 456 })
      assert.fail('expected error')
    } catch (err) {
      assert.match(err.message, /muteeAddr is required/)
    }
  })
})
