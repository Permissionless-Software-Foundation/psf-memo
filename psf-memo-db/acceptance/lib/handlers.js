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
import ListTopics from '../../src/use-cases/list-topics.js'
import ListTopicPosts from '../../src/use-cases/list-topic-posts.js'
import TopicFollowState from '../../src/use-cases/topic-follow-state.js'
import ListTopicFollowers from '../../src/use-cases/list-topic-followers.js'
import MuteState from '../../src/use-cases/mute-state.js'
import ListMuted from '../../src/use-cases/list-muted.js'
import ListNotifications from '../../src/use-cases/list-notifications.js'
import GetPoll from '../../src/use-cases/get-poll.js'
import GetPollOptions from '../../src/use-cases/get-poll-options.js'
import GetPollVotes from '../../src/use-cases/get-poll-votes.js'
import { repairTxidEncoding } from '../../src/lib/repair-txid-encoding.js'
import { backfillTopicIndexes, topicRecencyKey } from '../../src/lib/backfill-topic-indexes.js'
import { backfillFolloweeIndex, followeeHeightKey } from '../../src/lib/backfill-followee-index.js'
import BCHJS from '@psf/bch-js'

const bchjs = new BCHJS({ restURL: process.env.RESTURL || 'https://api.fullstack.cash/v5/' })

function hash160 (addr) {
  return bchjs.Address.toHash160(addr)
}

function padHeight (blockHeight) {
  return String(blockHeight ?? 0).padStart(12, '0')
}

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
  const originalIterator = db.iterator.bind(db)
  db.iterator = function (...args) {
    counter.calls++
    const iter = originalIterator(...args)
    const originalAsyncIterator = iter[Symbol.asyncIterator].bind(iter)
    iter[Symbol.asyncIterator] = async function * () {
      for await (const entry of originalAsyncIterator()) {
        counter.entries = (counter.entries || 0) + 1
        yield entry
      }
    }
    return iter
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
  const addrPostHeightsIteratorCounter = { calls: 0 }
  const postChildrenIteratorCounter = { calls: 0 }
  const postsGetCounter = { calls: 0 }
  const likesIteratorCounter = { calls: 0 }
  const postLikesIteratorCounter = { calls: 0 }
  const followsIteratorCounter = { calls: 0 }
  const followeeHeightsIteratorCounter = { calls: 0, entries: 0 }
  const roomsIteratorCounter = { calls: 0, entries: 0 }
  const topicRecencyIteratorCounter = { calls: 0, entries: 0 }
  wrapIterator(adapters.level.postHeightsDb, postHeightsIteratorCounter)
  wrapIterator(adapters.level.addrPostHeightsDb, addrPostHeightsIteratorCounter)
  wrapIterator(adapters.level.postChildrenDb, postChildrenIteratorCounter)
  wrapGet(adapters.level.postsDb, postsGetCounter)
  wrapIterator(adapters.level.likesDb, likesIteratorCounter)
  wrapIterator(adapters.level.postLikesDb, postLikesIteratorCounter)
  wrapIterator(adapters.level.followsDb, followsIteratorCounter)
  wrapIterator(adapters.level.followeeHeightsDb, followeeHeightsIteratorCounter)
  wrapIterator(adapters.level.roomsDb, roomsIteratorCounter)
  wrapIterator(adapters.level.topicRecencyDb, topicRecencyIteratorCounter)

  const listRecentPosts = new ListRecentPosts({ adapters })
  const listPostsByAddr = new ListPostsByAddr({ adapters })
  const getPostThread = new GetPostThread({ adapters })
  const followState = new FollowState({ adapters })
  const listFollowing = new ListFollowing({ adapters })
  const listFollowers = new ListFollowers({ adapters })
  const listTopics = new ListTopics({ adapters })
  const listTopicPosts = new ListTopicPosts({ adapters })
  const topicFollowState = new TopicFollowState({ adapters })
  const listTopicFollowers = new ListTopicFollowers({ adapters })
  const muteState = new MuteState({ adapters })
  const listMuted = new ListMuted({ adapters })
  const listNotifications = new ListNotifications({ adapters })
  const getPoll = new GetPoll({ adapters })
  const getPollOptions = new GetPollOptions({ adapters })
  const getPollVotes = new GetPollVotes({ adapters })

  let lastResponse = null

  return {
    adapters,
    listRecentPosts,
    listPostsByAddr,
    getPostThread,
    followState,
    listFollowing,
    listFollowers,
    listTopics,
    listTopicPosts,
    topicFollowState,
    listTopicFollowers,
    muteState,
    listMuted,
    listNotifications,
    getPoll,
    getPollOptions,
    getPollVotes,
    postHeightsIteratorCounter,
    addrPostHeightsIteratorCounter,
    postChildrenIteratorCounter,
    postsGetCounter,
    likesIteratorCounter,
    postLikesIteratorCounter,
    followsIteratorCounter,
    followeeHeightsIteratorCounter,
    roomsIteratorCounter,
    topicRecencyIteratorCounter,
    getLastResponse: () => lastResponse,
    setLastResponse: (resp) => { lastResponse = resp },
    close: async () => {
      try {
        await adapters.levelDb.closeDbs()
      } catch (err) {
        // ignore close errors
      }
      // Each scenario opens an isolated LevelDB directory. Remove it here so
      // tmp/acceptance cannot grow without bound across runs.
      try {
        fs.rmSync(levelDir, { recursive: true, force: true })
      } catch (err) {
        // ignore cleanup errors
      }
    }
  }
}

async function loadFixture (world, name) {
  if (name === 'posts-with-likes') {
    await loadPostsWithLikes(world)
    return
  }

  if (name === 'posts-with-likes-and-indexes') {
    await loadPostsWithLikes(world)
    return
  }

  if (name === 'posts-and-likes-without-indexes') {
    await loadPostsAndLikesCore(world)
    return
  }

  if (name === 'follows') {
    await loadFollows(world)
    return
  }

  if (name === 'mutes') {
    await loadMutes(world)
    return
  }

  if (name === 'topics-with-posts') {
    await loadTopicsWithPosts(world)
    return
  }

  if (name === 'topic-indexes') {
    await loadTopicIndexes(world)
    return
  }

  if (name === 'topic-metadata-indexes') {
    await loadTopicMetadataIndexes(world)
    return
  }

  if (name === 'rooms-with-topic-metadata') {
    await loadRoomsWithTopicMetadata(world)
    return
  }

  if (name === 'rooms-with-topics-and-follows') {
    await loadRoomsWithTopicsAndFollows(world)
    return
  }

  if (name === 'topic-follows') {
    await loadTopicFollows(world)
    return
  }

  if (name === 'poll-with-options-and-vote') {
    await loadPollWithOptionsAndVote(world)
    return
  }

  if (name === 'db-with-reversed-txid-references') {
    await loadReversedTxidFixture(world)
    return
  }

  if (name === 'follows-by-followee') {
    await loadFollowsByFollowee(world)
    return
  }

  if (name === 'notifications-window') {
    await loadNotificationsWindow(world)
    return
  }

  if (name === 'many-posts-with-replies') {
    await loadManyPostsWithReplies(world)
    return
  }

  if (name === 'many-top-level-posts') {
    await loadManyTopLevelPosts(world)
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
    await world.adapters.level.addrPostHeightsDb.put(
      `${post.addr}:${String(post.blockHeight).padStart(12, '0')}:${post.txid}`,
      { txid: post.txid, addr: post.addr, blockHeight: post.blockHeight }
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

async function loadPostsAndLikesCore (world) {
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

async function loadPostsWithLikes (world) {
  await loadPostsAndLikesCore(world)

  // Also populate the secondary indexes expected by the efficient-query read path.
  const topLevelPosts = [
    { txid: 'post-200-a', addr: 'bitcoincash:qaddr-a', blockHeight: 600200 },
    { txid: 'post-200-b', addr: 'bitcoincash:qaddr-b', blockHeight: 600200 },
    { txid: 'post-100', addr: 'bitcoincash:qaddr-a', blockHeight: 600100 }
  ]
  for (const post of topLevelPosts) {
    await world.adapters.level.addrPostHeightsDb.put(
      `${post.addr}:${String(post.blockHeight).padStart(12, '0')}:${post.txid}`,
      { txid: post.txid, addr: post.addr, blockHeight: post.blockHeight }
    )
  }

  const likes = [
    { txid: 'like-1', postTxid: 'post-200-a' },
    { txid: 'like-2', postTxid: 'post-200-a' },
    { txid: 'like-3', postTxid: 'post-200-b' },
    { txid: 'like-4', postTxid: 'reply-1' }
  ]
  for (const like of likes) {
    await world.adapters.level.postLikesDb.put(
      `${like.postTxid}:${like.txid}`,
      { postTxid: like.postTxid, txid: like.txid }
    )
  }
}

async function loadManyPostsWithReplies (world) {
  const posts = []
  for (let i = 0; i <= 20; i++) {
    const id = String(i).padStart(3, '0')
    const txid = `post-${id}`
    const blockHeight = 600000 + i
    posts.push({ txid, addr: 'bitcoincash:qaddr', text: `post ${id}`, seen: i, blockHeight })
  }

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
    await world.adapters.level.addrPostHeightsDb.put(
      `${post.addr}:${String(post.blockHeight).padStart(12, '0')}:${post.txid}`,
      { txid: post.txid, addr: post.addr, blockHeight: post.blockHeight }
    )
  }

  const replies = [
    { txid: 'reply-020-a', parentTxid: 'post-020', childTxid: 'reply-020-a', blockHeight: 599900 },
    { txid: 'reply-020-b', parentTxid: 'post-020', childTxid: 'reply-020-b', blockHeight: 599901 },
    { txid: 'reply-019-a', parentTxid: 'post-019', childTxid: 'reply-019-a', blockHeight: 599902 }
  ]

  for (const reply of replies) {
    await world.adapters.level.postsDb.put(reply.txid, {
      addr: 'bitcoincash:qaddr',
      text: `reply to ${reply.parentTxid}`,
      seen: reply.blockHeight,
      blockHeight: reply.blockHeight
    })
    await world.adapters.level.postHeightsDb.put(
      String(reply.blockHeight).padStart(12, '0') + ':' + reply.txid,
      { txid: reply.txid, blockHeight: reply.blockHeight }
    )
    await world.adapters.level.postParentsDb.put(reply.txid, reply)
    await world.adapters.level.postChildrenDb.put(`${reply.parentTxid}:${reply.txid}`, reply)
  }
}

async function loadManyTopLevelPosts (world) {
  // 510 eligible top-level posts: larger than the 500 total-scan cap, so the
  // capped total is exactly 500, while an offset near the end exhausts the
  // index and reads all 510 entries.
  for (let i = 0; i < 510; i++) {
    const id = String(i).padStart(3, '0')
    const txid = `post-${id}`
    const blockHeight = 600000 + i
    await world.adapters.level.postsDb.put(txid, {
      addr: 'bitcoincash:qaddr',
      text: `post ${id}`,
      seen: i,
      blockHeight
    })
    await world.adapters.level.postHeightsDb.put(
      String(blockHeight).padStart(12, '0') + ':' + txid,
      { txid, blockHeight }
    )
    await world.adapters.level.addrPostHeightsDb.put(
      `bitcoincash:qaddr:${String(blockHeight).padStart(12, '0')}:${txid}`,
      { txid, addr: 'bitcoincash:qaddr', blockHeight }
    )
  }
}

async function backfillIndexes (world) {
  const posts = []
  for await (const [txid, post] of world.adapters.level.postsDb.iterator()) {
    posts.push({ txid, ...post })
  }

  for (const post of posts) {
    const key = `${post.addr}:${String(post.blockHeight ?? 0).padStart(12, '0')}:${post.txid}`
    try {
      await world.adapters.level.addrPostHeightsDb.get(key)
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
        await world.adapters.level.addrPostHeightsDb.put(key, {
          txid: post.txid,
          addr: post.addr,
          blockHeight: post.blockHeight ?? 0
        })
      }
    }
  }

  for await (const [txid, like] of world.adapters.level.likesDb.iterator()) {
    if (!like.postTxid) continue
    const key = `${like.postTxid}:${txid}`
    try {
      await world.adapters.level.postLikesDb.get(key)
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
        await world.adapters.level.postLikesDb.put(key, {
          postTxid: like.postTxid,
          txid
        })
      }
    }
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

// Fixture "follows-by-followee" from backfill-followee-index.feature: raw
// follows records the backfill projects into followeeHeights.
async function loadFollowsByFollowee (world) {
  const viewer = 'bitcoincash:qqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zye3kwllue'
  const followerA = 'bitcoincash:qq3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygrg4dtdzf'
  const followerB = 'bitcoincash:qqenxvenxvenxvenxvenxvenxvenxvenxvn254yg3p'
  const followerC = 'bitcoincash:qpzyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs7fn3s6pt'
  const other = 'bitcoincash:qp24242424242424242424242424242425wtjflljr'

  const records = [
    { follower: followerA, followee: viewer, unfollow: false, height: 690400 },
    { follower: followerB, followee: viewer, unfollow: true, height: 690600 },
    // The Examples table lists followee qpzyg... and follower qp2424... for this
    // record, so store it that orientation to match the asserted index key.
    { follower: other, followee: followerC, unfollow: false, height: 690200 }
  ]

  for (const record of records) {
    const followeePkHash = hash160(record.followee)
    await world.adapters.level.followsDb.put(`${record.follower}:${followeePkHash}`, {
      followerAddr: record.follower,
      followeePkHash,
      unfollow: record.unfollow,
      txid: `follow-${record.follower.slice(-8)}`,
      seen: 1,
      blockHeight: record.height
    })
  }
}

// Fixture "notifications-window" from notifications-query-performance.feature.
async function loadNotificationsWindow (world) {
  const viewer = 'bitcoincash:qqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zye3kwllue'
  const followerA = 'bitcoincash:qq3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygrg4dtdzf'
  const followerB = 'bitcoincash:qqenxvenxvenxvenxvenxvenxvenxvenxvn254yg3p'
  const oldActor = 'bitcoincash:qpzyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs7fn3s6pt'
  const liker = 'bitcoincash:qp24242424242424242424242424242425wtjflljr'
  const replier = 'bitcoincash:qpnxvenxvenxvenxvenxvenxvenxvenxvc5j32tdvn'

  // The feature identifies the viewer by the fixture name rather than an
  // example column, so expose it for step resolution.
  world.fixtureViewer = viewer

  await world.adapters.level.statusDb.put('status', {
    startBlockHeight: 0,
    syncedBlockHeight: 700000,
    chainBlockHeight: 700000
  })

  const posts = [
    { txid: 'post-recent', addr: viewer, blockHeight: 690000, text: 'recent' },
    { txid: 'post-old', addr: viewer, blockHeight: 600000, text: 'old' },
    { txid: 'post-other', addr: followerA, blockHeight: 690000, text: 'other' }
  ]
  for (const post of posts) {
    await world.adapters.level.postsDb.put(post.txid, {
      addr: post.addr,
      text: post.text,
      seen: post.blockHeight,
      blockHeight: post.blockHeight
    })
    await world.adapters.level.postHeightsDb.put(`${padHeight(post.blockHeight)}:${post.txid}`, {
      txid: post.txid,
      blockHeight: post.blockHeight
    })
    await world.adapters.level.addrPostHeightsDb.put(
      `${post.addr}:${padHeight(post.blockHeight)}:${post.txid}`,
      { txid: post.txid, addr: post.addr, blockHeight: post.blockHeight }
    )
  }

  const likes = [
    { txid: 'like-recent', postTxid: 'post-recent', addr: liker, blockHeight: 690100 },
    { txid: 'like-old', postTxid: 'post-old', addr: oldActor, blockHeight: 690200 },
    { txid: 'like-other', postTxid: 'post-other', addr: followerA, blockHeight: 690300 }
  ]
  for (const like of likes) {
    await world.adapters.level.likesDb.put(like.txid, {
      addr: like.addr,
      postTxid: like.postTxid,
      seen: like.blockHeight,
      tip: 0,
      blockHeight: like.blockHeight
    })
    await world.adapters.level.postLikesDb.put(
      `${like.postTxid}:${like.txid}`,
      { postTxid: like.postTxid, txid: like.txid }
    )
  }

  const replies = [
    { parent: 'post-recent', child: 'reply-recent', addr: replier, blockHeight: 690150 },
    { parent: 'post-old', child: 'reply-old', addr: oldActor, blockHeight: 690250 },
    { parent: 'post-other', child: 'reply-other', addr: followerA, blockHeight: 690300 }
  ]
  for (const reply of replies) {
    await world.adapters.level.postsDb.put(reply.child, {
      addr: reply.addr,
      text: 'reply',
      seen: reply.blockHeight,
      blockHeight: reply.blockHeight
    })
    await world.adapters.level.postChildrenDb.put(
      `${reply.parent}:${reply.child}`,
      { parentTxid: reply.parent, childTxid: reply.child, blockHeight: reply.blockHeight }
    )
  }

  const viewerHash = hash160(viewer)
  const followEvents = [
    { follower: followerA, height: 690400, unfollow: false },
    { follower: followerB, height: 690550, unfollow: false },
    { follower: followerB, height: 690600, unfollow: true },
    { follower: oldActor, height: 600000, unfollow: false }
  ]
  for (const event of followEvents) {
    const record = {
      followerAddr: event.follower,
      followeePkHash: viewerHash,
      unfollow: event.unfollow,
      txid: `follow-${event.follower.slice(-6)}-${event.height}`,
      seen: event.height,
      blockHeight: event.height
    }
    await world.adapters.level.followeeHeightsDb.put(
      followeeHeightKey(viewerHash, event.height, event.follower),
      record
    )
    // Mirror the event in the follows store; the query must ignore it.
    await world.adapters.level.followsDb.put(`${event.follower}:${viewerHash}`, record)
  }

  // Filler so an accidental full-store scan is observable.
  for (let i = 0; i < 100; i++) {
    await world.adapters.level.likesDb.put(`filler-like-${i}`, {
      addr: 'bitcoincash:filler',
      postTxid: `filler-post-${i}`,
      seen: i,
      tip: 0,
      blockHeight: 1
    })
    await world.adapters.level.postLikesDb.put(
      `filler-post-${i}:filler-like-${i}`,
      { postTxid: `filler-post-${i}`, txid: `filler-like-${i}` }
    )
    await world.adapters.level.postChildrenDb.put(
      `filler-parent-${i}:filler-child-${i}`,
      { parentTxid: `filler-parent-${i}`, childTxid: `filler-child-${i}`, blockHeight: 1 }
    )
    await world.adapters.level.followeeHeightsDb.put(
      followeeHeightKey(`fillerhash-${i}`, 690000, `filler-follower-${i}`),
      {
        followerAddr: `filler-follower-${i}`,
        followeePkHash: `fillerhash-${i}`,
        unfollow: false,
        txid: `filler-${i}`,
        seen: i,
        blockHeight: 690000
      }
    )
  }
}

async function loadTopicsWithPosts (world) {
  const roomEntries = [
    { key: 'bitcoin:post-300', room: 'bitcoin', txid: 'post-300', type: 'post', blockHeight: 300 },
    { key: 'bitcoin:post-200', room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 200 },
    { key: 'bitcoin:addr-f', room: 'bitcoin', addr: 'addr-f', type: 'follow', unfollow: false },
    { key: 'cash:post-250', room: 'cash', txid: 'post-250', type: 'post', blockHeight: 250 },
    { key: 'dev:post-400', room: 'dev', txid: 'post-400', type: 'post', blockHeight: 400 },
    { key: 'lone:addr-f', room: 'lone', addr: 'addr-f', type: 'follow', unfollow: false }
  ]

  const posts = {
    'post-300': { addr: 'addr-a', text: 'hello bitcoin', seen: 1, blockHeight: 300 },
    'post-200': { addr: 'addr-b', text: 'bitcoin again', seen: 2, blockHeight: 200 },
    'post-250': { addr: 'addr-a', text: 'cash rules', seen: 3, blockHeight: 250 },
    'post-400': { addr: 'addr-c', text: 'dev stuff', seen: 4, blockHeight: 400 }
  }

  for (const entry of roomEntries) {
    await world.adapters.level.roomsDb.put(entry.key, {
      room: entry.room,
      txid: entry.txid,
      addr: entry.addr,
      type: entry.type,
      unfollow: entry.unfollow,
      blockHeight: entry.blockHeight
    })
  }

  for (const [txid, post] of Object.entries(posts)) {
    await world.adapters.level.postsDb.put(txid, post)
  }

  // Derived topic indexes (see topic-read.feature).
  const summaries = [
    { room: 'bitcoin', postCount: 2, lastHeight: 300 },
    { room: 'cash', postCount: 1, lastHeight: 250 },
    { room: 'dev', postCount: 1, lastHeight: 400 },
    { room: 'lone', postCount: 0, lastHeight: 0 }
  ]
  for (const summary of summaries) {
    await world.adapters.level.topicSummariesDb.put(summary.room, summary)
    await world.adapters.level.topicRecencyDb.put(
      topicRecencyKey(summary.lastHeight, summary.room),
      { room: summary.room, blockHeight: summary.lastHeight }
    )
  }
}

// Fixture "topic-indexes" from topic-pagination.feature: indexes only.
async function loadTopicIndexes (world) {
  const summaries = [
    { room: 'memo', postCount: 5, lastHeight: 600500 },
    { room: 'cash', postCount: 2, lastHeight: 600400 },
    { room: 'dance', postCount: 3, lastHeight: 600400 },
    { room: 'anime', postCount: 1, lastHeight: 600300 },
    { room: 'lone', postCount: 0, lastHeight: 0 },
    { room: 'quiet', postCount: 0, lastHeight: 0 }
  ]

  for (const summary of summaries) {
    await world.adapters.level.topicSummariesDb.put(summary.room, summary)
    await world.adapters.level.topicRecencyDb.put(
      topicRecencyKey(summary.lastHeight, summary.room),
      { room: summary.room, blockHeight: summary.lastHeight }
    )
  }
}

// Fixture "topic-metadata-indexes" from topic-metadata.feature: topic index
// stores with lastSeen and followerCount already populated.
async function loadTopicMetadataIndexes (world) {
  const summaries = [
    { room: 'memo', postCount: 5, lastHeight: 600500, lastSeen: 1700020000000, followerCount: 12 },
    { room: 'cash', postCount: 2, lastHeight: 600400, lastSeen: 1700010000000, followerCount: 4 },
    { room: 'lone', postCount: 0, lastHeight: 0, lastSeen: 0, followerCount: 7 }
  ]

  for (const summary of summaries) {
    await world.adapters.level.topicSummariesDb.put(summary.room, summary)
    await world.adapters.level.topicRecencyDb.put(
      topicRecencyKey(summary.lastHeight, summary.room),
      { room: summary.room, blockHeight: summary.lastHeight }
    )
  }
}

// Fixture "rooms-with-topic-metadata" from topic-metadata.feature: raw rooms
// store entries the backfill summarizes into lastSeen and followerCount.
async function loadRoomsWithTopicMetadata (world) {
  const entries = [
    { key: 'bitcoin:post-100', room: 'bitcoin', txid: 'post-100', type: 'post', blockHeight: 600100, seen: 1700000000000 },
    { key: 'bitcoin:post-200', room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200, seen: 1700009999000 },
    { key: 'bitcoin:addr-f', room: 'bitcoin', addr: 'bitcoincash:qaddr-f', type: 'follow', unfollow: false },
    { key: 'bitcoin:addr-g', room: 'bitcoin', addr: 'bitcoincash:qaddr-g', type: 'follow', unfollow: false },
    { key: 'cash:post-250', room: 'cash', txid: 'post-250', type: 'post', blockHeight: 600250, seen: 1700012345000 },
    { key: 'cash:addr-f', room: 'cash', addr: 'bitcoincash:qaddr-f', type: 'follow', unfollow: true },
    { key: 'lone:addr-f', room: 'lone', addr: 'bitcoincash:qaddr-f', type: 'follow', unfollow: false }
  ]

  for (const entry of entries) {
    await world.adapters.level.roomsDb.put(entry.key, entry)
  }
}

// Fixture "rooms-with-topics-and-follows" from backfill-topic-indexes.feature.
async function loadRoomsWithTopicsAndFollows (world) {
  const entries = [
    { key: 'bitcoin:post-100', room: 'bitcoin', txid: 'post-100', type: 'post', blockHeight: 600100 },
    { key: 'bitcoin:post-200', room: 'bitcoin', txid: 'post-200', type: 'post', blockHeight: 600200 },
    { key: 'bitcoin:addr-f', room: 'bitcoin', addr: 'addr-f', type: 'follow', unfollow: false },
    { key: 'cash:post-250', room: 'cash', txid: 'post-250', type: 'post', blockHeight: 600250 },
    { key: 'lone:addr-f', room: 'lone', addr: 'addr-f', type: 'follow', unfollow: false }
  ]

  for (const entry of entries) {
    await world.adapters.level.roomsDb.put(entry.key, entry)
  }
}

async function loadTopicFollows (world) {
  const entries = [
    { key: 'bitcoin:addr-a', room: 'bitcoin', addr: 'addr-a', type: 'follow', unfollow: false },
    { key: 'bitcoin:addr-b', room: 'bitcoin', addr: 'addr-b', type: 'follow', unfollow: false },
    { key: 'bitcoin:addr-c', room: 'bitcoin', addr: 'addr-c', type: 'follow', unfollow: true },
    { key: 'cash:addr-a', room: 'cash', addr: 'addr-a', type: 'follow', unfollow: false }
  ]

  for (const entry of entries) {
    await world.adapters.level.roomsDb.put(entry.key, entry)
  }
}

async function loadPollWithOptionsAndVote (world) {
  const pollTxid = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  await world.adapters.level.pollsDb.put(pollTxid, {
    addr: 'bitcoincash:qaddr-a',
    pollType: 1,
    optionCount: 2,
    question: 'which is better?',
    seen: 1,
    blockHeight: 600100
  })

  await world.adapters.level.pollOptionsDb.put('option-yes', {
    addr: 'bitcoincash:qaddr-a',
    pollTxid,
    option: 'yes',
    seen: 2,
    blockHeight: 600101
  })

  await world.adapters.level.pollOptionsDb.put('option-no', {
    addr: 'bitcoincash:qaddr-b',
    pollTxid,
    option: 'no',
    seen: 3,
    blockHeight: 600102
  })

  await world.adapters.level.pollVotesDb.put('vote-yes', {
    addr: 'bitcoincash:qaddr-a',
    pollTxid,
    comment: 'yes',
    seen: 4,
    blockHeight: 600103
  })
}

async function loadReversedTxidFixture (world) {
  const displayPost = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  const reversedPost = 'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301'
  const displayPoll = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
  const reversedPoll = 'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100'
  const unknownPost = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'

  await world.adapters.level.postsDb.put(displayPost, {
    addr: 'bitcoincash:qaddr-a', text: 'referenced post', seen: 1, blockHeight: 600100
  })
  await world.adapters.level.pollsDb.put(displayPoll, {
    addr: 'bitcoincash:qaddr-a', pollType: 1, optionCount: 2, question: 'which?', seen: 2, blockHeight: 600101
  })

  await world.adapters.level.likesDb.put('like-1', { addr: 'bitcoincash:liker-1', postTxid: reversedPost, seen: 3, blockHeight: 600200 })
  await world.adapters.level.likesDb.put('like-2', { addr: 'bitcoincash:liker-2', postTxid: displayPost, seen: 4, blockHeight: 600201 })
  await world.adapters.level.likesDb.put('like-3', { addr: 'bitcoincash:liker-3', postTxid: unknownPost, seen: 5, blockHeight: 600202 })
  await world.adapters.level.postLikesDb.put(`${reversedPost}:like-1`, { postTxid: reversedPost, txid: 'like-1' })
  await world.adapters.level.postLikesDb.put(`${displayPost}:like-2`, { postTxid: displayPost, txid: 'like-2' })

  await world.adapters.level.postParentsDb.put('reply-1', { parentTxid: reversedPost, childTxid: 'reply-1', blockHeight: 600050 })
  await world.adapters.level.postParentsDb.put('reply-2', { parentTxid: displayPost, childTxid: 'reply-2', blockHeight: 600051 })
  await world.adapters.level.postChildrenDb.put(`${reversedPost}:reply-1`, { parentTxid: reversedPost, childTxid: 'reply-1' })
  await world.adapters.level.postChildrenDb.put(`${displayPost}:reply-2`, { parentTxid: displayPost, childTxid: 'reply-2' })

  await world.adapters.level.pollOptionsDb.put('option-1', { addr: 'bitcoincash:qaddr-a', pollTxid: reversedPoll, option: 'yes', seen: 6, blockHeight: 600300 })
  await world.adapters.level.pollOptionsDb.put('option-2', { addr: 'bitcoincash:qaddr-b', pollTxid: displayPoll, option: 'no', seen: 7, blockHeight: 600301 })
  await world.adapters.level.pollVotesDb.put('vote-1', { addr: 'bitcoincash:qaddr-a', pollTxid: reversedPoll, comment: 'yes', seen: 8, blockHeight: 600302 })
  await world.adapters.level.pollVotesDb.put('vote-2', { addr: 'bitcoincash:qaddr-b', pollTxid: displayPoll, comment: 'no', seen: 9, blockHeight: 600303 })
}

async function loadMutes (world) {
  const muter1 = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const muter2 = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'
  const muteeHash = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'

  const records = [
    { key: `${muter1}:${muteeHash}`, muterAddr: muter1, muteePkHash: muteeHash, unmute: false },
    { key: `${muter2}:${muteeHash}`, muterAddr: muter2, muteePkHash: muteeHash, unmute: false }
  ]

  for (const record of records) {
    await world.adapters.level.mutesDb.put(record.key, {
      muterAddr: record.muterAddr,
      muteePkHash: record.muteePkHash,
      unmute: record.unmute,
      txid: `mute-${record.muterAddr.slice(-8)}-${record.muteePkHash.slice(-8)}`,
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
    name: 'db instance with new indexes',
    pattern: /^a psf-memo-db instance with posts, postHeights, addrPostHeights, (?:postChildren, )?likes, and postLikes stores$/,
    async run () {
      // World is already created with all stores.
    }
  },
  {
    name: 'db instance with txid repair stores',
    pattern: /^a psf-memo-db instance with posts, likes, postLikes, postParents, postChildren, polls, pollOptions, and pollVotes stores$/,
    async run () {
      // World is already created with all stores.
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
    name: 'load bare fixture',
    pattern: /^the fixture "(.+)" is loaded$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'run backfill utility',
    pattern: /^the backfill utility is run$/,
    async run (m, example, world) {
      await backfillIndexes(world)
    }
  },
  {
    name: 'run backfill utility again',
    pattern: /^the backfill utility is run again$/,
    async run (m, example, world) {
      await backfillIndexes(world)
    }
  },
  {
    name: 'run txid repair utility',
    pattern: /^the txid repair utility is run$/,
    async run (m, example, world) {
      await repairTxidEncoding(world.adapters.level)
    }
  },
  {
    name: 'run txid repair utility again',
    pattern: /^the txid repair utility is run again$/,
    async run (m, example, world) {
      await repairTxidEncoding(world.adapters.level)
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
    name: 'bounded postChildren entries read',
    pattern: /^the postChildren store was read at most (<[A-Za-z0-9_]+>) entries$/,
    run (m, example, world) {
      const max = parseInt(resolveParam(m[1], example), 10)
      const reads = world.postChildrenIteratorCounter.entries || 0
      if (reads > max) {
        throw new Error(`Read ${reads} postChildren entries, expected at most ${max}`)
      }
    }
  },
  {
    name: 'bounded postHeights entries read',
    pattern: /^the postHeights store was read at most (<max_entries>) entries$/,
    run (m, example, world) {
      const max = parseInt(resolveParam(m[1], example), 10)
      const reads = world.postHeightsIteratorCounter.entries || 0
      if (reads > max) {
        throw new Error(`Read ${reads} postHeights entries, expected at most ${max}`)
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
    name: 'bounded addrPostHeights reads',
    pattern: /^no more than (<limit>) addrPostHeights entries are read after applying the offset$/,
    run (m, example, world) {
      const limit = parseInt(resolveParam(m[1], example), 10)
      const reads = world.addrPostHeightsIteratorCounter.calls
      if (reads > limit) {
        throw new Error(`Read ${reads} addrPostHeights entries, expected at most ${limit}`)
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
    name: 'bounded postChildren iterations',
    pattern: /^the postChildren store was iterated at most (<max_iterations>) times$/,
    run (m, example, world) {
      const max = parseInt(resolveParam(m[1], example), 10)
      const calls = world.postChildrenIteratorCounter.calls
      if (calls > max) {
        throw new Error(`Expected at most ${max} postChildren iterations, got ${calls}`)
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
    name: 'bounded postLikes iterations',
    pattern: /^the postLikes store was iterated at most (<max_iterations>) times$/,
    run (m, example, world) {
      const max = parseInt(resolveParam(m[1], example), 10)
      const calls = world.postLikesIteratorCounter.calls
      if (calls > max) {
        throw new Error(`Expected at most ${max} postLikes iterations, got ${calls}`)
      }
    }
  },
  {
    name: 'addrPostHeights contains entry',
    pattern: /^the addrPostHeights store contains (<count>) entry whose key starts with (<addr>) and ends with (<postTxid>)$/,
    async run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const addr = resolveParam(m[2], example)
      const txid = resolveParam(m[3], example)
      let count = 0
      for await (const [key] of world.adapters.level.addrPostHeightsDb.iterator()) {
        if (key.startsWith(`${addr}:`) && key.endsWith(`:${txid}`)) count++
      }
      if (count !== expectedCount) {
        throw new Error(`Expected ${expectedCount} addrPostHeights entry/entries for ${addr}/${txid}, got ${count}`)
      }
    }
  },
  {
    name: 'postLikes contains entry',
    pattern: /^the postLikes store contains (<[A-Za-z0-9_]+>|[0-9]+) entry whose key starts with (<[A-Za-z0-9_]+>) and ends with (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const postTxid = resolveParam(m[2], example)
      const likeTxid = resolveParam(m[3], example)
      let count = 0
      for await (const [key] of world.adapters.level.postLikesDb.iterator()) {
        if (key.startsWith(`${postTxid}:`) && key.endsWith(`:${likeTxid}`)) count++
      }
      if (count !== expectedCount) {
        throw new Error(`Expected ${expectedCount} postLikes entry/entries for ${postTxid}/${likeTxid}, got ${count}`)
      }
    }
  },
  {
    name: 'postChildren contains entry',
    pattern: /^the postChildren store contains (<[A-Za-z0-9_]+>|[0-9]+) entry whose key starts with (<[A-Za-z0-9_]+>) and ends with (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const postTxid = resolveParam(m[2], example)
      const replyTxid = resolveParam(m[3], example)
      let count = 0
      for await (const [key] of world.adapters.level.postChildrenDb.iterator()) {
        if (key.startsWith(`${postTxid}:`) && key.endsWith(`:${replyTxid}`)) count++
      }
      if (count !== expectedCount) {
        throw new Error(`Expected ${expectedCount} postChildren entry/entries for ${postTxid}/${replyTxid}, got ${count}`)
      }
    }
  },
  {
    name: 'likes store maps like to post',
    pattern: /^the likes store maps like (<[A-Za-z0-9_]+>) to post (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const likeTxid = resolveParam(m[1], example)
      const postTxid = resolveParam(m[2], example)
      const like = await world.adapters.level.likesDb.get(likeTxid)
      if (like.postTxid !== postTxid) {
        throw new Error(`Expected like ${likeTxid} to map to post ${postTxid}, got ${like.postTxid}.`)
      }
    }
  },
  {
    name: 'postParents store maps reply to parent',
    pattern: /^the postParents store maps reply (<[A-Za-z0-9_]+>) to parent (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const replyTxid = resolveParam(m[1], example)
      const postTxid = resolveParam(m[2], example)
      const reply = await world.adapters.level.postParentsDb.get(replyTxid)
      if (reply.parentTxid !== postTxid) {
        throw new Error(`Expected reply ${replyTxid} to map to parent ${postTxid}, got ${reply.parentTxid}.`)
      }
    }
  },
  {
    name: 'pollOptions store maps option to poll',
    pattern: /^the pollOptions store maps option (<[A-Za-z0-9_]+>) to poll (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const optionTxid = resolveParam(m[1], example)
      const pollTxid = resolveParam(m[2], example)
      const option = await world.adapters.level.pollOptionsDb.get(optionTxid)
      if (option.pollTxid !== pollTxid) {
        throw new Error(`Expected poll option ${optionTxid} to map to poll ${pollTxid}, got ${option.pollTxid}.`)
      }
    }
  },
  {
    name: 'pollVotes store maps vote to poll',
    pattern: /^the pollVotes store maps vote (<[A-Za-z0-9_]+>) to poll (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const voteTxid = resolveParam(m[1], example)
      const pollTxid = resolveParam(m[2], example)
      const vote = await world.adapters.level.pollVotesDb.get(voteTxid)
      if (vote.pollTxid !== pollTxid) {
        throw new Error(`Expected poll vote ${voteTxid} to map to poll ${pollTxid}, got ${vote.pollTxid}.`)
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
  },
  {
    name: 'db instance with rooms and posts stores',
    pattern: /^a psf-memo-db instance with a rooms store and a posts store$/,
    async run () {
      // World is already created with both stores.
    }
  },
  {
    name: 'load fixture into rooms and posts stores',
    pattern: /^the fixture "(.+)" is loaded into the rooms and posts stores$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'request topics',
    pattern: /^the client requests \/topics$/,
    async run (m, example, world) {
      const resp = await world.listTopics.execute()
      world.setLastResponse(resp)
    }
  },
  {
    name: 'response contains topic with post count',
    pattern: /^the response contains the topic (<topic>) with post count (<count>)$/,
    run (m, example, world) {
      const topic = resolveParam(m[1], example)
      const expectedCount = parseInt(resolveParam(m[2], example), 10)
      const found = world.getLastResponse().topics.find((t) => t.room === topic)
      if (!found) {
        throw new Error(`Topic ${topic} not found in response`)
      }
      if (found.postCount !== expectedCount) {
        throw new Error(`Expected post count ${expectedCount} for ${topic}, got ${found.postCount}`)
      }
    }
  },
  {
    name: 'response contains topic last seen',
    pattern: /^the response contains the topic "(<topic>)" last seen at (<lastSeen>)$/,
    run (m, example, world) {
      const topic = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const found = world.getLastResponse().topics.find((t) => t.room === topic)
      if (!found) {
        throw new Error(`Topic ${topic} not found in response`)
      }
      if (found.lastSeen !== expected) {
        throw new Error(`Expected lastSeen ${expected} for ${topic}, got ${found.lastSeen}`)
      }
    }
  },
  {
    name: 'response contains topic follower count',
    pattern: /^the response contains the topic "(<topic>)" with (<followerCount>) followers?$/,
    run (m, example, world) {
      const topic = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const found = world.getLastResponse().topics.find((t) => t.room === topic)
      if (!found) {
        throw new Error(`Topic ${topic} not found in response`)
      }
      if (found.followerCount !== expected) {
        throw new Error(`Expected followerCount ${expected} for ${topic}, got ${found.followerCount}`)
      }
    }
  },
  {
    name: 'response lists topics in order',
    pattern: /^the response lists topics in order (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example).split(',').map((s) => s.trim())
      const actual = world.getLastResponse().topics.map((t) => t.room)
      if (expected.join(',') !== actual.join(',')) {
        throw new Error(`Expected topics ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    name: 'request topic posts',
    pattern: /^the client requests \/topics\/([^/]+)\/posts(?: with limit (<limit>) and offset (<offset>))?$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const limit = m[2] ? parseInt(resolveParam(m[2], example), 10) : undefined
      const offset = m[3] ? parseInt(resolveParam(m[3], example), 10) : undefined
      const resp = await world.listTopicPosts.execute({ room, limit, offset })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'response contains no posts',
    pattern: /^the response contains no posts$/,
    run (m, example, world) {
      const posts = world.getLastResponse().posts
      if (!Array.isArray(posts) || posts.length !== 0) {
        throw new Error(`Expected no posts, got ${Array.isArray(posts) ? posts.length : 'non-array'}`)
      }
    }
  },
  {
    name: 'db instance with rooms store',
    pattern: /^a psf-memo-db instance with a rooms store$/,
    async run () {
      // World is already created with the rooms store.
    }
  },
  {
    name: 'load fixture into rooms store',
    pattern: /^the fixture "(.+)" is loaded into the rooms store$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'db instance with rooms, posts, and topic index stores',
    pattern: /^a psf-memo-db instance with rooms, posts, topicSummaries, and topicRecency stores$/,
    async run () {
      // World is already created with all stores.
    }
  },
  {
    name: 'load fixture into rooms, posts, and topic index stores',
    pattern: /^the fixture "(.+)" is loaded into the rooms, posts, topicSummaries, and topicRecency stores$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'db instance with topic index stores',
    pattern: /^a psf-memo-db instance with topicSummaries and topicRecency stores$/,
    async run () {
      // World is already created with both topic index stores.
    }
  },
  {
    name: 'load fixture into topic index stores',
    pattern: /^the fixture "(.+)" is loaded into the topic index stores$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'db instance with rooms and topic index stores',
    pattern: /^a psf-memo-db instance with rooms, topicSummaries, and topicRecency stores$/,
    async run () {
      // World is already created with all stores.
    }
  },
  {
    name: 'request topics with limit and offset',
    pattern: /^the client requests \/topics with limit (<limit>) and offset (<offset>)$/,
    async run (m, example, world) {
      const limit = parseInt(resolveParam(m[1], example), 10)
      const offset = parseInt(resolveParam(m[2], example), 10)
      const resp = await world.listTopics.execute({ limit, offset })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'response contains quoted topic with post count',
    pattern: /^the response contains the topic "(<topic>)" with post count (<postCount>)$/,
    run (m, example, world) {
      const topic = resolveParam(m[1], example)
      const expectedCount = parseInt(resolveParam(m[2], example), 10)
      const found = world.getLastResponse().topics.find((t) => t.room === topic)
      if (!found) {
        throw new Error(`Topic ${topic} not found in response`)
      }
      if (found.postCount !== expectedCount) {
        throw new Error(`Expected post count ${expectedCount} for ${topic}, got ${found.postCount}`)
      }
    }
  },
  {
    name: 'response pagination shows total and hasMore',
    pattern: /^the response pagination shows total (<total>) and hasMore (<hasMore>)$/,
    run (m, example, world) {
      const expectedTotal = parseInt(resolveParam(m[1], example), 10)
      const expectedHasMore = resolveParam(m[2], example) === 'true'
      const pagination = world.getLastResponse().pagination
      if (!pagination) {
        throw new Error('Response has no pagination metadata')
      }
      if (pagination.total !== expectedTotal) {
        throw new Error(`Expected total ${expectedTotal}, got ${pagination.total}`)
      }
      if (pagination.hasMore !== expectedHasMore) {
        throw new Error(`Expected hasMore ${expectedHasMore}, got ${pagination.hasMore}`)
      }
    }
  },
  {
    name: 'topicRecency store read count',
    pattern: /^the topicRecency store was read exactly (<read_count>) records$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      const actual = world.topicRecencyIteratorCounter.entries || 0
      if (actual !== expected) {
        throw new Error(`Expected topicRecency to be read ${expected} times, got ${actual}`)
      }
    }
  },
  {
    name: 'rooms store was not iterated',
    pattern: /^the rooms store was not iterated$/,
    run (m, example, world) {
      if (world.roomsIteratorCounter.calls !== 0) {
        throw new Error(`Expected rooms store not to be iterated, got ${world.roomsIteratorCounter.calls} call(s)`)
      }
    }
  },
  {
    name: 'run topic backfill utility',
    pattern: /^the topic backfill utility is run$/,
    async run (m, example, world) {
      await backfillTopicIndexes({
        roomsDb: world.adapters.level.roomsDb,
        topicSummariesDb: world.adapters.level.topicSummariesDb,
        topicRecencyDb: world.adapters.level.topicRecencyDb
      })
    }
  },
  {
    name: 'run topic backfill utility again',
    pattern: /^the topic backfill utility is run again$/,
    async run (m, example, world) {
      await backfillTopicIndexes({
        roomsDb: world.adapters.level.roomsDb,
        topicSummariesDb: world.adapters.level.topicSummariesDb,
        topicRecencyDb: world.adapters.level.topicRecencyDb
      })
    }
  },
  {
    name: 'topicSummaries contains room with postCount and lastHeight',
    pattern: /^the topicSummaries store contains the room "(<room>)" with postCount (<postCount>) and lastHeight (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const postCount = parseInt(resolveParam(m[2], example), 10)
      const lastHeight = parseInt(resolveParam(m[3], example), 10)
      const record = await world.adapters.level.topicSummariesDb.get(room)
      if (!record) {
        throw new Error(`No topicSummaries record for ${room}`)
      }
      if (record.room !== room || record.postCount !== postCount || record.lastHeight !== lastHeight) {
        throw new Error(`Expected ${room} postCount ${postCount} lastHeight ${lastHeight}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'topicSummaries records room last seen',
    pattern: /^the topicSummaries store records the room "(<room>)" last seen at (<lastSeen>)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const record = await world.adapters.level.topicSummariesDb.get(room)
      if (!record) {
        throw new Error(`No topicSummaries record for ${room}`)
      }
      if (record.lastSeen !== expected) {
        throw new Error(`Expected ${room} lastSeen ${expected}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'topicSummaries records room follower count',
    pattern: /^the topicSummaries store records the room "(<room>)" with (<followerCount>) followers?$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const expected = parseInt(resolveParam(m[2], example), 10)
      const record = await world.adapters.level.topicSummariesDb.get(room)
      if (!record) {
        throw new Error(`No topicSummaries record for ${room}`)
      }
      if (record.followerCount !== expected) {
        throw new Error(`Expected ${room} followerCount ${expected}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'topicRecency records room at height',
    pattern: /^the topicRecency store records the room "(<room>)" at block height (<height>)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const height = parseInt(resolveParam(m[2], example), 10)
      const record = await world.adapters.level.topicRecencyDb.get(topicRecencyKey(height, room))
      if (!record) {
        throw new Error(`No topicRecency record for ${room} at ${height}`)
      }
      if (record.room !== room || record.blockHeight !== height) {
        throw new Error(`Expected topicRecency ${room} at ${height}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'request topic follow state',
    pattern: /^the client requests the topic follow state for room (<[A-Za-z0-9_]+>) and address (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const addr = resolveParam(m[2], example)
      const resp = await world.topicFollowState.execute({ room, addr })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'topic follow state reports following',
    pattern: /^the topic follow state reports following (<following>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example) === 'true'
      const actual = world.getLastResponse().following
      if (actual !== expected) {
        throw new Error(`Expected following ${expected}, got ${actual}`)
      }
    }
  },
  {
    name: 'request topic followers list',
    pattern: /^the client requests the topic followers list for room (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const resp = await world.listTopicFollowers.execute({ room })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'topic followers list contains addresses',
    pattern: /^the topic followers list contains the addresses (<expected>)$/,
    run (m, example, world) {
      const raw = resolveParam(m[1], example).trim()
      const expected = raw.length === 0 ? [] : raw.split(',').map((s) => s.trim())
      const actual = world.getLastResponse().followers
      const expectedSet = new Set(expected)
      const actualSet = new Set(actual)
      if (expectedSet.size !== actualSet.size || !expectedSet.isSubsetOf(actualSet)) {
        throw new Error(`Expected topic followers ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    name: 'db instance with polls store',
    pattern: /^a psf-memo-db instance with a polls store and pollOptions and pollVotes stores$/,
    async run () {
      // World is already created with all poll stores.
    }
  },
  {
    name: 'load fixture into polls stores',
    pattern: /^the fixture "(.+)" is loaded into the polls store and pollOptions and pollVotes stores$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'serve poll',
    pattern: /^the psf-memo-db API serves a poll with the txid (.+) with the question "(.+)"$/,
    async run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const question = m[2]
      await world.adapters.level.pollsDb.put(txid, {
        addr: 'bitcoincash:qaddr-a',
        pollType: 1,
        optionCount: 2,
        question,
        seen: 1,
        blockHeight: 600100
      })
    }
  },
  {
    name: 'serve poll option',
    pattern: /^the psf-memo-db API serves the option "(.+)" for the poll (.+)$/,
    async run (m, example, world) {
      const option = m[1]
      const pollTxid = resolveParam(m[2], example)
      const optionTxid = `option-${option}-${pollTxid.slice(0, 8)}`
      await world.adapters.level.pollOptionsDb.put(optionTxid, {
        addr: 'bitcoincash:qaddr-a',
        pollTxid,
        option,
        seen: Date.now(),
        blockHeight: 600101
      })
    }
  },
  {
    name: 'serve poll vote',
    pattern: /^the psf-memo-db API serves a vote with the comment "(.+)" for the poll (.+)$/,
    async run (m, example, world) {
      const comment = m[1]
      const pollTxid = resolveParam(m[2], example)
      const voteTxid = `vote-${comment}-${pollTxid.slice(0, 8)}`
      await world.adapters.level.pollVotesDb.put(voteTxid, {
        addr: 'bitcoincash:qaddr-a',
        pollTxid,
        comment,
        seen: Date.now(),
        blockHeight: 600102
      })
    }
  },
  {
    name: 'request poll',
    pattern: /^I request the poll with txid (.+)$/,
    async run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const resp = await world.getPoll.execute({ txid })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'request poll options',
    pattern: /^I request the options for the poll with txid (.+)$/,
    async run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const resp = await world.getPollOptions.execute({ txid })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'request poll votes',
    pattern: /^I request the votes for the poll with txid (.+)$/,
    async run (m, example, world) {
      const txid = resolveParam(m[1], example)
      const resp = await world.getPollVotes.execute({ txid })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'response shows poll question',
    pattern: /^the response shows the question "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const actual = world.getLastResponse().question
      if (actual !== expected) {
        throw new Error(`Expected question "${expected}", got "${actual}".`)
      }
    }
  },
  {
    name: 'response shows options',
    pattern: /^the response shows the options "(.+)" and "(.+)"$/,
    run (m, example, world) {
      const expected1 = resolveParam(m[1], example)
      const expected2 = resolveParam(m[2], example)
      const response = world.getLastResponse()
      const options = response.options || []
      const texts = options.map((o) => o.option)
      if (!texts.includes(expected1) || !texts.includes(expected2)) {
        throw new Error(`Expected options "${expected1}" and "${expected2}", got ${JSON.stringify(texts)}.`)
      }
    }
  },
  {
    name: 'response shows vote count',
    pattern: /^the response shows (.+) vote$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      const response = world.getLastResponse()
      const actual = response.votes ? response.votes.length : 0
      if (actual !== expected) {
        throw new Error(`Expected ${expected} vote(s), got ${actual}.`)
      }
    }
  },
  {
    name: 'response shows vote count with comment',
    pattern: /^the response shows (.+) vote with the comment "(.+)"$/,
    run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const expectedComment = resolveParam(m[2], example)
      const response = world.getLastResponse()
      const votes = response.votes || []
      const matching = votes.filter((v) => v.comment === expectedComment)
      if (votes.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} vote(s), got ${votes.length}.`)
      }
      if (matching.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} vote(s) with comment "${expectedComment}".`)
      }
    }
  },

  {
    name: 'db instance with mutes store',
    pattern: /^a psf-memo-db instance with a mutes store$/,
    async run () {
      // World is already created with the mutes store.
    }
  },
  {
    name: 'load fixture into mutes store',
    pattern: /^the fixture "(.+)" is loaded into the mutes store$/,
    async run (m, example, world) {
      await loadFixture(world, m[1])
    }
  },
  {
    name: 'request mute state',
    pattern: /^the client requests the mute state for muter (<[A-Za-z0-9_]+>) and mutee (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const muter = resolveParam(m[1], example)
      const mutee = resolveParam(m[2], example)
      const resp = await world.muteState.execute({ muterAddr: muter, muteeAddr: mutee })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'mute state reports muted',
    pattern: /^the mute state reports muted (<muted>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example) === 'true'
      const actual = world.getLastResponse().muted
      if (actual !== expected) {
        throw new Error(`Expected muted ${expected}, got ${actual}`)
      }
    }
  },
  {
    name: 'request muted list',
    pattern: /^the client requests the muted list for (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const muter = resolveParam(m[1], example)
      const resp = await world.listMuted.execute({ muterAddr: muter })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'muted list contains addresses',
    pattern: /^the muted list contains the addresses (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const raw = resolveParam(m[1], example).trim()
      const expected = raw.length === 0 ? [] : raw.split(',').map((s) => s.trim())
      const actual = world.getLastResponse().muted
      const expectedSet = new Set(expected)
      const actualSet = new Set(actual)
      if (expectedSet.size !== actualSet.size || !expectedSet.isSubsetOf(actualSet)) {
        throw new Error(`Expected muted ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    name: 'db instance with follows and followeeHeights stores',
    pattern: /^a psf-memo-db instance with follows and followeeHeights stores$/,
    async run () {
      // World is already created with both stores.
    }
  },
  {
    name: 'run followee index backfill utility',
    pattern: /^the followee index backfill utility is run$/,
    async run (m, example, world) {
      await backfillFolloweeIndex({
        followsDb: world.adapters.level.followsDb,
        followeeHeightsDb: world.adapters.level.followeeHeightsDb
      })
    }
  },
  {
    name: 'run followee index backfill utility again',
    pattern: /^the followee index backfill utility is run again$/,
    async run (m, example, world) {
      await backfillFolloweeIndex({
        followsDb: world.adapters.level.followsDb,
        followeeHeightsDb: world.adapters.level.followeeHeightsDb
      })
    }
  },
  {
    name: 'followeeHeights store contains entry',
    pattern: /^the followeeHeights store contains (<[A-Za-z0-9_]+>) entr(?:y|ies) for followee (<[A-Za-z0-9_]+>) from (<[A-Za-z0-9_]+>) at block height (<[A-Za-z0-9_]+>) marked unfollow (<[A-Za-z0-9_]+>|true|false)$/,
    async run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const followee = resolveParam(m[2], example)
      const follower = resolveParam(m[3], example)
      const height = parseInt(resolveParam(m[4], example), 10)
      const expectedUnfollow = resolveParam(m[5], example) === 'true'
      const key = followeeHeightKey(hash160(followee), height, follower)
      let count = 0
      for await (const [k, value] of world.adapters.level.followeeHeightsDb.iterator()) {
        if (k === key && value?.unfollow === expectedUnfollow) count++
      }
      if (count !== expectedCount) {
        throw new Error(`Expected ${expectedCount} followeeHeights entry/entries for ${key} marked unfollow ${expectedUnfollow}, got ${count}`)
      }
    }
  },
  {
    name: 'db instance with notification stores',
    pattern: /^a psf-memo-db instance with posts, postHeights, addrPostHeights, postChildren, likes, postLikes, follows, followeeHeights, and status stores$/,
    async run () {
      // World is already created with all stores.
    }
  },
  {
    name: 'set notification window',
    pattern: /^a notification window of (\S+) blocks$/,
    run (m, example, world) {
      const window = parseInt(resolveParam(m[1], example), 10)
      world.adapters.notificationsQuery.notificationBlockWindow = window
    }
  },
  {
    name: 'request notifications',
    pattern: /^the client requests \/posts\/notifications\/(<[A-Za-z0-9_]+>) with limit (<[A-Za-z0-9_]+>) and offset (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const addr = m[1] === '<viewer>' ? world.fixtureViewer : resolveParam(m[1], example)
      const limit = parseInt(resolveParam(m[2], example), 10)
      const offset = parseInt(resolveParam(m[3], example), 10)
      const resp = await world.listNotifications.execute({ addr, limit, offset })
      world.setLastResponse(resp)
    }
  },
  {
    name: 'response contains N notifications',
    pattern: /^the response contains (<[A-Za-z0-9_]+>) notifications$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      const notifications = world.getLastResponse().notifications
      if (notifications.length !== expected) {
        throw new Error(`Expected ${expected} notifications, got ${notifications.length}`)
      }
    }
  },
  {
    name: 'notification at index',
    pattern: /^the response notification at index (<[A-Za-z0-9_]+>) has type (<[A-Za-z0-9_]+>) from (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const index = parseInt(resolveParam(m[1], example), 10)
      const type = resolveParam(m[2], example)
      const actor = resolveParam(m[3], example)
      const notification = world.getLastResponse().notifications[index]
      if (!notification) {
        throw new Error(`No notification at index ${index}`)
      }
      if (notification.type !== type || notification.addr !== actor) {
        throw new Error(`Expected ${type} from ${actor} at index ${index}, got ${notification.type} from ${notification.addr}`)
      }
    }
  },
  {
    name: 'contains no notification from actor',
    pattern: /^the response contains no notification from (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const actor = resolveParam(m[1], example)
      const found = world.getLastResponse().notifications.find((n) => n.addr === actor)
      if (found) {
        throw new Error(`Expected no notification from ${actor}, got ${JSON.stringify(found)}`)
      }
    }
  },
  {
    name: 'bounded postLikes entries read',
    pattern: /^the postLikes store was read at most (<[A-Za-z0-9_]+>) entries$/,
    run (m, example, world) {
      const max = parseInt(resolveParam(m[1], example), 10)
      const reads = world.postLikesIteratorCounter.entries || 0
      if (reads > max) {
        throw new Error(`Read ${reads} postLikes entries, expected at most ${max}`)
      }
    }
  },
  {
    name: 'bounded followeeHeights entries read',
    pattern: /^the followeeHeights store was read at most (<[A-Za-z0-9_]+>) entries$/,
    run (m, example, world) {
      const max = parseInt(resolveParam(m[1], example), 10)
      const reads = world.followeeHeightsIteratorCounter.entries || 0
      if (reads > max) {
        throw new Error(`Read ${reads} followeeHeights entries, expected at most ${max}`)
      }
    }
  },
  {
    name: 'likes store was not iterated',
    pattern: /^the likes store was not iterated$/,
    run (m, example, world) {
      if (world.likesIteratorCounter.calls !== 0) {
        throw new Error(`Expected likes store not to be iterated, got ${world.likesIteratorCounter.calls} call(s)`)
      }
    }
  },
  {
    name: 'follows store was not iterated',
    pattern: /^the follows store was not iterated$/,
    run (m, example, world) {
      if (world.followsIteratorCounter.calls !== 0) {
        throw new Error(`Expected follows store not to be iterated, got ${world.followsIteratorCounter.calls} call(s)`)
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
