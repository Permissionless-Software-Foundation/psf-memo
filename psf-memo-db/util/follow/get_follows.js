/*
  Utility: read all follows from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/follow/get_follows.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const followsDb = level(`${__dirname}/../../leveldb/current/follows`, {
  valueEncoding: 'json'
})

async function getFollows () {
  try {
    let count = 0

    for await (const [key, follow] of followsDb.iterator()) {
      count++
      console.log(`${key} = ${JSON.stringify(follow, null, 2)}`)
    }

    console.log(`\nTotal follows: ${count}`)
    await followsDb.close()
  } catch (err) {
    console.error('Error reading follows:', err.message)
    try {
      await followsDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getFollows()
