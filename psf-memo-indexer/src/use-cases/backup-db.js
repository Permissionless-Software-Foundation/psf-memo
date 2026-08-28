/*
  Decide when the indexer should ask psf-memo-db to back up its LevelDB.
*/

class BackupDb {
  constructor (localConfig = {}) {
    if (!localConfig.adapters) {
      throw new Error('Adapters required for backup-db.js')
    }
    this.adapters = localConfig.adapters
    this.maybeBackupDb = this.maybeBackupDb.bind(this)
  }

  async maybeBackupDb (blockHeight, epoch) {
    const height = parseInt(blockHeight, 10)
    const backupEpoch = parseInt(epoch, 10)

    if (height > 0 && height % backupEpoch === 0) {
      await this.adapters.dbCtrl.backupDb(height, backupEpoch)
      return true
    }

    return false
  }
}

export default BackupDb

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T17:14:22.022Z","module_hash":"5bb4a36a5e28a1be19c5e544518576bafd81b30df24db30b8ca64690f300c27c","functions":[{"id":"func/BackupDb.constructor","name":"BackupDb.constructor","line":6,"end_line":12,"hash":"50c4a5ffabb1fe5848ab489c49aeebca4e8a808fd773ab9e603fc55d85fff08d"},{"id":"func/BackupDb.maybeBackupDb","name":"BackupDb.maybeBackupDb","line":14,"end_line":24,"hash":"0fc3ba6a7f6cfc52b05103e7ff164318d0a11f56372d307a2e6f3c5220df0a59"}]}
// mutate4javascript-manifest-end
