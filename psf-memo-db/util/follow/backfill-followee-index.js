/*
  Utility: build the followeeHeights notification index for an existing
  psf-memo-db.

  New deployments write followeeHeights while indexing live follow actions, but
  existing databases that were populated before the notifications query
  performance feature need a one-time backfill.

  Run from the psf-memo-db repo root on the host that owns the LevelDB files:

    node util/follow/backfill-followee-index.js

  The script is idempotent: re-running it produces the same index. Progress and
  a summary are printed to stderr.

  WARNING:
  - This script opens the LevelDB files directly. psf-memo-db must NOT be
    running, or another process must not hold the database locks.
  - Make a backup of leveldb/current before running on a production server:
      cp -r leveldb/current leveldb/current-pre-followee-index-backup
*/

import level from 'level'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import { backfillFolloweeIndex } from '../../src/lib/backfill-followee-index.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const DATA_DIR = process.env.PSF_MEMO_DB_DATA_DIR
  ? path.resolve(process.env.PSF_MEMO_DB_DATA_DIR)
  : path.resolve(__dirname, '../../leveldb/current')

function requiredStorePath (dir, name) {
  const storePath = path.join(dir, name)
  if (!fs.existsSync(storePath)) {
    throw new Error(`Required LevelDB store not found: ${storePath}. Set PSF_MEMO_DB_DATA_DIR to the directory containing the follows store.`)
  }
  return storePath
}

async function main () {
  console.error(`Using LevelDB data directory: ${DATA_DIR}`)

  const followsPath = requiredStorePath(DATA_DIR, 'follows')
  const followeeHeightsPath = path.join(DATA_DIR, 'followeeHeights')

  console.error('Opening LevelDB stores...')
  const followsDb = level(followsPath, { valueEncoding: 'json' })
  const followeeHeightsDb = level(followeeHeightsPath, { valueEncoding: 'json', createIfMissing: true })

  try {
    console.error('Backfilling followeeHeights from follows...')
    const summary = await backfillFolloweeIndex({ followsDb, followeeHeightsDb })

    console.error('\nFollowee index backfill complete.')
    console.error(`  follows indexed: ${summary.follows}`)
  } catch (err) {
    console.error('\nFollowee index backfill failed:', err.message)
    process.exitCode = 1
  } finally {
    await followeeHeightsDb.close().catch(() => {})
    await followsDb.close().catch(() => {})
  }
}

main()
