/*
  Property tests for the indexer's DB backup decision.

  BackupDb.maybeBackupDb decides when the indexer should ask psf-memo-db to
  back up its LevelDB. The decision is a pure function of the block height and
  the configured epoch: a backup is requested exactly when the height is a
  positive multiple of the epoch. These properties pin that invariant across a
  broad range of heights and epochs, and confirm the decision is deterministic
  (idempotent) for repeated calls.
*/

import test from 'node:test'

import { seededRandom, forAll, intGen } from './harness.js'
import BackupDb from '../../src/use-cases/backup-db.js'

const rng = seededRandom(20260828)

function makeBackupDb () {
  const calls = []
  const adapters = {
    dbCtrl: {
      backupDb: async (height, epoch) => {
        calls.push({ height, epoch })
        return true
      }
    }
  }
  const uut = new BackupDb({ adapters })
  return { uut, calls }
}

test('maybeBackupDb requests a backup exactly at positive multiples of the epoch', async () => {
  const heightGen = intGen(rng, 0, 1000000)
  const epochGen = intGen(rng, 1, 10000)

  await forAll(
    (i) => ({ height: heightGen(), epoch: epochGen() }),
    async ({ height, epoch }) => {
      const { uut, calls } = makeBackupDb()
      const result = await uut.maybeBackupDb(height, epoch)
      const expected = height > 0 && height % epoch === 0
      const requested = calls.length === 1 &&
        calls[0].height === height &&
        calls[0].epoch === epoch
      return result === expected && requested === expected
    },
    { label: 'backup decision matches height % epoch invariant' }
  )
})

test('maybeBackupDb is deterministic across repeated calls', async () => {
  const heightGen = intGen(rng, 0, 1000000)
  const epochGen = intGen(rng, 1, 10000)

  await forAll(
    (i) => ({ height: heightGen(), epoch: epochGen() }),
    async ({ height, epoch }) => {
      const { uut, calls } = makeBackupDb()
      const first = await uut.maybeBackupDb(height, epoch)
      const second = await uut.maybeBackupDb(height, epoch)
      return first === second && calls.length === (first ? 2 : 0)
    },
    { label: 'backup decision idempotence' }
  )
})
