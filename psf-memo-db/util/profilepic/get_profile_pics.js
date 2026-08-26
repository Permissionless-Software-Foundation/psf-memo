/*
  Utility: read all profilePics from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/profilepic/get_profile_pics.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const profilePicsDb = level(`${__dirname}/../../leveldb/current/profilePics`, {
  valueEncoding: 'json'
})

async function getProfilePics () {
  try {
    let count = 0

    for await (const [addr, profilePic] of profilePicsDb.iterator()) {
      count++
      console.log(`${addr} = ${JSON.stringify(profilePic, null, 2)}`)
    }

    console.log(`\nTotal profile pics: ${count}`)
    await profilePicsDb.close()
  } catch (err) {
    console.error('Error reading profilePics:', err.message)
    try {
      await profilePicsDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getProfilePics()
