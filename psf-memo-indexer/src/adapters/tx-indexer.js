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
