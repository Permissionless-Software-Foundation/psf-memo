/*
  Utility: read all processErrors from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/processErrors/get_process_errors.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const processErrorsDb = level(`${__dirname}/../../leveldb/current/processErrors`, {
  valueEncoding: 'json'
})

async function getProcessErrors () {
  try {
    let count = 0

    for await (const [txid, errorData] of processErrorsDb.iterator()) {
      count++
      console.log(`${txid} = ${JSON.stringify(errorData, null, 2)}`)
    }

    console.log(`\nTotal process errors: ${count}`)
    await processErrorsDb.close()
  } catch (err) {
    console.error('Error reading processErrors:', err.message)
    try {
      await processErrorsDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getProcessErrors()
