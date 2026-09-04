/*
  Backup and restore for Memo indexer LevelDB.
*/

import shell from 'shelljs'
import fs from 'fs'
import config from '../../config/index.js'
import { DB_NAMES, dbDir } from './level-db.js'
import { zipFileName, oldBackupHeight, oldBackupZipPath, backupFilePath } from './lib/db-backup-util.js'

class DbBackup {
  constructor (levelDbs = {}) {
    for (const name of DB_NAMES) {
      this[`${name}Db`] = levelDbs[`${name}Db`]
    }
    this.shell = shell
    this.config = config
    this.zipDb = this.zipDb.bind(this)
    this.unzipDb = this.unzipDb.bind(this)
  }

  async closeAll () {
    for (const name of DB_NAMES) {
      await this[`${name}Db`].close()
    }
  }

  async openAll () {
    for (const name of DB_NAMES) {
      await this[`${name}Db`].open()
    }
  }

  async zipDb (height, epoch) {
    try {
      await this.closeAll()

      this.shell.cd(dbDir)
      this.shell.exec(`zip -r zips/${zipFileName(height)} current`)

      const backupQty = this.config.backupQty
      if (backupQty && epoch) {
        const oldHeight = oldBackupHeight(height, epoch, backupQty)
        const rmStr = oldBackupZipPath(oldHeight)
        if (this.shell.test('-f', rmStr)) {
          this.shell.rm(rmStr)
        }
      }

      await this.openAll()
      return true
    } catch (err) {
      console.error('Error in zipDb')
      throw err
    }
  }

  async unzipDb (height) {
    try {
      const zipFile = zipFileName(height)
      const zipFilePath = backupFilePath(dbDir, height)

      if (!fs.existsSync(zipFilePath)) {
        console.error(`Backup file not found: ${zipFile}`)
        if (this.config.exitOnMissingBackup) {
          process.exit(1)
        }
        return false
      }

      await this.closeAll()

      this.shell.rm('-rf', `${dbDir}/current/*`)
      this.shell.cd(`${dbDir}/zips`)
      this.shell.exec(`unzip -o ${zipFile}`)
      this.shell.cp('-r', `${dbDir}/zips/current/*`, `${dbDir}/current/`)

      await this.openAll()
      return true
    } catch (err) {
      console.error('Error in unzipDb: ', err)
      return false
    }
  }
}

export default DbBackup
