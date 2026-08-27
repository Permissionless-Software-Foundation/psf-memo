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
    assert.throws(() => new DummyUseCase({}), Error, 'Adapters required when instantiating DummyUseCase use case.')
  })

  it('should throw when the required adapter is missing', () => {
    assert.throws(() => new DummyUseCase({ adapters: {} }), Error, 'postQuery adapter required for DummyUseCase use case.')
  })

  it('should bind execute to the instance', () => {
    const uut = new DummyUseCase({ adapters: { postQuery: {} } })
    assert.equal(typeof uut.execute, 'function')
    const bound = uut.execute
    return bound({ ok: true }).then((result) => assert.deepEqual(result, { ok: true }))
  })
})
