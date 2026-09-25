import RetryQueue from '@chris.troutner/retry-queue'
import BackupDb from './backup-db.js'
import IndexBlocks from './index-blocks.js'
import State from './state.js'
import Utils from './utils.js'
import TxIndexerHandoff from './tx-indexer-handoff.js'

class UseCases {
  constructor (localConfig = {}) {
    if (!localConfig.adapters) {
      throw new Error('Adapters required for use cases.')
    }
    this.adapters = localConfig.adapters
    this.indexBlocks = new IndexBlocks({ adapters: this.adapters })
    this.backupDb = new BackupDb({ adapters: this.adapters })
    this.state = new State({ adapters: this.adapters })
    this.utils = new Utils()
    this.retryQueue = new RetryQueue()
    this.txIndexerHandoff = new TxIndexerHandoff({
      startTxIndexer: this.adapters.txIndexerAdapter.startTxIndexer.bind(
        this.adapters.txIndexerAdapter
      ),
      endpoint: () => this.adapters.txIndexerAdapter.endpoint(),
      log: (message) => console.error(message)
    })
    this.initUseCases = this.initUseCases.bind(this)
  }

  async initUseCases () {
    console.log('Use cases initialized.')
    return true
  }
}

export default UseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T18:28:06.656Z","module_hash":"7f4265a51269317e76d4e7070f866c19f1a6c22bd641f56d82b12684b77a0be8","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":9,"end_line":25,"hash":"e421751064ccb1d41f73c273ac74d0ac31724b5f985face4dc11b70dc6acbca3"},{"id":"func/UseCases.initUseCases","name":"UseCases.initUseCases","line":27,"end_line":30,"hash":"2ecb643dc5a45c136593e0a19832058189503cd4f146a6a7cbe71608c84a4ea3"}]}
// mutate4javascript-manifest-end
