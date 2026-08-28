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
