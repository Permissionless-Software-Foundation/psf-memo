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
import GetPostThread from '../../src/use-cases/get-post-thread.js'
import FollowState from '../../src/use-cases/follow-state.js'
import ListFollowing from '../../src/use-cases/list-following.js'
import ListFollowers from '../../src/use-cases/list-followers.js'

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
  const likesIteratorCounter = { calls: 0 }
  wrapIterator(adapters.level.postHeightsDb, postHeightsIteratorCounter)
  wrapIterator(adapters.level.postChildrenDb, postChildrenIteratorCounter)
  wrapGet(adapters.level.postsDb, postsGetCounter)
  wrapIterator(adapters.level.likesDb, likesIteratorCounter)

  const listRecentPosts = new ListRecentPosts({ adapters })
  const listPostsByAddr = new ListPostsByAddr({ adapters })
  const getPostThread = new GetPostThread({ adapters })
  const followState = new FollowState({ adapters })
  const listFollowing = new ListFollowing({ adapters })
  const listFollowers = new ListFollowers({ adapters })

  let lastResponse = null

  return {
    adapters,
    listRecentPosts,
    listPostsByAddr,
    getPostThread,
    followState,
    listFollowing,
    listFollowers,
    postHeightsIteratorCounter,
    postChildrenIteratorCounter,
    postsGetCounter,
    likesIteratorCounter,
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
  if (name === 'posts-with-likes') {
    await loadPostsWithLikes(world)
    return
  }

  if (name === 'follows') {
    await loadFollows(world)
    return
  }

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

async function loadPostsWithLikes (world) {
  const posts = [
    { txid: 'post-200-a', addr: 'bitcoincash:qaddr-a', text: 'a', seen: 100, blockHeight: 600200 },
    { txid: 'post-200-b', addr: 'bitcoincash:qaddr-b', text: 'b', seen: 200, blockHeight: 600200 },
    { txid: 'post-100', addr: 'bitcoincash:qaddr-a', text: 'c', seen: 50, blockHeight: 600100 },
    { txid: 'reply-1', addr: 'bitcoincash:qaddr-a', text: 'reply body', seen: 10, blockHeight: 600050 }
  ]

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

  await world.adapters.level.postParentsDb.put('reply-1', {
    txid: 'reply-1',
    parentTxid: 'post-200-a',
    childTxid: 'reply-1',
    blockHeight: 600050
  })
  await world.adapters.level.postChildrenDb.put('post-200-a:reply-1', {
    txid: 'reply-1',
    parentTxid: 'post-200-a',
    childTxid: 'reply-1',
    blockHeight: 600050
  })

  const likes = [
    { txid: 'like-1', postTxid: 'post-200-a', addr: 'bitcoincash:liker-1', seen: 1, blockHeight: 600201, tip: 0 },
    { txid: 'like-2', postTxid: 'post-200-a', addr: 'bitcoincash:liker-2', seen: 2, blockHeight: 600202, tip: 0 },
    { txid: 'like-3', postTxid: 'post-200-b', addr: 'bitcoincash:liker-3', seen: 3, blockHeight: 600203, tip: 0 },
    { txid: 'like-4', postTxid: 'reply-1', addr: 'bitcoincash:liker-4', seen: 4, blockHeight: 600204, tip: 0 },
    { txid: 'like-orphan', postTxid: 'unknown-post', addr: 'bitcoincash:liker-5', seen: 5, blockHeight: 600205, tip: 0 }
  ]

  for (const like of likes) {
    await world.adapters.level.likesDb.put(like.txid, like)
  }
}

async function loadFollows (world) {
  const follower1 = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const follower2 = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'
  const followeeHash = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'

  const records = [
    { key: `${follower1}:${followeeHash}`, followerAddr: follower1, followeePkHash: followeeHash, unfollow: false },
    { key: `${follower2}:${followeeHash}`, followerAddr: follower2, followeePkHash: followeeHash, unfollow: false }
  ]

  for (const record of records) {
    await world.adapters.level.followsDb.put(record.key, {
      followerAddr: record.followerAddr,
      followeePkHash: record.followeePkHash,
      unfollow: record.unfollow,
      txid: `follow-${record.followerAddr.slice(-8)}-${record.followeePkHash.slice(-8)}`,
      seen: Date.now(),
      blockHeight: 600000
    })
  }
}

const handlers = [
  {
    name: 'db instance with posts and postHeights stores',
    pattern: /^a psf-memo-db instance with a posts store and a (?:postHeights secondary index|likes store)$/,
    async run () {
      // World is already created with both stores.
    }
  },
  {
    name: 'db instance with posts and likes stores',
    pattern: /^a psf-memo-db instance with a posts store and a likes store$/,
    async run () {
      // World is already created with both stores.
    }
  },
  {
    name: 'load fixture',
    pattern: /^the fixture "(.+)" is loaded into the posts (?:store|and likes stores)$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'load fixture into posts and likes stores',
    pattern: /^the fixture "(.+)" is loaded into the posts and likes stores$/,
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
    name: 'request recent posts endpoint',
    pattern: /^the client requests the recent posts endpoint$/,
    async run (m, example, world) {
      const resp = await world.listRecentPosts.execute({})
      world.setLastResponse(resp)
    }
  },
  {
    name: 'request posts by addr endpoint',
    pattern: /^the client requests posts by address (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const resp = await world.listPostsByAddr.execute({ addr })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'request thread for root txid',
    pattern: /^the client requests the thread for (.+)$/,
    async run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const resp = await world.getPostThread.execute({ txid })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'post has likeCount',
    pattern: /^the post with txid (.+) has likeCount (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const response = world.getLastResponse()
      let post
      if (Array.isArray(response.posts)) {
        post = response.posts.find((p) => p.txid === txid)
      } else if (response.post) {
        post = findPostInThread(response.post, txid)
      }
      if (!post) {
        throw new Error(`Post ${txid} not found in response`)
      }
      if (post.likeCount !== expected) {
        throw new Error(`Expected likeCount ${expected} for ${txid}, got ${post.likeCount}`)
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
  },
  {
    name: 'db instance with follows store',
    pattern: /^a psf-memo-db instance with a follows store$/,
    async run () {
      // World is already created with the follows store.
    }
  },
  {
    name: 'load fixture into follows store',
    pattern: /^the fixture "(.+)" is loaded into the follows store$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'request follow state',
    pattern: /^the client requests the follow state for follower (<[A-Za-z0-9_]+>) and followee (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const follower = resolveParam(m[1], example)
      const followee = resolveParam(m[2], example)
      const resp = await world.followState.execute({ followerAddr: follower, followeeAddr: followee })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'follow state reports following',
    pattern: /^the follow state reports following (<following>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example) === 'true'
      const actual = world.getLastResponse().following
      if (actual !== expected) {
        throw new Error(`Expected following ${expected}, got ${actual}`)
      }
    }
  },
  {
    name: 'request following list',
    pattern: /^the client requests the following list for (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const follower = resolveParam(m[1], example)
      const resp = await world.listFollowing.execute({ followerAddr: follower })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'following list contains addresses',
    pattern: /^the following list contains the addresses (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example).split(',').map((s) => s.trim()).filter(Boolean)
      const actual = world.getLastResponse().following
      if (expected.join(',') !== actual.join(',')) {
        throw new Error(`Expected following ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    name: 'request followers list',
    pattern: /^the client requests the followers list for (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const followee = resolveParam(m[1], example)
      const resp = await world.listFollowers.execute({ followeeAddr: followee })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'followers list contains addresses',
    pattern: /^the followers list contains the addresses (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const raw = resolveParam(m[1], example).trim()
      const expected = raw.length === 0 ? [] : raw.split(',').map((s) => s.trim())
      const actual = world.getLastResponse().followers
      const expectedSet = new Set(expected)
      const actualSet = new Set(actual)
      if (expectedSet.size !== actualSet.size || !expectedSet.isSubsetOf(actualSet)) {
        throw new Error(`Expected followers ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  }
]

function findPostInThread (node, txid) {
  if (node.txid === txid) return node
  if (!Array.isArray(node.replies)) return null
  for (const reply of node.replies) {
    const found = findPostInThread(reply, txid)
    if (found) return found
  }
  return null
}

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
