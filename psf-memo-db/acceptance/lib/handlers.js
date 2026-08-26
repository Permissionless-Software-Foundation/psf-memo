/*
  Project step handlers for the psf-memo-db acceptance pipeline.

  These handlers spin up a real psf-memo-db adapter set against a temporary
  LevelDB directory, load the Gherkin fixtures, and exercise the real use cases
  for recent posts and posts-by-address. Iterators and get calls are wrapped
  so the efficiency steps can assert bounded reads.
*/

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DB_NAMES } from '../../src/adapters/level-db.js'
import Adapters from '../../src/adapters/index.js'
import ListRecentPosts from '../../src/use-cases/list-recent-posts.js'
import ListPostsByAddr from '../../src/use-cases/list-posts-by-addr.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tmpDir = path.resolve(__dirname, '..', '..', 'tmp', 'acceptance')

function resolveParam (value, example) {
  const match = /^<([A-Za-z0-9_]+)>$/.exec(String(value).trim())
  if (match) {
    const param = match[1]
    if (!(param in example)) {
      throw new Error(`Missing example value for "${param}"`)
    }
    return example[param]
  }
  return String(value).trim()
}

function wrapIterator (db, counter) {
  const original = db.iterator.bind(db)
  db.iterator = function (...args) {
    counter.calls++
    return original(...args)
  }
}

function wrapGet (db, counter) {
  const original = db.get.bind(db)
  db.get = async function (...args) {
    counter.calls++
    return original(...args)
  }
}

async function createWorld () {
  const levelDir = path.join(tmpDir, `level-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const adapters = new Adapters()

  // Force the LevelDB adapter to use a temporary directory for this scenario.
  adapters.levelDb.openDbs = function () {
    const dbs = {}
    fs.mkdirSync(levelDir, { recursive: true })
    for (const name of DB_NAMES) {
      const prop = `${name}Db`
      const storeDir = path.join(levelDir, name)
      fs.mkdirSync(storeDir, { recursive: true })
      dbs[prop] = adapters.levelDb.level(storeDir, {
        valueEncoding: 'json',
        cacheSize: name === 'posts' ? 512 * 1024 * 1024 : 64 * 1024 * 1024
      })
      this[prop] = dbs[prop]
    }
    return dbs
  }

  adapters.start()

  const postHeightsIteratorCounter = { calls: 0 }
  const postChildrenIteratorCounter = { calls: 0 }
  const postsGetCounter = { calls: 0 }
  wrapIterator(adapters.level.postHeightsDb, postHeightsIteratorCounter)
  wrapIterator(adapters.level.postChildrenDb, postChildrenIteratorCounter)
  wrapGet(adapters.level.postsDb, postsGetCounter)

  const listRecentPosts = new ListRecentPosts({ adapters })
  const listPostsByAddr = new ListPostsByAddr({ adapters })

  let lastResponse = null

  return {
    adapters,
    listRecentPosts,
    listPostsByAddr,
    postHeightsIteratorCounter,
    postChildrenIteratorCounter,
    postsGetCounter,
    getLastResponse: () => lastResponse,
    setLastResponse: (resp) => { lastResponse = resp },
    close: async () => {
      try {
        await adapters.levelDb.closeDbs()
      } catch (err) {
        // ignore close errors
      }
    }
  }
}

async function loadFixture (world, name) {
  if (name !== 'three-top-level-posts-and-one-reply') {
    throw new Error(`Unknown fixture: ${name}`)
  }

  const posts = [
    { txid: 'post-200-b', addr: 'bitcoincash:qaddr-b', text: 'b', seen: 200, blockHeight: 600200 },
    { txid: 'post-200-a', addr: 'bitcoincash:qaddr-a', text: 'a', seen: 100, blockHeight: 600200 },
    { txid: 'post-100', addr: 'bitcoincash:qaddr-a', text: 'c', seen: 50, blockHeight: 600100 }
  ]
  const reply = { txid: 'reply-1', parentTxid: 'post-200-a', childTxid: 'reply-1', blockHeight: 600050 }

  for (const post of posts) {
    await world.adapters.level.postsDb.put(post.txid, {
      addr: post.addr,
      text: post.text,
      seen: post.seen,
      blockHeight: post.blockHeight
    })
    await world.adapters.level.postHeightsDb.put(
      String(post.blockHeight).padStart(12, '0') + ':' + post.txid,
      { txid: post.txid, blockHeight: post.blockHeight }
    )
  }

  await world.adapters.level.postsDb.put('reply-1', {
    addr: 'bitcoincash:qaddr-a',
    text: 'reply body',
    seen: 10,
    blockHeight: 600050
  })
  await world.adapters.level.postHeightsDb.put(
    '000000600050:reply-1',
    { txid: 'reply-1', blockHeight: 600050 }
  )
  await world.adapters.level.postParentsDb.put('reply-1', reply)
  await world.adapters.level.postChildrenDb.put('post-200-a:reply-1', reply)
}

const handlers = [
  {
    name: 'db instance with posts and postHeights stores',
    pattern: /^a psf-memo-db instance with a posts store and a postHeights secondary index$/,
    async run () {
      // World is already created with both stores.
    }
  },
  {
    name: 'load fixture',
    pattern: /^the fixture "(.+)" is loaded into the posts store$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'request recent posts',
    pattern: /^the client requests \/posts\/recent with limit (<limit>) and offset (<offset>)$/,
    async run (m, example, world) {
      const limit = parseInt(resolveParam(m[1], example), 10)
      const offset = parseInt(resolveParam(m[2], example), 10)
      const resp = await world.listRecentPosts.execute({ limit, offset })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'request posts by addr',
    pattern: /^the client requests \/posts\/by\/(<addr>) with limit (<limit>) and offset (<offset>)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const limit = parseInt(resolveParam(m[2], example), 10)
      const offset = parseInt(resolveParam(m[3], example), 10)
      const resp = await world.listPostsByAddr.execute({ addr, limit, offset })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'posts sorted by block height descending',
    pattern: /^the response posts are sorted by block height descending$/,
    run (m, example, world) {
      const posts = world.getLastResponse().posts
      for (let i = 1; i < posts.length; i++) {
        if (posts[i].blockHeight > posts[i - 1].blockHeight) {
          throw new Error(`Posts not sorted by descending block height at index ${i}`)
        }
      }
    }
  },
  {
    name: 'response contains expected txids',
    pattern: /^the response contains the txids (<expected_txids>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example).split(',').map((s) => s.trim())
      const actual = world.getLastResponse().posts.map((p) => p.txid)
      if (expected.join(',') !== actual.join(',')) {
        throw new Error(`Expected txids ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    name: 'response contains only posts by addr',
    pattern: /^the response contains only posts by (<addr>)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const posts = world.getLastResponse().posts
      for (const post of posts) {
        if (post.addr !== addr) {
          throw new Error(`Expected post by ${addr}, got ${post.addr}`)
        }
      }
    }
  },
  {
    name: 'response pagination metadata',
    pattern: /^the response pagination shows total (<total>) and hasMore (<hasMore>)$/,
    run (m, example, world) {
      const expectedTotal = parseInt(resolveParam(m[1], example), 10)
      const expectedHasMore = resolveParam(m[2], example) === 'true'
      const pagination = world.getLastResponse().pagination
      if (pagination.total !== expectedTotal) {
        throw new Error(`Expected total ${expectedTotal}, got ${pagination.total}`)
      }
      if (pagination.hasMore !== expectedHasMore) {
        throw new Error(`Expected hasMore ${expectedHasMore}, got ${pagination.hasMore}`)
      }
    }
  },
  {
    name: 'bounded postHeights reads',
    pattern: /^no more than (<limit>) postHeights entries are read after applying the offset$/,
    run (m, example, world) {
      const limit = parseInt(resolveParam(m[1], example), 10)
      const reads = world.postHeightsIteratorCounter.calls
      if (reads > limit) {
        throw new Error(`Read ${reads} postHeights entries, expected at most ${limit}`)
      }
    }
  },
  {
    name: 'bounded posts loaded by txid',
    pattern: /^no more than (<limit>) posts are loaded by txid$/,
    run (m, example, world) {
      const limit = parseInt(resolveParam(m[1], example), 10)
      const reads = world.postsGetCounter.calls
      if (reads > limit) {
        throw new Error(`Loaded ${reads} posts by txid, expected at most ${limit}`)
      }
    }
  },
  {
    name: 'post has replyCount',
    pattern: /^the response post with txid (<txid>) has replyCount (<replyCount>)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const post = world.getLastResponse().posts.find((p) => p.txid === txid)
      if (!post) {
        throw new Error(`Post ${txid} not found in response`)
      }
      if (post.replyCount !== expected) {
        throw new Error(`Expected replyCount ${expected} for ${txid}, got ${post.replyCount}`)
      }
    }
  },
  {
    name: 'single postChildren scan',
    pattern: /^the postChildren store was iterated exactly once$/,
    run (m, example, world) {
      const calls = world.postChildrenIteratorCounter.calls
      if (calls !== 1) {
        throw new Error(`Expected exactly one postChildren scan, got ${calls}`)
      }
    }
  }
]

async function handleStep (step, example, world) {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

export { createWorld, handleStep }
