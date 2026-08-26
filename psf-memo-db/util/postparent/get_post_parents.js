/*
  Utility: read all postParents from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/postparent/get_post_parents.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const postParentsDb = level(`${__dirname}/../../leveldb/current/postParents`, {
  valueEncoding: 'json'
})

async function getPostParents () {
  try {
    let count = 0

    for await (const [txid, parent] of postParentsDb.iterator()) {
      count++
      console.log(`${txid} = ${JSON.stringify(parent, null, 2)}`)
    }

    console.log(`\nTotal post parents: ${count}`)
    await postParentsDb.close()
  } catch (err) {
    console.error('Error reading postParents:', err.message)
    try {
      await postParentsDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getPostParents()
