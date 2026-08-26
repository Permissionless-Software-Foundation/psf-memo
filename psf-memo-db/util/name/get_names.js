/*
  Utility: read all names from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/name/get_names.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const namesDb = level(`${__dirname}/../../leveldb/current/names`, {
  valueEncoding: 'json'
})

async function getNames () {
  try {
    let count = 0

    for await (const [addr, name] of namesDb.iterator()) {
      count++
      console.log(`${addr} = ${JSON.stringify(name, null, 2)}`)
    }

    console.log(`\nTotal names: ${count}`)
    await namesDb.close()
  } catch (err) {
    console.error('Error reading names:', err.message)
    try {
      await namesDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getNames()
