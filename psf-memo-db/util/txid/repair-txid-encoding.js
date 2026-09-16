/*
  Utility: repair byte-reversed txid references in an existing psf-memo-db and
  rebuild the affected secondary indexes.

  Older psf-memo-client broadcasts embedded a referenced txid in big-endian
  display order. The indexer expected little-endian wire order, so it stored a
  reference that is the reverse of the display txid. This utility rewrites
  those references to display order for likes, replies, poll options, and poll
  votes, and rebuilds the postLikes and postChildren indexes.

  Run from the psf-memo-db repo root on the host that owns the LevelDB files:

    node util/txid/repair-txid-encoding.js

  The repair is idempotent: re-running it makes no further changes. Progress
  and a summary are printed to stderr.

  WARNING:
  - This script opens the LevelDB files directly. psf-memo-db must NOT be
    running, or another process must not hold the database locks.
  - Make a backup of leveldb/current before running on a production server:
      cp -r leveldb/current leveldb/current-pre-txid-repair-backup
*/

import level from 'level'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import { repairTxidEncoding } from '../../src/lib/repair-txid-encoding.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const DATA_DIR = process.env.PSF_MEMO_DB_DATA_DIR
  ? path.resolve(process.env.PSF_MEMO_DB_DATA_DIR)
  : path.resolve(__dirname, '../../leveldb/current')

// Stores that hold records to scan. They must already exist.
const RECORD_STORES = ['posts', 'polls', 'likes', 'postParents', 'pollOptions', 'pollVotes']
// Secondary indexes rebuilt by the repair. Create them when missing.
const INDEX_STORES = ['postLikes', 'postChildren']

function requiredStorePath (dir, name) {
  const storePath = path.join(dir, name)
  if (!fs.existsSync(storePath)) {
    throw new Error(`Required LevelDB store not found: ${storePath}. Set PSF_MEMO_DB_DATA_DIR to the directory containing the psf-memo-db stores.`)
  }
  return storePath
}

async function main () {
  console.error(`Using LevelDB data directory: ${DATA_DIR}`)

  const paths = {}
  for (const name of RECORD_STORES) {
    paths[name] = requiredStorePath(DATA_DIR, name)
  }
  for (const name of INDEX_STORES) {
    paths[name] = path.join(DATA_DIR, name)
  }

  console.error('Opening LevelDB stores...')
  const dbs = {
    postsDb: level(paths.posts, { valueEncoding: 'json' }),
    pollsDb: level(paths.polls, { valueEncoding: 'json' }),
    likesDb: level(paths.likes, { valueEncoding: 'json' }),
    postParentsDb: level(paths.postParents, { valueEncoding: 'json' }),
    pollOptionsDb: level(paths.pollOptions, { valueEncoding: 'json' }),
    pollVotesDb: level(paths.pollVotes, { valueEncoding: 'json' }),
    postLikesDb: level(paths.postLikes, { valueEncoding: 'json', createIfMissing: true }),
    postChildrenDb: level(paths.postChildren, { valueEncoding: 'json', createIfMissing: true })
  }

  try {
    console.error('Repairing reversed txid references...')
    const summary = await repairTxidEncoding(dbs)

    console.error('\nTxid encoding repair complete.')
    console.error(`  likes corrected:       ${summary.likes}`)
    console.error(`  replies corrected:     ${summary.replies}`)
    console.error(`  poll options corrected: ${summary.pollOptions}`)
    console.error(`  poll votes corrected:  ${summary.pollVotes}`)
  } catch (err) {
    console.error('\nTxid encoding repair failed:', err.message)
    process.exitCode = 1
  } finally {
    for (const db of Object.values(dbs)) {
      await db.close().catch(() => {})
    }
  }
}

main()
