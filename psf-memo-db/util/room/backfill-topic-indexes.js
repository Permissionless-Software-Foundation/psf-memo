/*
  Utility: build the topicSummaries and topicRecency indexes for an existing
  psf-memo-db.

  New deployments write these indexes while indexing live topic messages, but
  existing databases that were populated before the topic recency feature need
  a one-time backfill.

  Run from the psf-memo-db repo root on the host that owns the LevelDB files:

    node util/room/backfill-topic-indexes.js

  The script is idempotent: re-running it produces the same indexes. Progress
  and a summary are printed to stderr.

  WARNING:
  - This script opens the LevelDB files directly. psf-memo-db must NOT be
    running, or another process must not hold the database locks.
  - Make a backup of leveldb/current before running on a production server:
      cp -r leveldb/current leveldb/current-pre-topic-index-backup
*/

import level from 'level'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import { backfillTopicIndexes } from '../../src/lib/backfill-topic-indexes.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const DATA_DIR = process.env.PSF_MEMO_DB_DATA_DIR
  ? path.resolve(process.env.PSF_MEMO_DB_DATA_DIR)
  : path.resolve(__dirname, '../../leveldb/current')

function requiredStorePath (dir, name) {
  const storePath = path.join(dir, name)
  if (!fs.existsSync(storePath)) {
    throw new Error(`Required LevelDB store not found: ${storePath}. Set PSF_MEMO_DB_DATA_DIR to the directory containing the rooms store.`)
  }
  return storePath
}

async function main () {
  console.error(`Using LevelDB data directory: ${DATA_DIR}`)

  const roomsPath = requiredStorePath(DATA_DIR, 'rooms')
  const topicSummariesPath = path.join(DATA_DIR, 'topicSummaries')
  const topicRecencyPath = path.join(DATA_DIR, 'topicRecency')

  console.error('Opening LevelDB stores...')
  const roomsDb = level(roomsPath, { valueEncoding: 'json' })
  const topicSummariesDb = level(topicSummariesPath, { valueEncoding: 'json', createIfMissing: true })
  const topicRecencyDb = level(topicRecencyPath, { valueEncoding: 'json', createIfMissing: true })

  try {
    console.error('Backfilling topicSummaries and topicRecency from rooms...')
    const summary = await backfillTopicIndexes({ roomsDb, topicSummariesDb, topicRecencyDb })

    console.error('\nTopic index backfill complete.')
    console.error(`  rooms summarized: ${summary.rooms}`)
  } catch (err) {
    console.error('\nTopic index backfill failed:', err.message)
    process.exitCode = 1
  } finally {
    await topicRecencyDb.close().catch(() => {})
    await topicSummariesDb.close().catch(() => {})
    await roomsDb.close().catch(() => {})
  }
}

main()
