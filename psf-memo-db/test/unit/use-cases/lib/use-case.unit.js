import { assert } from 'chai'
import { ListUseCase } from '../../../../src/use-cases/lib/use-case.js'

class DummyUseCase extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'DummyUseCase', adapterName: 'postQuery' })
  }

  async execute (inObj = {}) {
    return inObj
  }
}

describe('#ListUseCase', () => {
  it('should throw when adapters is missing', () => {
    let thrown
    try {
      // eslint-disable-next-line no-new
      new DummyUseCase({})
    } catch (err) {
      thrown = err
    }
    assert.isDefined(thrown)
    assert.include(thrown.message, 'Adapters required when instantiating DummyUseCase use case.')
  })

  it('should throw when the required adapter is missing', () => {
    let thrown
    try {
      // eslint-disable-next-line no-new
      new DummyUseCase({ adapters: {} })
    } catch (err) {
      thrown = err
    }
    assert.isDefined(thrown)
    assert.include(thrown.message, 'postQuery adapter required for DummyUseCase use case.')
  })

  it('should bind execute to the instance', () => {
    const uut = new DummyUseCase({ adapters: { postQuery: {} } })
    assert.equal(typeof uut.execute, 'function')
    const bound = uut.execute
    return bound({ ok: true }).then((result) => assert.deepEqual(result, { ok: true }))
  })
})
