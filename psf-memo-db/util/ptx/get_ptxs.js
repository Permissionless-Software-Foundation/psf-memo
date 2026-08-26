/*
  Utility: read all ptxs (processed transactions) from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/ptx/get_ptxs.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const ptxsDb = level(`${__dirname}/../../leveldb/current/ptxs`, {
  valueEncoding: 'json'
})

async function getPtxs () {
  try {
    let count = 0

    for await (const [txid, ptx] of ptxsDb.iterator()) {
      count++
      console.log(`${txid} = ${JSON.stringify(ptx, null, 2)}`)
    }

    console.log(`\nTotal ptxs: ${count}`)
    await ptxsDb.close()
  } catch (err) {
    console.error('Error reading ptxs:', err.message)
    try {
      await ptxsDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getPtxs()
