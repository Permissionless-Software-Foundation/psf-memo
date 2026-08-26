/*
  Utility: read all postChildren from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/postchild/get_post_children.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const postChildrenDb = level(`${__dirname}/../../leveldb/current/postChildren`, {
  valueEncoding: 'json'
})

async function getPostChildren () {
  try {
    let count = 0

    for await (const [key, child] of postChildrenDb.iterator()) {
      count++
      console.log(`${key} = ${JSON.stringify(child, null, 2)}`)
    }

    console.log(`\nTotal post children: ${count}`)
    await postChildrenDb.close()
  } catch (err) {
    console.error('Error reading postChildren:', err.message)
    try {
      await postChildrenDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getPostChildren()
