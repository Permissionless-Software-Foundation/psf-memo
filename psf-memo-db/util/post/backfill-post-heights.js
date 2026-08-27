/*
  Utility: backfill the postHeights secondary index for an existing psf-memo-db.

  The postHeights index is required for efficient pagination of /posts/recent and
  /posts/by/:addr. New deployments write this index while indexing live blocks,
  but existing databases that were populated before the postHeights feature need
  a one-time backfill.

  Run from the psf-memo-db repo root on the host that owns the LevelDB files:

    node util/post/backfill-post-heights.js

  The script is idempotent: re-running it will not create duplicate index
  entries. Progress and a summary are printed to stderr.

  WARNING:
  - This script opens the LevelDB files directly. psf-memo-db must NOT be
    running, or another process must not hold the database locks.
  - Make a backup of leveldb/current before running on a production server:
      cp -r leveldb/current leveldb/current-pre-postheights-backup
*/

import level from 'level'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const DATA_DIR = process.env.PSF_MEMO_DB_DATA_DIR
  ? path.resolve(process.env.PSF_MEMO_DB_DATA_DIR)
  : path.resolve(__dirname, '../../leveldb/current')

const HEIGHT_PAD = 12
const PROGRESS_INTERVAL = 10000

function requiredStorePath (dir, name) {
  const storePath = path.join(dir, name)
  if (!fs.existsSync(storePath)) {
    throw new Error(`Required LevelDB store not found: ${storePath}. Set PSF_MEMO_DB_DATA_DIR to the directory containing the posts, postHeights, and postParents stores.`)
  }
  return storePath
}

function postHeightKey (blockHeight, txid) {
  const padded = String(blockHeight).padStart(HEIGHT_PAD, '0')
  return `${padded}:${txid}`
}

async function createIfMissing (db, key, value) {
  try {
    await db.get(key)
    return false
  } catch (err) {
    if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
      await db.put(key, value)
      return true
    }
    throw err
  }
}

async function backfill () {
  console.error(`Using LevelDB data directory: ${DATA_DIR}`)

  const postsPath = requiredStorePath(DATA_DIR, 'posts')
  const postParentsPath = requiredStorePath(DATA_DIR, 'postParents')
  const postHeightsPath = path.join(DATA_DIR, 'postHeights')

  console.error('Opening LevelDB stores...')
  const postsDb = level(postsPath, { valueEncoding: 'json' })
  const postHeightsDb = level(postHeightsPath, { valueEncoding: 'json', createIfMissing: true })
  const postParentsDb = level(postParentsPath, { valueEncoding: 'json' })

  try {
    console.error('Loading reply txids from postParents...')
    const replyTxids = new Set()
    let replyCount = 0
    for await (const [childTxid] of postParentsDb.iterator()) {
      replyTxids.add(childTxid)
      replyCount++
    }
    console.error(`Loaded ${replyCount} reply txids.`)

    console.error('Scanning posts and backfilling postHeights entries...')
    let postsScanned = 0
    let topLevelPosts = 0
    let indexEntriesCreated = 0
    let indexEntriesExisting = 0

    for await (const [txid, post] of postsDb.iterator()) {
      postsScanned++

      if (replyTxids.has(txid)) {
        if (postsScanned % PROGRESS_INTERVAL === 0) {
          console.error(`  scanned ${postsScanned} posts, ${topLevelPosts} top-level, ${indexEntriesCreated} written, ${indexEntriesExisting} skipped...`)
        }
        continue
      }

      topLevelPosts++
      const blockHeight = post.blockHeight ?? 0
      const key = postHeightKey(blockHeight, txid)
      const value = { txid, blockHeight }
      const created = await createIfMissing(postHeightsDb, key, value)
      if (created) {
        indexEntriesCreated++
      } else {
        indexEntriesExisting++
      }

      if (postsScanned % PROGRESS_INTERVAL === 0) {
        console.error(`  scanned ${postsScanned} posts, ${topLevelPosts} top-level, ${indexEntriesCreated} written, ${indexEntriesExisting} skipped...`)
      }
    }

    console.error('\nBackfill complete.')
    console.error(`  posts scanned:        ${postsScanned}`)
    console.error(`  top-level posts:      ${topLevelPosts}`)
    console.error(`  index entries created: ${indexEntriesCreated}`)
    console.error(`  index entries already present: ${indexEntriesExisting}`)
  } catch (err) {
    console.error('\nBackfill failed:', err.message)
    process.exitCode = 1
  } finally {
    await postHeightsDb.close().catch(() => {})
    await postParentsDb.close().catch(() => {})
    await postsDb.close().catch(() => {})
  }
}

backfill()
