/*
  Utility: backfill the addrPostHeights and postLikes secondary indexes for an
  existing psf-memo-db.

  New deployments write these indexes while indexing live blocks, but existing
  databases that were populated before the efficient-query feature need a
  one-time backfill.

  Run from the psf-memo-db repo root on the host that owns the LevelDB files:

    node util/post/backfill-post-indexes.js

  The script is idempotent: re-running it will not create duplicate index
  entries. Progress and a summary are printed to stderr.

  WARNING:
  - This script opens the LevelDB files directly. psf-memo-db must NOT be
    running, or another process must not hold the database locks.
  - Make a backup of leveldb/current before running on a production server:
      cp -r leveldb/current leveldb/current-pre-index-backup
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
    throw new Error(`Required LevelDB store not found: ${storePath}. Set PSF_MEMO_DB_DATA_DIR to the directory containing the posts and likes stores.`)
  }
  return storePath
}

function addrPostHeightKey (addr, blockHeight, txid) {
  const padded = String(blockHeight).padStart(HEIGHT_PAD, '0')
  return `${addr}:${padded}:${txid}`
}

function postLikeKey (postTxid, likeTxid) {
  return `${postTxid}:${likeTxid}`
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
  const likesPath = requiredStorePath(DATA_DIR, 'likes')
  const addrPostHeightsPath = path.join(DATA_DIR, 'addrPostHeights')
  const postLikesPath = path.join(DATA_DIR, 'postLikes')

  console.error('Opening LevelDB stores...')
  const postsDb = level(postsPath, { valueEncoding: 'json' })
  const likesDb = level(likesPath, { valueEncoding: 'json' })
  const addrPostHeightsDb = level(addrPostHeightsPath, { valueEncoding: 'json', createIfMissing: true })
  const postLikesDb = level(postLikesPath, { valueEncoding: 'json', createIfMissing: true })

  try {
    console.error('Backfilling addrPostHeights entries from posts...')
    let postsScanned = 0
    let addrPostHeightsCreated = 0
    let addrPostHeightsExisting = 0

    for await (const [txid, post] of postsDb.iterator()) {
      postsScanned++
      const addr = post.addr
      const blockHeight = post.blockHeight ?? 0
      const key = addrPostHeightKey(addr, blockHeight, txid)
      const value = { txid, addr, blockHeight }
      const created = await createIfMissing(addrPostHeightsDb, key, value)
      if (created) {
        addrPostHeightsCreated++
      } else {
        addrPostHeightsExisting++
      }

      if (postsScanned % PROGRESS_INTERVAL === 0) {
        console.error(`  scanned ${postsScanned} posts, ${addrPostHeightsCreated} written, ${addrPostHeightsExisting} skipped...`)
      }
    }

    console.error('\nBackfilling postLikes entries from likes...')
    let likesScanned = 0
    let postLikesCreated = 0
    let postLikesExisting = 0

    for await (const [txid, like] of likesDb.iterator()) {
      likesScanned++
      const postTxid = like.postTxid
      if (!postTxid) continue

      const key = postLikeKey(postTxid, txid)
      const value = { postTxid, txid }
      const created = await createIfMissing(postLikesDb, key, value)
      if (created) {
        postLikesCreated++
      } else {
        postLikesExisting++
      }

      if (likesScanned % PROGRESS_INTERVAL === 0) {
        console.error(`  scanned ${likesScanned} likes, ${postLikesCreated} written, ${postLikesExisting} skipped...`)
      }
    }

    console.error('\nBackfill complete.')
    console.error(`  posts scanned:        ${postsScanned}`)
    console.error(`  addrPostHeights created: ${addrPostHeightsCreated}`)
    console.error(`  addrPostHeights already present: ${addrPostHeightsExisting}`)
    console.error(`  likes scanned:        ${likesScanned}`)
    console.error(`  postLikes created:    ${postLikesCreated}`)
    console.error(`  postLikes already present: ${postLikesExisting}`)
  } catch (err) {
    console.error('\nBackfill failed:', err.message)
    process.exitCode = 1
  } finally {
    await addrPostHeightsDb.close().catch(() => {})
    await postLikesDb.close().catch(() => {})
    await likesDb.close().catch(() => {})
    await postsDb.close().catch(() => {})
  }
}

backfill()
