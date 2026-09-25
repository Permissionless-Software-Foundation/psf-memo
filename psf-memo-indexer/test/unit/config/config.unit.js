/*
  Boundary tests for the indexer config module.

  Config is the single seam between process environment and the rest of the
  indexer. These tests pin the documented defaults so a fallback cannot be
  silently inverted (e.g. `||` -> `&&`), and pin the two TX-indexer handoff
  defaults added with the retry feature. The module is re-imported with a
  cache-busting query after clearing the relevant env vars, so the assertions
  do not depend on the ambient environment.
*/

import { assert } from 'chai'

const ENV_KEYS = [
  'PSF_MEMO_DB_URL',
  'RPC_IP',
  'RPC_PORT',
  'ZMQ_PORT',
  'RPC_USER',
  'RPC_PASS',
  'TX_REST_API_IP',
  'TX_INDEXER_HANDOFF_RETRY_MS',
  'TX_INDEXER_HANDOFF_TIMEOUT_MS',
  'DEBUG_LEVEL'
]

describe('#config', () => {
  const saved = {}
  let config

  before(async () => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
    config = (await import(`../../../config/index.js?config-defaults`)).default
  })

  after(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('should fall back to the documented connection defaults', () => {
    assert.equal(config.psfMemoDbUrl, 'http://localhost:5021')
    assert.equal(config.rpcIp, '172.17.0.1')
    assert.equal(config.rpcPort, '8332')
    assert.equal(config.zmqPort, '28332')
    assert.equal(config.rpcUser, 'bitcoin')
    assert.equal(config.rpcPass, 'password')
    assert.equal(config.txRestApiIp, 'localhost')
  })

  it('should default the TX indexer handoff to a 10s retry and 10s timeout', () => {
    assert.equal(config.txIndexerHandoffRetryMs, 10000)
    assert.equal(config.txIndexerHandoffTimeoutMs, 10000)
  })

  it('should default debugLevel to 0', () => {
    assert.equal(config.debugLevel, 0)
  })
})
