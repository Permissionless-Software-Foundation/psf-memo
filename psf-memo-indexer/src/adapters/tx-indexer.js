/*
  Trigger TX indexer after block IBD completes.

  The request is bounded by a timeout so a hung control endpoint cannot stall
  the caller. Retrying a failed or unanswered handoff is owned by
  tx-indexer-handoff.js, which keeps block indexing alive.
*/

import axios from 'axios'
import config from '../../config/index.js'

class TxIndexerAdapter {
  constructor (localConfig = {}) {
    this.axios = localConfig.axios || axios
    this.config = localConfig.config || config
  }

  async startTxIndexer () {
    const { ip, port } = this.endpoint()
    const response = await this.axios.get(
      `http://${ip}:${port}/tx-start`,
      { timeout: this.config.txIndexerHandoffTimeoutMs }
    )
    console.log('TX indexer start response:', response.data)
    return true
  }

  // Describe the control endpoint so the retry loop can name it when a handoff
  // attempt fails.
  endpoint () {
    return { ip: this.config.txRestApiIp, port: this.config.txRestApiPort }
  }
}

export default TxIndexerAdapter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T19:23:00.532Z","module_hash":"4fdf7c3e86c97ec87efe85157b1a734e453b10721d6d53ba61e5935dc3dd9758","functions":[{"id":"func/TxIndexerAdapter.constructor","name":"TxIndexerAdapter.constructor","line":13,"end_line":16,"hash":"eca882ae1698511c8aef056c2d95b30b981af53b0be527a3a8c76219e1d7ae07"},{"id":"func/TxIndexerAdapter.startTxIndexer","name":"TxIndexerAdapter.startTxIndexer","line":18,"end_line":26,"hash":"491e3f5b934abe36ef690debfa18c9504c7baffd02bfd90a6e048abf11409964"},{"id":"func/TxIndexerAdapter.endpoint","name":"TxIndexerAdapter.endpoint","line":30,"end_line":32,"hash":"9b91248e877b2c8f1d81c8f2877b972f397329f6eb5013e1ab573415104fd928"}]}
// mutate4javascript-manifest-end
