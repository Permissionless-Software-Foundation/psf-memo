/*
  Utility: read all likes from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/like/get_likes.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const likesDb = level(`${__dirname}/../../leveldb/current/likes`, {
  valueEncoding: 'json'
})

async function getLikes () {
  try {
    let count = 0

    for await (const [txid, like] of likesDb.iterator()) {
      count++
      console.log(`${txid} = ${JSON.stringify(like, null, 2)}`)
    }

    console.log(`\nTotal likes: ${count}`)
    await likesDb.close()
  } catch (err) {
    console.error('Error reading likes:', err.message)
    try {
      await likesDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getLikes()
