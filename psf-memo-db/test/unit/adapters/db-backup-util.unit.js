/*
  Unit tests for DbBackup pure helpers.
*/

import { assert } from 'chai'
import {
  zipFileName,
  oldBackupHeight,
  oldBackupZipPath,
  backupFilePath
} from '../../../src/adapters/lib/db-backup-util.js'

describe('#DbBackupUtil', () => {
  describe('zipFileName', () => {
    it('builds the zip file name for a height', () => {
      assert.equal(zipFileName(600000), 'memo-indexer-600000.zip')
    })
  })

  describe('oldBackupHeight', () => {
    it('computes the height of the oldest retained backup', () => {
      assert.equal(oldBackupHeight(600000, 1, 3), 599997)
      assert.equal(oldBackupHeight(600000, 2, 3), 599994)
    })
  })

  describe('oldBackupZipPath', () => {
    it('builds the zips-relative path for an old backup', () => {
      assert.equal(oldBackupZipPath(599997), 'zips/memo-indexer-599997.zip')
    })
  })

  describe('backupFilePath', () => {
    it('builds the absolute zip file path for a height', () => {
      assert.equal(backupFilePath('/data/leveldb', 600000), '/data/leveldb/zips/memo-indexer-600000.zip')
    })
  })
})
