/*
  Utility: read all posts from the Memo indexer LevelDB and print to the terminal.

  Run from the psf-memo-db repo root:
    node util/post/get_posts.js
*/

import level from 'level'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const postsDb = level(`${__dirname}/../../leveldb/current/posts`, {
  valueEncoding: 'json'
})

async function getPosts () {
  try {
    let count = 0

    for await (const [txid, post] of postsDb.iterator()) {
      count++
      console.log(`${txid} = ${JSON.stringify(post, null, 2)}`)
    }

    console.log(`\nTotal posts: ${count}`)
    await postsDb.close()
  } catch (err) {
    console.error('Error reading posts:', err.message)
    try {
      await postsDb.close()
    } catch (closeErr) {
      // ignore close errors after read failure
    }
    process.exit(1)
  }
}

getPosts()
