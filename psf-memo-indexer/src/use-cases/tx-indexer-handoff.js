/*
  Retry the TX indexer handoff until it succeeds.

  After initial block download the block indexer asks the TX (mempool) indexer
  to start through its REST control endpoint. That request can fail or the
  endpoint can be unreachable; a failed handoff must never stop block indexing.
  This use case retries the request in the background every configured interval
  (default 10s, see config.txIndexerHandoffRetryMs) until it succeeds.

  The retry loop is separated from the network adapter so it can be unit tested
  with an injected start function and sleep. `maxRetries` bounds the loop for
  tests and diagnostics; production uses the default of retrying forever.
*/

import config from '../../config/index.js'

function defaultSleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class TxIndexerHandoff {
  constructor (localConfig = {}) {
    if (typeof localConfig.startTxIndexer !== 'function') {
      throw new Error('startTxIndexer required for tx-indexer-handoff.js')
    }
    this.startTxIndexer = localConfig.startTxIndexer
    this.sleep = localConfig.sleep || defaultSleep
    this.endpoint = localConfig.endpoint || (() => ({}))
    this.log = localConfig.log || (() => {})
    this.retryIntervalMs =
      localConfig.retryIntervalMs ?? config.txIndexerHandoffRetryMs
    this.run = this.run.bind(this)
    this.logFailure = this.logFailure.bind(this)
    this.startInBackground = this.startInBackground.bind(this)
  }

  async run ({ maxRetries, retryIntervalMs } = {}) {
    const interval = retryIntervalMs ?? this.retryIntervalMs
    let attempts = 0
    let retries = 0
    const waits = []

    while (true) {
      attempts++
      try {
        await this.startTxIndexer()
        return { started: true, attempts, retries, waits }
      } catch (err) {
        // Failure is expected while the TX indexer is not ready. Never fail
        // silently: name the endpoint and announce the automatic retry.
        this.logFailure(err, interval)
      }

      if (maxRetries !== undefined && maxRetries !== null && retries >= maxRetries) {
        return { started: false, attempts, retries, waits }
      }

      retries++
      waits.push(interval)
      await this.sleep(interval)
    }
  }

  logFailure (err, interval) {
    const { ip, port } = this.endpoint()
    this.log(
      `TX indexer handoff failed for IP ${ip} port ${port}: ${err.message}. ` +
        `Retrying in ${interval} milliseconds.`
    )
  }

  // Fire-and-forget entry point for the block indexer. A failed handoff must
  // never reject into (and stop) the block indexing loop.
  startInBackground (options) {
    return this.run(options).catch(() => ({
      started: false,
      attempts: 0,
      retries: 0,
      waits: []
    }))
  }
}

export default TxIndexerHandoff

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T18:29:32.487Z","module_hash":"a97ebdb3440029ccc0c9ed58f59a82ac0cef603e6f8761ff68f217b2e5c6bb4e","functions":[{"id":"func/defaultSleep","name":"defaultSleep","line":17,"end_line":19,"hash":"23aa9df91da50c4a4d42ff6b0863ace10a10dca26373b98b2f7fd053130f4749"},{"id":"func/TxIndexerHandoff.constructor","name":"TxIndexerHandoff.constructor","line":22,"end_line":32,"hash":"1f98b806565edad8fdf84e1f4265f777c211d6a29b34ff6ac904251af3095292"},{"id":"func/TxIndexerHandoff.run","name":"TxIndexerHandoff.run","line":34,"end_line":57,"hash":"15aba5cada32021d43bc7b408623cb71b0f6f7bdc9fec56ae993f3451163a654"},{"id":"func/TxIndexerHandoff.startInBackground","name":"TxIndexerHandoff.startInBackground","line":61,"end_line":68,"hash":"2898e9a1de65d4513b8fda442e713bafd37c371cc0a9e38b312baacbaebdcc57"}]}
// mutate4javascript-manifest-end
