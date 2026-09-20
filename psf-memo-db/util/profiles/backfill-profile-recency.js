/*
  Utility: build the profileRecency index for an existing psf-memo-db.

  New deployments write the index while indexing live posts, but existing
  databases populated before the recent-profile-ordering feature need a
  one-time backfill.

  Run from the psf-memo-db repo root on the host that owns the LevelDB files:

    node util/profiles/backfill-profile-recency.js

  The script is idempotent: re-running it produces the same index. Progress and
  a summary are printed to stderr.

  WARNING:
  - This script opens the LevelDB files directly. psf-memo-db must NOT be
    running, or another process must not hold the database locks.
  - Make a backup of leveldb/current before running on a production server:
      cp -r leveldb/current leveldb/current-pre-profile-recency-backup
*/

import level from 'level'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import { backfillProfileRecency } from '../../src/lib/backfill-profile-recency.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const DATA_DIR = process.env.PSF_MEMO_DB_DATA_DIR
  ? path.resolve(process.env.PSF_MEMO_DB_DATA_DIR)
  : path.resolve(__dirname, '../../leveldb/current')

function requiredStorePath (dir, name) {
  const storePath = path.join(dir, name)
  if (!fs.existsSync(storePath)) {
    throw new Error(`Required LevelDB store not found: ${storePath}. Set PSF_MEMO_DB_DATA_DIR to the directory containing the profiles store.`)
  }
  return storePath
}

async function main () {
  console.error(`Using LevelDB data directory: ${DATA_DIR}`)

  const profilesPath = requiredStorePath(DATA_DIR, 'profiles')
  const postsPath = requiredStorePath(DATA_DIR, 'posts')
  const addrPostHeightsPath = requiredStorePath(DATA_DIR, 'addrPostHeights')
  const postParentsPath = requiredStorePath(DATA_DIR, 'postParents')
  const pollsPath = requiredStorePath(DATA_DIR, 'polls')
  const statusPath = requiredStorePath(DATA_DIR, 'status')
  const profileRecencyPath = path.join(DATA_DIR, 'profileRecency')

  console.error('Opening LevelDB stores...')
  const profilesDb = level(profilesPath, { valueEncoding: 'json' })
  const postsDb = level(postsPath, { valueEncoding: 'json' })
  const addrPostHeightsDb = level(addrPostHeightsPath, { valueEncoding: 'json' })
  const postParentsDb = level(postParentsPath, { valueEncoding: 'json' })
  const pollsDb = level(pollsPath, { valueEncoding: 'json' })
  const statusDb = level(statusPath, { valueEncoding: 'json' })
  const profileRecencyDb = level(profileRecencyPath, { valueEncoding: 'json', createIfMissing: true })

  try {
    console.error('Backfilling profileRecency from addrPostHeights...')
    const summary = await backfillProfileRecency({
      profilesDb,
      postsDb,
      addrPostHeightsDb,
      postParentsDb,
      pollsDb,
      statusDb,
      profileRecencyDb
    })

    console.error('\nProfile recency backfill complete.')
    console.error(`  profiles with a qualifying post: ${summary.profiles}`)
  } catch (err) {
    console.error('\nProfile recency backfill failed:', err.message)
    process.exitCode = 1
  } finally {
    await profileRecencyDb.close().catch(() => {})
    await statusDb.close().catch(() => {})
    await pollsDb.close().catch(() => {})
    await postParentsDb.close().catch(() => {})
    await addrPostHeightsDb.close().catch(() => {})
    await postsDb.close().catch(() => {})
    await profilesDb.close().catch(() => {})
  }
}

main()
