import { assert } from 'chai'
import sinon from 'sinon'
import config from '../../../config/index.js'
import TxIndexerAdapter from '../../../src/adapters/tx-indexer.js'

describe('#TxIndexerAdapter', () => {
  let sandbox
  let uut
  let get

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    get = sandbox.stub()
    uut = new TxIndexerAdapter({
      axios: { get },
      config: {
        txRestApiIp: 'tx.example',
        txRestApiPort: 5455,
        txIndexerHandoffTimeoutMs: 1234
      }
    })
  })

  afterEach(() => sandbox.restore())

  it('should request the TX indexer start endpoint with a bounded timeout', async () => {
    get.resolves({ data: { started: true } })

    const result = await uut.startTxIndexer()

    assert.equal(result, true)
    assert.isTrue(get.calledOnce)
    assert.equal(get.firstCall.args[0], 'http://tx.example:5455/tx-start')
    assert.deepEqual(get.firstCall.args[1], { timeout: 1234 })
  })

  it('should fall back to the shared config for the endpoint and timeout', async () => {
    get.resolves({ data: { started: true } })
    const fallback = new TxIndexerAdapter({ axios: { get } })

    await fallback.startTxIndexer()

    assert.equal(
      get.firstCall.args[0],
      `http://${config.txRestApiIp}:${config.txRestApiPort}/tx-start`
    )
    assert.deepEqual(get.firstCall.args[1], {
      timeout: config.txIndexerHandoffTimeoutMs
    })
  })

  it('should propagate a request failure', async () => {
    get.rejects(new Error('TX indexer unreachable'))

    let error
    try {
      await uut.startTxIndexer()
    } catch (err) {
      error = err
    }

    assert.equal(error?.message, 'TX indexer unreachable')
  })
})
