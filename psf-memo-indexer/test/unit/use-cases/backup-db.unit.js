import { assert } from 'chai'
import sinon from 'sinon'
import BackupDb from '../../../src/use-cases/backup-db.js'

describe('#BackupDb', () => {
  let uut
  let sandbox
  let adapters

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    adapters = {
      dbCtrl: {
        backupDb: sandbox.stub().resolves(true)
      }
    }
    uut = new BackupDb({ adapters })
  })

  afterEach(() => sandbox.restore())

  describe('#maybeBackupDb', () => {
    it('should request a backup at an epoch boundary', async () => {
      const result = await uut.maybeBackupDb(1000, 1000)

      assert.equal(result, true)
      assert.equal(adapters.dbCtrl.backupDb.callCount, 1)
      assert.deepEqual(adapters.dbCtrl.backupDb.firstCall.args, [1000, 1000])
    })

    it('should request a backup at a multiple of the epoch', async () => {
      const result = await uut.maybeBackupDb(2000, 1000)

      assert.equal(result, true)
      assert.equal(adapters.dbCtrl.backupDb.callCount, 1)
      assert.deepEqual(adapters.dbCtrl.backupDb.firstCall.args, [2000, 1000])
    })

    it('should not request a backup between epoch boundaries', async () => {
      const result = await uut.maybeBackupDb(1001, 1000)

      assert.equal(result, false)
      assert.equal(adapters.dbCtrl.backupDb.callCount, 0)
    })

    it('should not request a backup at height zero', async () => {
      const result = await uut.maybeBackupDb(0, 1000)

      assert.equal(result, false)
      assert.equal(adapters.dbCtrl.backupDb.callCount, 0)
    })

    it('should support a configurable epoch smaller than 1000', async () => {
      const result = await uut.maybeBackupDb(500, 500)

      assert.equal(result, true)
      assert.equal(adapters.dbCtrl.backupDb.callCount, 1)
      assert.deepEqual(adapters.dbCtrl.backupDb.firstCall.args, [500, 500])
    })

    it('should not request a backup just past a non-1000 epoch boundary', async () => {
      const result = await uut.maybeBackupDb(1001, 500)

      assert.equal(result, false)
      assert.equal(adapters.dbCtrl.backupDb.callCount, 0)
    })
  })
})
