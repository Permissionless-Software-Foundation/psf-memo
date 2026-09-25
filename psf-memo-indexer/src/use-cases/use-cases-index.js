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
// {"version":1,"tested_at":"2026-09-25T19:23:43.399Z","module_hash":"38a15a81f4817be165fc34b771723d42c94f5f29d2b9d978326d8700c2ee322d","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":9,"end_line":27,"hash":"ee5e293df0599dfc34bed1c2b7a9f983be4b31000ccf2d9899f5ba46b1cdac8f"},{"id":"func/UseCases.initUseCases","name":"UseCases.initUseCases","line":29,"end_line":32,"hash":"2ecb643dc5a45c136593e0a19832058189503cd4f146a6a7cbe71608c84a4ea3"}]}
// mutate4javascript-manifest-end
