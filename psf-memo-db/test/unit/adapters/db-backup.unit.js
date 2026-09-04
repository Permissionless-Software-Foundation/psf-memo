/*
  Unit tests for DbBackup zip/unzip adapter.

  The adapter shells out to the system `zip`/`unzip` commands via shelljs,
  so the shell and config are mocked here to keep the tests hermetic.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import fs from 'fs'
import DbBackup from '../../../src/adapters/db-backup.js'

describe('#DbBackup', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(fs, 'existsSync').returns(true)
    uut = new DbBackup({})
    uut.shell = {
      cd: sandbox.stub(),
      exec: sandbox.stub(),
      test: sandbox.stub().returns(false),
      rm: sandbox.stub(),
      cp: sandbox.stub()
    }
    uut.config = { backupQty: 3, exitOnMissingBackup: false }
    uut.closeAll = sandbox.stub().resolves()
    uut.openAll = sandbox.stub().resolves()
  })

  afterEach(() => sandbox.restore())

  describe('zipDb', () => {
    it('zips the current database and reopens the dbs', async () => {
      const result = await uut.zipDb(600000, 1)

      assert.equal(result, true)
      assert.equal(uut.closeAll.callCount, 1)
      assert.equal(uut.openAll.callCount, 1)
      assert.equal(uut.shell.exec.callCount, 1)
      assert.match(uut.shell.exec.firstCall.args[0], /memo-indexer-600000\.zip/)
    })

    it('removes the oldest backup when backupQty and epoch are set', async () => {
      uut.shell.test.returns(true)
      await uut.zipDb(600000, 1)

      assert.equal(uut.shell.rm.callCount, 1)
      assert.match(uut.shell.rm.firstCall.args[0], /memo-indexer-599997\.zip/)
    })

    it('does not remove a backup when the old file is absent', async () => {
      uut.shell.test.returns(false)
      await uut.zipDb(600000, 1)

      assert.equal(uut.shell.rm.callCount, 0)
    })

    it('rethrows errors from the shell', async () => {
      uut.shell.exec.throws(new Error('zip failed'))
      let threw = false
      try {
        await uut.zipDb(600000, 1)
      } catch (err) {
        threw = true
        assert.match(err.message, /zip failed/)
      }
      assert.equal(threw, true)
    })
  })

  describe('unzipDb', () => {
    it('restores the current database from a zip', async () => {
      const result = await uut.unzipDb(600000)

      assert.equal(result, true)
      assert.equal(uut.closeAll.callCount, 1)
      assert.equal(uut.openAll.callCount, 1)
      assert.equal(uut.shell.exec.callCount, 1)
      assert.match(uut.shell.exec.firstCall.args[0], /unzip -o memo-indexer-600000\.zip/)
    })

    it('returns false when the backup file is missing', async () => {
      fs.existsSync.returns(false)
      const result = await uut.unzipDb(999999)

      assert.equal(result, false)
      assert.equal(uut.closeAll.callCount, 0)
    })
  })
})
