/*
  Utility: read all profiles from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/profiles/get_profiles.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const profilesDb = level(`${__dirname}/../../leveldb/current/profiles`, {
  valueEncoding: 'json'
})

async function getProfiles () {
  try {
    let count = 0

    for await (const [addr, profile] of profilesDb.iterator()) {
      count++
      console.log(`${addr} = ${JSON.stringify(profile, null, 2)}`)
    }

    console.log(`\nTotal profiles: ${count}`)
    await profilesDb.close()
  } catch (err) {
    console.error('Error reading profiles:', err.message)
    try {
      await profilesDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getProfiles()
