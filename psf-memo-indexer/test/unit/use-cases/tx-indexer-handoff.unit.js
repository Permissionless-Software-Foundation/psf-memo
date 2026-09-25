import { assert } from 'chai'
import sinon from 'sinon'
import config from '../../../config/index.js'
import TxIndexerHandoff from '../../../src/use-cases/tx-indexer-handoff.js'

describe('#TxIndexerHandoff', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  it('should throw when the start request is missing', () => {
    assert.throws(() => new TxIndexerHandoff(), /startTxIndexer required/)
  })

  it('should start the TX indexer without retrying when the first attempt succeeds', async () => {
    const startTxIndexer = sandbox.stub().resolves(true)
    const sleep = sandbox.stub().resolves()
    const uut = new TxIndexerHandoff({ startTxIndexer, sleep, retryIntervalMs: 10000 })

    const result = await uut.run()

    assert.deepEqual(result, { started: true, attempts: 1, retries: 0, waits: [] })
    assert.equal(startTxIndexer.callCount, 1)
    assert.equal(sleep.callCount, 0)
  })

  it('should retry until the TX indexer endpoint succeeds', async () => {
    let calls = 0
    const startTxIndexer = sandbox.stub().callsFake(async () => {
      calls++
      if (calls <= 4) throw new Error('endpoint down')
      return true
    })
    const sleep = sandbox.stub().resolves()
    const uut = new TxIndexerHandoff({ startTxIndexer, sleep, retryIntervalMs: 5000 })

    const result = await uut.run()

    assert.deepEqual(result, {
      started: true,
      attempts: 5,
      retries: 4,
      waits: [5000, 5000, 5000, 5000]
    })
    assert.equal(sleep.callCount, 4)
  })

  it('should stop after maxRetries when the endpoint stays unreachable', async () => {
    const startTxIndexer = sandbox.stub().rejects(new Error('endpoint down'))
    const sleep = sandbox.stub().resolves()
    const uut = new TxIndexerHandoff({ startTxIndexer, sleep, retryIntervalMs: 1000 })

    const result = await uut.run({ maxRetries: 3 })

    assert.deepEqual(result, {
      started: false,
      attempts: 4,
      retries: 3,
      waits: [1000, 1000, 1000]
    })
    assert.equal(sleep.callCount, 3)
  })

  it('should default the retry interval to the shared config', async () => {
    assert.equal(config.txIndexerHandoffRetryMs, 10000)
    const startTxIndexer = sandbox.stub().rejects(new Error('endpoint down'))
    const sleep = sandbox.stub().resolves()
    const uut = new TxIndexerHandoff({ startTxIndexer, sleep })

    const result = await uut.run({ maxRetries: 2 })

    assert.deepEqual(result.waits, [
      config.txIndexerHandoffRetryMs,
      config.txIndexerHandoffRetryMs
    ])
  })

  it('should let a per-run interval override the configured interval', async () => {
    const startTxIndexer = sandbox.stub().rejects(new Error('endpoint down'))
    const sleep = sandbox.stub().resolves()
    const uut = new TxIndexerHandoff({ startTxIndexer, sleep, retryIntervalMs: 10000 })

    const result = await uut.run({ maxRetries: 2, retryIntervalMs: 250 })

    assert.deepEqual(result.waits, [250, 250])
  })

  it('should fall back to the real setTimeout sleep', async () => {
    let calls = 0
    const startTxIndexer = sandbox.stub().callsFake(async () => {
      calls++
      if (calls <= 1) throw new Error('endpoint down')
      return true
    })
    const uut = new TxIndexerHandoff({ startTxIndexer, retryIntervalMs: 0 })

    const result = await uut.run()

    assert.equal(result.started, true)
    assert.equal(result.attempts, 2)
    assert.deepEqual(result.waits, [0])
  })

  it('should not reject when started in the background', async () => {
    const startTxIndexer = sandbox.stub().rejects(new Error('endpoint down'))
    const sleep = sandbox.stub().rejects(new Error('sleep failed'))
    const uut = new TxIndexerHandoff({ startTxIndexer, sleep })

    const result = await uut.startInBackground()

    assert.deepEqual(result, {
      started: false,
      attempts: 0,
      retries: 0,
      waits: []
    })
  })
})
