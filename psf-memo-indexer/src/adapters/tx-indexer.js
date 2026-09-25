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
    const response = await this.axios.get(
      `http://${this.config.txRestApiIp}:${this.config.txRestApiPort}/tx-start`,
      { timeout: this.config.txIndexerHandoffTimeoutMs }
    )
    console.log('TX indexer start response:', response.data)
    return true
  }
}

export default TxIndexerAdapter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T18:27:07.039Z","module_hash":"b2e38fff5c399ab525b3f86d5ad0984b4dab8fd4e906da2075a98ef8b772eea8","functions":[{"id":"func/TxIndexerAdapter.constructor","name":"TxIndexerAdapter.constructor","line":13,"end_line":16,"hash":"eca882ae1698511c8aef056c2d95b30b981af53b0be527a3a8c76219e1d7ae07"},{"id":"func/TxIndexerAdapter.startTxIndexer","name":"TxIndexerAdapter.startTxIndexer","line":18,"end_line":25,"hash":"7326457687b76aad089f069b73959a5fc5baa1934578ec45e1fa1bcbbb4e7d7d"}]}
// mutate4javascript-manifest-end
