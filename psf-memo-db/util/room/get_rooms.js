/*
  Utility: read all rooms from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/room/get_rooms.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const roomsDb = level(`${__dirname}/../../leveldb/current/rooms`, {
  valueEncoding: 'json'
})

async function getRooms () {
  try {
    let count = 0

    for await (const [key, room] of roomsDb.iterator()) {
      count++
      console.log(`${key} = ${JSON.stringify(room, null, 2)}`)
    }

    console.log(`\nTotal rooms: ${count}`)
    await roomsDb.close()
  } catch (err) {
    console.error('Error reading rooms:', err.message)
    try {
      await roomsDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getRooms()
