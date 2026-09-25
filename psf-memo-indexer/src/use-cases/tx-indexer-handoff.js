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
    this.retryIntervalMs =
      localConfig.retryIntervalMs ?? config.txIndexerHandoffRetryMs
    this.run = this.run.bind(this)
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
        // Failure is expected while the TX indexer is not ready; retry below.
      }

      if (maxRetries !== undefined && maxRetries !== null && retries >= maxRetries) {
        return { started: false, attempts, retries, waits }
      }

      retries++
      waits.push(interval)
      await this.sleep(interval)
    }
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
