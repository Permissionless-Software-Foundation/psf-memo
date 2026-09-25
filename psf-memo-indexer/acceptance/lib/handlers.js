/*
  Project step handlers for the psf-memo-indexer acceptance pipeline.

  These handlers exercise the real Memo action handlers (handlePost, handleReply,
  handleLike) against an in-memory database that exposes the same CRUD surface as
  the psf-memo-db entity routes used by the indexer.
*/

import crypto from 'node:crypto'
import { handlePost } from '../../src/use-cases/action-types/post.js'
import { handleReply } from '../../src/use-cases/action-types/reply.js'
import { handleLike } from '../../src/use-cases/action-types/like.js'
import { handleCreatePoll } from '../../src/use-cases/action-types/poll-create.js'
import { handleAddPollOption } from '../../src/use-cases/action-types/poll-option.js'
import { handlePollVote } from '../../src/use-cases/action-types/poll-vote.js'
import { handleMute } from '../../src/use-cases/action-types/mute.js'
import { handleFollow } from '../../src/use-cases/action-types/follow.js'
import { handleTopicMessage } from '../../src/use-cases/action-types/topic-message.js'
import { handleTopicFollow } from '../../src/use-cases/action-types/topic-follow.js'
import { handleSetProfile } from '../../src/use-cases/action-types/set-profile.js'
import { topicRecencyKey } from '../../src/use-cases/action-types/helpers.js'
import BackupDb from '../../src/use-cases/backup-db.js'
import TxIndexerHandoff from '../../src/use-cases/tx-indexer-handoff.js'
import TxIndexerAdapter from '../../src/adapters/tx-indexer.js'
import config from '../../config/index.js'

function makeInMemoryDb () {
  const store = new Map()
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    async create (key, data) {
      store.set(key, data)
      return { success: true }
    },
    async update (key, data) {
      store.set(key, data)
      return { success: true }
    },
    async delete (key) {
      store.delete(key)
      return { success: true }
    },
    async * iterator () {
      for (const entry of store.entries()) yield entry
    },
    entries () {
      return Array.from(store.entries())
    }
  }
}

function resolveParam (value, example) {
  const match = /^\u003c([A-Za-z0-9_]+)\u003e$/.exec(String(value).trim())
  if (match) {
    const param = match[1]
    if (!(param in example)) {
      throw new Error(`Missing example value for "${param}"`)
    }
    return example[param]
  }
  return String(value).trim()
}

function deriveTxid (symbolic) {
  // Produce a deterministic 32-byte buffer from a symbolic test txid and return
  // its big-endian hex representation, which is what the indexer stores.
  return crypto.createHash('sha256').update(symbolic).digest().toString('hex')
}

// Derive a deterministic 20-byte pkHash hex for a symbolic test address. The
// follow action payload carries a pkHash, not an address, so the acceptance
// step and its assertion must derive the same value from the address.
function derivePkHash (addr) {
  return crypto.createHash('sha256').update(addr).digest().slice(0, 20).toString('hex')
}

function resolveTxid (value, example, world) {
  const resolved = resolveParam(value, example)
  if (!world.txidMap) world.txidMap = new Map()
  if (!world.txidMap.has(resolved)) {
    world.txidMap.set(resolved, deriveTxid(resolved))
  }
  return world.txidMap.get(resolved)
}

// Read a record from an in-memory DB, or null when it is absent. Mirrors the
// point lookups the psf-memo-db newest-qualifying-post read API performs.
async function getOrNull (db, key) {
  try {
    return await db.get(key)
  } catch (err) {
    if (err.notFound) return null
    throw err
  }
}

// In-memory stand-in for psf-memo-db's newest-qualifying-post read API. A
// qualifying post is a top-level post or topic message; replies (postParents)
// and poll creations (polls) do not qualify, and posts above the chain tip are
// unconfirmed. The newest confirmed qualifying post wins, with seen as the
// tie-breaker.
async function computeNewestQualifyingPost (stores, addr) {
  const chainBlockHeight = stores.status?.chainBlockHeight
  let best = null
  for await (const [key, value] of stores.addrPostHeightDb.iterator()) {
    if (!String(key).startsWith(`${addr}:`)) continue
    const txid = value?.txid
    if (!txid) continue
    const blockHeight = value?.blockHeight ?? 0
    if (chainBlockHeight !== undefined && blockHeight > chainBlockHeight) continue
    if (await getOrNull(stores.postParentDb, txid)) continue
    if (await getOrNull(stores.pollDb, txid)) continue
    const post = await getOrNull(stores.postDb, txid)
    const candidate = { addr, blockHeight, seen: post?.seen ?? 0 }
    if (
      !best ||
      candidate.blockHeight > best.blockHeight ||
      (candidate.blockHeight === best.blockHeight && candidate.seen > best.seen)
    ) {
      best = candidate
    }
  }
  return best
}

async function createWorld () {
  const postsDb = makeInMemoryDb()
  const postHeightsDb = makeInMemoryDb()
  const addrPostHeightsDb = makeInMemoryDb()
  const postParentsDb = makeInMemoryDb()
  const postChildrenDb = makeInMemoryDb()
  const likesDb = makeInMemoryDb()
  const postLikesDb = makeInMemoryDb()
  const backupRequestsDb = makeInMemoryDb()
  const pollDb = makeInMemoryDb()
  const pollOptionDb = makeInMemoryDb()
  const pollVoteDb = makeInMemoryDb()
  const muteDb = makeInMemoryDb()
  const followDb = makeInMemoryDb()
  const followeeHeightsDb = makeInMemoryDb()
  const roomDb = makeInMemoryDb()
  const topicSummaryDb = makeInMemoryDb()
  const topicRecencyDb = makeInMemoryDb()
  const profileDb = makeInMemoryDb()
  const profileRecencyDb = makeInMemoryDb()
  const status = { startBlockHeight: 0, syncedBlockHeight: 999999999, chainBlockHeight: 999999999 }
  const statusDb = {
    getStatus: async () => status,
    updateStatus: async (next) => { Object.assign(status, next); return true }
  }

  const newestQualifyingPostReads = []
  const newestQualifyingPost = {
    async get (addr) {
      newestQualifyingPostReads.push(addr)
      return computeNewestQualifyingPost({
        addrPostHeightDb: addrPostHeightsDb,
        postDb: postsDb,
        postParentDb: postParentsDb,
        pollDb,
        status
      }, addr)
    }
  }

  const adapters = {
    postDb: postsDb,
    postHeightDb: postHeightsDb,
    addrPostHeightDb: addrPostHeightsDb,
    postParentDb: postParentsDb,
    postChildDb: postChildrenDb,
    likeDb: likesDb,
    postLikeDb: postLikesDb,
    pollDb,
    pollOptionDb,
    pollVoteDb,
    muteDb,
    followDb,
    followeeHeightDb: followeeHeightsDb,
    roomDb,
    topicSummaryDb,
    topicRecencyDb,
    profileDb,
    profileRecencyDb,
    statusDb,
    newestQualifyingPost,
    processErrorDb: makeInMemoryDb(),
    dbCtrl: {
      backupDb: async (height, epoch) => {
        await backupRequestsDb.create(`${height}:${epoch}`, { height, epoch })
        return true
      }
    }
  }

  return {
    adapters,
    postsDb,
    postHeightsDb,
    addrPostHeightsDb,
    postParentsDb,
    postChildrenDb,
    likesDb,
    postLikesDb,
    backupRequestsDb,
    pollsDb: pollDb,
    pollOptionsDb: pollOptionDb,
    pollVotesDb: pollVoteDb,
    mutesDb: muteDb,
    followsDb: followDb,
    followeeHeightsDb,
    roomsDb: roomDb,
    topicSummariesDb: topicSummaryDb,
    topicRecencyDb,
    profileDb,
    profileRecencyDb,
    status,
    newestQualifyingPostReads,
    txidMap: new Map(),
    lastTxid: null,
    lastHeight: null,
    lastAddr: null
  }
}

const handlers = [
  {
    name: 'db instance with posts and postHeights stores',
    pattern: /^a psf-memo-db instance with posts and postHeights stores$/,
    async run () {
      // World is already created with both stores.
    }
  },
  {
    name: 'db instance that records backup requests',
    pattern: /^a psf-memo-db instance that records backup requests$/,
    async run () {
      // World is already created with a backup request store.
    }
  },
  {
    name: 'db instance with new indexes',
    pattern: /^a psf-memo-db instance with posts, postHeights, addrPostHeights, likes, and postLikes stores$/,
    async run () {
      // World is already created with all stores.
    }
  },
  {
    name: 'indexer configured to write to db',
    pattern: /^a psf-memo-indexer configured to write to that database$/,
    async run () {
      // Adapters object is already configured.
    }
  },
  {
    name: 'process a Memo post transaction',
    pattern: /^the indexer processes a Memo post transaction (.+) from (.+) at block height (.+) with text "(.+)"(?: seen at (.+))?$/,
    async run (m, example, world) {
      const txid = resolveTxid(m[1], example, world)
      const addr = resolveParam(m[2], example)
      const height = parseInt(resolveParam(m[3], example), 10)
      const text = resolveParam(m[4], example)
      const seen = m[5] ? parseInt(resolveParam(m[5], example), 10) : Date.now()

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      // A processed post is confirmed, so raise the status tip when needed.
      if (world.status) {
        world.status.chainBlockHeight = Math.max(world.status.chainBlockHeight ?? 0, height)
      }

      const prefix = Buffer.from('6d02', 'hex')
      const message = Buffer.from(text, 'utf8')

      await handlePost({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen,
        blockHeight: height,
        decoded: {
          action: 'post',
          prefix,
          pushDatas: [prefix, message]
        }
      })
    }
  },
  {
    name: 'process a Memo reply transaction',
    pattern: /^the indexer processes a Memo reply transaction (.+) to parent (.+) from (.+) at block height (.+) with text "(.+)"$/,
    async run (m, example, world) {
      const txid = resolveTxid(m[1], example, world)
      const parentTxid = resolveTxid(m[2], example, world)
      const addr = resolveParam(m[3], example)
      const height = parseInt(resolveParam(m[4], example), 10)
      const text = resolveParam(m[5], example)

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d03', 'hex')
      // handleReply expects the parent tx hash as a 32-byte buffer in the
      // little-endian wire format; txHashFromPush reverses it to big-endian hex.
      const parentHash = Buffer.from(parentTxid, 'hex').reverse()
      const message = Buffer.from(text, 'utf8')

      await handleReply({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'reply',
          prefix,
          pushDatas: [prefix, parentHash, message]
        }
      })
    }
  },
  {
    name: 'process a Memo like transaction',
    pattern: /^the indexer processes a Memo like transaction (.+) for post (.+) from (.+) at block height (.+)$/,
    async run (m, example, world) {
      const txid = resolveTxid(m[1], example, world)
      const postTxid = resolveTxid(m[2], example, world)
      const addr = resolveParam(m[3], example)
      const height = parseInt(resolveParam(m[4], example), 10)

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d04', 'hex')
      const postHash = Buffer.from(postTxid, 'hex').reverse()

      await handleLike({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: height,
        txDetails: { vout: [] },
        decoded: {
          action: 'like',
          prefix,
          pushDatas: [prefix, postHash]
        }
      })
    }
  },
  {
    name: 'db instance that records poll records',
    pattern: /^a psf-memo-db instance that records poll records$/,
    async run () {
      // World is already created with poll stores.
    }
  },
  {
    name: 'process a create-poll transaction',
    pattern: /^the indexer processes a create-poll transaction with the question "(.+)" and (.+) options$/,
    async run (m, example, world) {
      const txid = deriveTxid(`poll-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      const question = resolveParam(m[1], example)
      const optionCount = parseInt(resolveParam(m[2], example), 10)
      const height = 600100
      const addr = 'bitcoincash:qaddr-a'

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d10', 'hex')
      const pollTypeBuf = Buffer.from([1])
      const optionCountBuf = Buffer.from([optionCount])
      const questionBuf = Buffer.from(question, 'utf8')

      await handleCreatePoll({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'createPoll',
          prefix,
          pushDatas: [prefix, pollTypeBuf, optionCountBuf, questionBuf]
        }
      })
    }
  },
  {
    name: 'process an add-option transaction',
    pattern: /^the indexer processes an add-option transaction for the poll (.+) with the option "(.+)"$/,
    async run (m, example, world) {
      const txid = deriveTxid(`option-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      const pollTxid = resolveTxid(m[1], example, world)
      const option = resolveParam(m[2], example)
      const height = 600101
      const addr = 'bitcoincash:qaddr-a'

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d13', 'hex')
      const pollHash = Buffer.from(pollTxid, 'hex').reverse()
      const optionBuf = Buffer.from(option, 'utf8')

      await handleAddPollOption({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'addPollOption',
          prefix,
          pushDatas: [prefix, pollHash, optionBuf]
        }
      })
    }
  },
  {
    name: 'process a vote transaction',
    pattern: /^the indexer processes a vote transaction for the poll (.+) with the comment "(.+)"$/,
    async run (m, example, world) {
      const txid = deriveTxid(`vote-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      const pollTxid = resolveTxid(m[1], example, world)
      const comment = resolveParam(m[2], example)
      const height = 600102
      const addr = 'bitcoincash:qaddr-a'

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d14', 'hex')
      const pollHash = Buffer.from(pollTxid, 'hex').reverse()
      const commentBuf = Buffer.from(comment, 'utf8')

      await handlePollVote({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'pollVote',
          prefix,
          pushDatas: [prefix, pollHash, commentBuf]
        }
      })
    }
  },
  {
    name: 'polls store contains poll document',
    pattern: /^the psf-memo-db stores a poll with the question "(.+)" and (.+) options$/,
    run (m, example, world) {
      const expectedQuestion = resolveParam(m[1], example)
      const expectedOptionCount = parseInt(resolveParam(m[2], example), 10)
      const matching = world.pollsDb.entries().filter(([key, value]) => {
        return value?.question === expectedQuestion && value?.optionCount === expectedOptionCount
      })
      if (matching.length === 0) {
        throw new Error(`Expected a poll document with question "${expectedQuestion}" and ${expectedOptionCount} options.`)
      }
    }
  },
  {
    name: 'poll options store contains option document',
    pattern: /^the psf-memo-db stores the option "(.+)" for the poll (.+)$/,
    run (m, example, world) {
      const expectedOption = resolveParam(m[1], example)
      const pollTxid = resolveTxid(m[2], example, world)
      const matching = world.pollOptionsDb.entries().filter(([key, value]) => {
        return value?.pollTxid === pollTxid && value?.option === expectedOption
      })
      if (matching.length === 0) {
        throw new Error(`Expected an option document "${expectedOption}" for poll ${pollTxid}.`)
      }
    }
  },
  {
    name: 'poll votes store contains vote document',
    pattern: /^the psf-memo-db stores the vote "(.+)" for the poll (.+)$/,
    run (m, example, world) {
      const expectedComment = resolveParam(m[1], example)
      const pollTxid = resolveTxid(m[2], example, world)
      const matching = world.pollVotesDb.entries().filter(([key, value]) => {
        return value?.pollTxid === pollTxid && value?.comment === expectedComment
      })
      if (matching.length === 0) {
        throw new Error(`Expected a vote document "${expectedComment}" for poll ${pollTxid}.`)
      }
    }
  },
  {
    name: 'process error recorded and no poll stored',
    pattern: /^the indexer records a process error and stores no poll$/,
    run (m, example, world) {
      const txid = world.lastTxid
      const errors = world.adapters.processErrorDb.entries().filter(([key]) => key === txid)
      if (errors.length === 0) {
        throw new Error(`Expected a process error for txid ${txid}.`)
      }
      const polls = world.pollsDb.entries().filter(([key]) => key === txid)
      if (polls.length !== 0) {
        throw new Error(`Expected no poll document for txid ${txid}, but one was stored.`)
      }
    }
  },
  {
    name: 'process error recorded and no option stored',
    pattern: /^the indexer records a process error and stores no option$/,
    run (m, example, world) {
      const txid = world.lastTxid
      const errors = world.adapters.processErrorDb.entries().filter(([key]) => key === txid)
      if (errors.length === 0) {
        throw new Error(`Expected a process error for txid ${txid}.`)
      }
      const options = world.pollOptionsDb.entries().filter(([key]) => key === txid)
      if (options.length !== 0) {
        throw new Error(`Expected no option document for txid ${txid}, but one was stored.`)
      }
    }
  },
  {
    name: 'process error recorded and no vote stored',
    pattern: /^the indexer records a process error and stores no vote$/,
    run (m, example, world) {
      const txid = world.lastTxid
      const errors = world.adapters.processErrorDb.entries().filter(([key]) => key === txid)
      if (errors.length === 0) {
        throw new Error(`Expected a process error for txid ${txid}.`)
      }
      const votes = world.pollVotesDb.entries().filter(([key]) => key === txid)
      if (votes.length !== 0) {
        throw new Error(`Expected no vote document for txid ${txid}, but one was stored.`)
      }
    }
  },
  {
    name: 'process the same Memo post transaction again',
    pattern: /^the indexer processes the same Memo post transaction (.+) again$/,
    async run (m, example, world) {
      const txid = resolveTxid(m[1], example, world)
      const post = await world.postsDb.get(txid)

      const prefix = Buffer.from('6d02', 'hex')
      const message = Buffer.from(post.text, 'utf8')

      await handlePost({
        adapters: world.adapters,
        txid,
        signerAddr: post.addr,
        seen: post.seen,
        blockHeight: post.blockHeight,
        decoded: {
          action: 'post',
          prefix,
          pushDatas: [prefix, message]
        }
      })
    }
  },
  {
    name: 'block indexer in ZMQ mode processes a block',
    pattern: /^the block indexer in ZMQ mode processes a block at height (.+) with epoch (.+)$/,
    async run (m, example, world) {
      const height = parseInt(resolveParam(m[1], example), 10)
      const epoch = parseInt(resolveParam(m[2], example), 10)
      const backupDb = new BackupDb({ adapters: world.adapters })
      await backupDb.maybeBackupDb(height, epoch)
    }
  },
  {
    name: 'db receives backup request',
    pattern: /^the psf-memo-db receives (.+) backup request for block (.+) with epoch (.+)$/,
    run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const height = parseInt(resolveParam(m[2], example), 10)
      const epoch = parseInt(resolveParam(m[3], example), 10)
      const key = `${height}:${epoch}`
      const matching = world.backupRequestsDb.entries().filter(([k]) => k === key)
      if (matching.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} backup request(s) for block ${height} epoch ${epoch}, got ${matching.length}`)
      }
    }
  },
  {
    name: 'posts store contains post document',
    pattern: /^the posts store contains (.+) post document for (.+)$/,
    run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const txid = resolveTxid(m[2], example, world)
      const matching = world.postsDb.entries().filter(([key]) => key === txid)
      if (matching.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} post document(s) for ${txid}, got ${matching.length}`)
      }
    }
  },
  {
    name: 'postHeights store contains entry',
    pattern: /^the postHeights store contains (.+) entry whose key starts with the block height (.+) and ends with (.+)$/,
    run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const height = resolveParam(m[2], example)
      const txid = resolveTxid(m[3], example, world)
      const prefix = String(height).padStart(12, '0')
      const matching = world.postHeightsDb.entries().filter(([key, value]) => {
        return key.startsWith(prefix) && (key.endsWith(`:${txid}`) || value?.txid === txid)
      })
      if (matching.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} postHeights entry/entries for height ${height} txid ${txid}, got ${matching.length}`)
      }
    }
  },
  {
    name: 'addrPostHeights store contains entry',
    pattern: /^the addrPostHeights store contains (.+) entry whose key starts with (.+) and ends with (.+)$/,
    run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const addr = resolveParam(m[2], example)
      const txid = resolveTxid(m[3], example, world)
      const matching = world.addrPostHeightsDb.entries().filter(([key, value]) => {
        return key.startsWith(`${addr}:`) && (key.endsWith(`:${txid}`) || value?.txid === txid)
      })
      if (matching.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} addrPostHeights entry/entries for ${addr}/${txid}, got ${matching.length}`)
      }
    }
  },
  {
    name: 'postParents store contains link',
    pattern: /^the postParents store contains a link from (.+) to (.+)$/,
    run (m, example, world) {
      const childTxid = resolveTxid(m[1], example, world)
      const parentTxid = resolveTxid(m[2], example, world)
      const link = world.postParentsDb.entries().find(([key, value]) => {
        return key === childTxid && value?.parentTxid === parentTxid
      })
      if (!link) {
        throw new Error(`Expected postParents link from ${childTxid} to ${parentTxid}`)
      }
    }
  },
  {
    name: 'postChildren store contains link',
    pattern: /^the postChildren store contains a link from (.+) to (.+)$/,
    run (m, example, world) {
      const parentTxid = resolveTxid(m[1], example, world)
      const childTxid = resolveTxid(m[2], example, world)
      const link = world.postChildrenDb.entries().find(([key, value]) => {
        return value?.parentTxid === parentTxid && value?.childTxid === childTxid
      })
      if (!link) {
        throw new Error(`Expected postChildren link from ${parentTxid} to ${childTxid}`)
      }
    }
  },
  {
    name: 'postLikes store contains entry',
    pattern: /^the postLikes store contains (.+) entry whose key starts with (.+) and ends with (.+)$/,
    run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const postTxid = resolveTxid(m[2], example, world)
      const likeTxid = resolveTxid(m[3], example, world)
      const matching = world.postLikesDb.entries().filter(([key, value]) => {
        return key.startsWith(`${postTxid}:`) && (key.endsWith(`:${likeTxid}`) || value?.txid === likeTxid)
      })
      if (matching.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} postLikes entry/entries for ${postTxid}/${likeTxid}, got ${matching.length}`)
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
    name: 'process a Memo follow',
    pattern: /^the indexer processes a Memo follow of (.+) from (.+) at block height (.+)$/,
    async run (m, example, world) {
      const followee = resolveParam(m[1], example)
      const follower = resolveParam(m[2], example)
      const height = parseInt(resolveParam(m[3], example), 10)
      const txid = deriveTxid(`follow-${follower}-${followee}-${height}`)

      const prefix = Buffer.from('6d06', 'hex')
      const hashBuf = Buffer.from(derivePkHash(followee), 'hex')
      const ctx = {
        adapters: world.adapters,
        txid,
        signerAddr: follower,
        seen: Date.now(),
        blockHeight: height,
        decoded: { action: 'follow', prefix, pushDatas: [prefix, hashBuf] }
      }
      world.lastFollow = { followee, follower, height, ctx }

      await handleFollow(ctx)
    }
  },
  {
    name: 'process a Memo unfollow',
    pattern: /^the indexer processes a Memo unfollow of (.+) from (.+) at block height (.+)$/,
    async run (m, example, world) {
      const followee = resolveParam(m[1], example)
      const follower = resolveParam(m[2], example)
      const height = parseInt(resolveParam(m[3], example), 10)
      const txid = deriveTxid(`unfollow-${follower}-${followee}-${height}`)

      const prefix = Buffer.from('6d07', 'hex')
      const hashBuf = Buffer.from(derivePkHash(followee), 'hex')
      const ctx = {
        adapters: world.adapters,
        txid,
        signerAddr: follower,
        seen: Date.now(),
        blockHeight: height,
        decoded: { action: 'unfollow', prefix, pushDatas: [prefix, hashBuf] }
      }
      world.lastFollow = { followee, follower, height, ctx }

      await handleFollow(ctx)
    }
  },
  {
    name: 'process the same Memo follow again',
    pattern: /^the indexer processes the same Memo follow of (.+) from (.+) again$/,
    async run (m, example, world) {
      if (!world.lastFollow) {
        throw new Error('No previous follow to reprocess')
      }
      await handleFollow(world.lastFollow.ctx)
    }
  },
  {
    name: 'followeeHeights store contains entry',
    pattern: /^the followeeHeights store contains (.+) entr(?:y|ies) for followee (.+) from (.+) at block height (.+) marked unfollow (true|false)$/,
    run (m, example, world) {
      const expectedCount = parseInt(resolveParam(m[1], example), 10)
      const followee = resolveParam(m[2], example)
      const follower = resolveParam(m[3], example)
      const height = parseInt(resolveParam(m[4], example), 10)
      const expectedUnfollow = m[5] === 'true'
      const pkHash = derivePkHash(followee)
      const key = `${pkHash}:${String(height).padStart(12, '0')}:${follower}`
      const matching = world.followeeHeightsDb.entries().filter(([k, value]) => {
        return k === key && value?.unfollow === expectedUnfollow
      })
      if (matching.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} followeeHeights entry/entries for ${key} unfollow ${expectedUnfollow}, got ${matching.length}`)
      }
    }
  }
]

const muteHandlers = [
  {
    name: 'db instance that records mute records',
    pattern: /^a psf-memo-db instance that records mute records$/,
    async run () {
      // World is already created with a mute store.
    }
  },
  {
    name: 'process a mute transaction',
    pattern: /^the indexer processes a mute transaction for the address (.+) from (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const muterAddr = resolveParam(m[2], example)
      const txid = deriveTxid(`mute-${addr || 'empty'}-${muterAddr}`)
      const height = 600150

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = muterAddr

      const prefix = Buffer.from('6d16', 'hex')
      // Empty address means wrong-size payload path; use a 0-byte buffer.
      const hashBuf = addr ? Buffer.from(crypto.createHash('sha256').update(addr).digest().slice(0, 20)) : Buffer.alloc(0)

      await handleMute({
        adapters: world.adapters,
        txid,
        signerAddr: muterAddr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'mute',
          prefix,
          pushDatas: [prefix, hashBuf]
        }
      })
    }
  },
  {
    name: 'process an unmute transaction',
    pattern: /^the indexer processes an unmute transaction for the address (.+) from (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const muterAddr = resolveParam(m[2], example)
      const txid = deriveTxid(`unmute-${addr}-${muterAddr}`)
      const height = 600150

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = muterAddr

      const prefix = Buffer.from('6d17', 'hex')
      const hash160 = crypto.createHash('sha256').update(addr).digest().slice(0, 20).toString('hex')
      const hashBuf = Buffer.from(hash160, 'hex')

      await handleMute({
        adapters: world.adapters,
        txid,
        signerAddr: muterAddr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'unmute',
          prefix,
          pushDatas: [prefix, hashBuf]
        }
      })
    }
  },
  {
    name: 'mute record stored',
    pattern: /^the psf-memo-db stores a mute record for the address (.+) by (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const muterAddr = resolveParam(m[2], example)
      const hash160 = crypto.createHash('sha256').update(addr).digest().slice(0, 20).toString('hex')
      const key = `${muterAddr}:${hash160}`
      const matching = world.mutesDb.entries().filter(([k]) => k === key)
      if (matching.length === 0) {
        throw new Error(`Expected a mute record for ${addr} by ${muterAddr}`)
      }
      if (matching[0][1].unmute !== false) {
        throw new Error(`Expected a mute (not unmute) record for ${addr} by ${muterAddr}`)
      }
    }
  },
  {
    name: 'unmute record stored',
    pattern: /^the psf-memo-db stores an unmute record for the address (.+) by (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const muterAddr = resolveParam(m[2], example)
      const hash160 = crypto.createHash('sha256').update(addr).digest().slice(0, 20).toString('hex')
      const key = `${muterAddr}:${hash160}`
      const matching = world.mutesDb.entries().filter(([k]) => k === key)
      if (matching.length === 0) {
        throw new Error(`Expected an unmute record for ${addr} by ${muterAddr}`)
      }
      if (matching[0][1].unmute !== true) {
        throw new Error(`Expected an unmute record for ${addr} by ${muterAddr}`)
      }
    }
  },
  {
    name: 'process error and no mute record for wrong-size address',
    pattern: /^the indexer records a process error and stores no mute record$/,
    run (m, example, world) {
      const txid = world.lastTxid
      const errors = world.adapters.processErrorDb.entries().filter(([key]) => key === txid)
      if (errors.length === 0) {
        throw new Error(`Expected a process error for txid ${txid}`)
      }
      const mutes = world.mutesDb.entries().filter(([key]) => key === txid)
      if (mutes.length !== 0) {
        throw new Error(`Expected no mute document for txid ${txid}, but one was stored`)
      }
    }
  },
  {
    name: 'db instance with rooms and topic index stores',
    pattern: /^a psf-memo-db instance with rooms, topicSummaries, and topicRecency stores$/,
    async run () {
      // World is already created with the room and topic index stores.
    }
  },
  {
    name: 'process a Memo topic message',
    pattern: /^the indexer processes a Memo topic message (.+) in room "(.+)" from (.+) at block height (.+) with text "(.+)"(?: seen at (.+))?$/,
    async run (m, example, world) {
      const txid = resolveTxid(m[1], example, world)
      const room = resolveParam(m[2], example)
      const addr = resolveParam(m[3], example)
      const height = parseInt(resolveParam(m[4], example), 10)
      const text = m[5]
      const seen = m[6] ? parseInt(resolveParam(m[6], example), 10) : Date.now()

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d0c', 'hex')
      const ctx = {
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen,
        blockHeight: height,
        decoded: {
          action: 'topicMessage',
          prefix,
          pushDatas: [prefix, Buffer.from(room, 'utf8'), Buffer.from(text, 'utf8')]
        }
      }
      world.lastTopicMessage = ctx

      await handleTopicMessage(ctx)
    }
  },
  {
    name: 'reprocess the last Memo topic message',
    pattern: /^the indexer processes the same Memo topic message (.+) again$/,
    async run (m, example, world) {
      if (!world.lastTopicMessage) {
        throw new Error('No previous topic message to reprocess')
      }
      await handleTopicMessage(world.lastTopicMessage)
    }
  },
  {
    name: 'process a Memo topic follow',
    pattern: /^the indexer processes a Memo topic follow for room "(.+)" from (.+)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const addr = resolveParam(m[2], example)
      const txid = deriveTxid(`topic-follow-${room}-${addr}`)

      world.lastTxid = txid
      world.lastAddr = addr

      const prefix = Buffer.from('6d0d', 'hex')
      const ctx = {
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: 600000,
        decoded: {
          action: 'topicFollow',
          prefix,
          pushDatas: [prefix, Buffer.from(room, 'utf8')]
        }
      }
      world.lastTopicFollow = ctx

      await handleTopicFollow(ctx)
    }
  },
  {
    name: 'process a Memo topic unfollow',
    pattern: /^the indexer processes a Memo topic unfollow for room "(.+)" from (.+)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const addr = resolveParam(m[2], example)
      const txid = deriveTxid(`topic-unfollow-${room}-${addr}`)

      world.lastTxid = txid
      world.lastAddr = addr

      const prefix = Buffer.from('6d0e', 'hex')
      const ctx = {
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: 600000,
        decoded: {
          action: 'topicUnfollow',
          prefix,
          pushDatas: [prefix, Buffer.from(room, 'utf8')]
        }
      }
      world.lastTopicFollow = ctx

      await handleTopicFollow(ctx)
    }
  },
  {
    name: 'reprocess the last Memo topic follow',
    pattern: /^the indexer processes the same Memo topic follow for room "(.+)" from (.+) again$/,
    async run (m, example, world) {
      if (!world.lastTopicFollow) {
        throw new Error('No previous topic follow to reprocess')
      }
      await handleTopicFollow(world.lastTopicFollow)
    }
  },
  {
    name: 'topicSummaries contains room with postCount and lastHeight',
    pattern: /^the topicSummaries store contains the room "(.+)" with postCount (.+) and lastHeight (.+)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const postCount = parseInt(resolveParam(m[2], example), 10)
      const lastHeight = parseInt(resolveParam(m[3], example), 10)
      const record = await world.topicSummariesDb.get(room)
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
    pattern: /^the topicSummaries store records the room "(.+)" last seen at (.+)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const lastSeen = parseInt(resolveParam(m[2], example), 10)
      const record = await world.topicSummariesDb.get(room)
      if (!record) {
        throw new Error(`No topicSummaries record for ${room}`)
      }
      if (record.lastSeen !== lastSeen) {
        throw new Error(`Expected ${room} lastSeen ${lastSeen}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'topicSummaries records room follower count',
    pattern: /^the topicSummaries store records the room "(.+)" with (.+?) followers?$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const followerCount = parseInt(resolveParam(m[2], example), 10)
      const record = await world.topicSummariesDb.get(room)
      if (!record) {
        throw new Error(`No topicSummaries record for ${room}`)
      }
      if (record.followerCount !== followerCount) {
        throw new Error(`Expected ${room} followerCount ${followerCount}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'topicRecency records room at height',
    pattern: /^the topicRecency store records the room "(.+)" at block height (.+)$/,
    async run (m, example, world) {
      const room = resolveParam(m[1], example)
      const height = parseInt(resolveParam(m[2], example), 10)
      const record = await world.topicRecencyDb.get(topicRecencyKey(height, room))
      if (!record) {
        throw new Error(`No topicRecency record for ${room} at ${height}`)
      }
      if (record.room !== room || record.blockHeight !== height) {
        throw new Error(`Expected topicRecency ${room} at ${height}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'db instance with profiles and profileRecency stores',
    pattern: /^a psf-memo-db instance with profiles and profileRecency stores$/,
    async run () {
      // World is already created with both stores.
    }
  },
  {
    name: 'store a profile for an address',
    pattern: /^the psf-memo-db stores a profile for (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      await world.profileDb.update(addr, {
        addr,
        text: 'my bio',
        txid: `profile-${addr}`,
        blockHeight: 600000,
        seen: 1
      })
    }
  },
  {
    name: 'transaction indexer sees a Memo post transaction',
    pattern: /^the transaction indexer sees a Memo post transaction (.+) from (.+) at block height (.+) with text "(.+)"$/,
    async run (m, example, world) {
      const txid = resolveTxid(m[1], example, world)
      const addr = resolveParam(m[2], example)
      const height = parseInt(resolveParam(m[3], example), 10)
      const text = resolveParam(m[4], example)

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      // Mempool processing predicts the next height, which is above the chain
      // tip, so the post is unconfirmed.
      if (world.status) {
        world.status.chainBlockHeight = Math.min(world.status.chainBlockHeight ?? height, height - 1)
      }

      const prefix = Buffer.from('6d02', 'hex')
      await handlePost({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'post',
          prefix,
          pushDatas: [prefix, Buffer.from(text, 'utf8')]
        }
      })
    }
  },
  {
    name: 'process a set-profile transaction',
    pattern: /^the indexer processes a set-profile transaction for (.+) with text "(.+)"$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const text = resolveParam(m[2], example)
      const txid = deriveTxid(`profile-${addr}-${text}`)
      const height = 600400

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d05', 'hex')
      await handleSetProfile({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
        blockHeight: height,
        decoded: {
          action: 'setProfile',
          prefix,
          pushDatas: [prefix, Buffer.from(text, 'utf8')]
        }
      })
    }
  },
  {
    name: 'profileRecency records addr at height seen',
    pattern: /^the profileRecency store records (.+) at block height (.+) seen at (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const height = parseInt(resolveParam(m[2], example), 10)
      const seen = parseInt(resolveParam(m[3], example), 10)
      let record
      try {
        record = await world.profileRecencyDb.get(addr)
      } catch (err) {
        throw new Error(`No profileRecency record for ${addr}`)
      }
      if (record.blockHeight !== height || record.seen !== seen) {
        throw new Error(`Expected profileRecency ${addr} at ${height} seen ${seen}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'profileRecency has no record for addr',
    pattern: /^the profileRecency store has no record for (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const record = await world.profileRecencyDb.get(addr).catch(() => null)
      if (record) {
        throw new Error(`Expected no profileRecency record for ${addr}, got ${JSON.stringify(record)}`)
      }
    }
  },
  {
    name: 'indexer read newest qualifying post from psf-memo-db',
    pattern: /^the indexer read the newest qualifying post for (.+) from the psf-memo-db$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      if (!world.newestQualifyingPostReads.includes(addr)) {
        throw new Error(`Expected the indexer to read the newest qualifying post for ${addr} from psf-memo-db`)
      }
    }
  },
  {
    name: 'psf-memo-indexer with a TX indexer control endpoint',
    pattern: /^a psf-memo-indexer with a TX indexer control endpoint$/,
    run (m, example, world) {
      world.txHandoff = {
        remainingFailures: 0,
        unreachable: false,
        retryIntervalMs: undefined,
        waits: [],
        parkSleeps: false,
        requestCount: 0,
        requests: [],
        result: null,
        backgroundPromise: null
      }
      world.txConfig = { ...config }
      world.txControl = {
        get: async (url, options) => {
          world.txHandoff.requestCount++
          world.txHandoff.requests.push({ url, options })
          if (world.txHandoff.unreachable) {
            throw new Error('TX indexer control endpoint unreachable')
          }
          if (world.txHandoff.remainingFailures > 0) {
            world.txHandoff.remainingFailures--
            throw new Error('TX indexer control endpoint failed')
          }
          return { data: { started: true } }
        }
      }
      world.txIndexerAdapter = new TxIndexerAdapter({
        axios: world.txControl,
        config: world.txConfig
      })
      world.txHandoff.handoff = new TxIndexerHandoff({
        startTxIndexer: () => world.txIndexerAdapter.startTxIndexer(),
        sleep: (ms) => {
          world.txHandoff.waits.push(ms)
          if (world.txHandoff.parkSleeps) return new Promise(() => {})
          return Promise.resolve()
        }
      })
    }
  },
  {
    name: 'TX indexer control endpoint fails then succeeds',
    pattern: /^the TX indexer control endpoint fails (.+) time\(s\) then succeeds$/,
    run (m, example, world) {
      world.txHandoff.remainingFailures = parseInt(resolveParam(m[1], example), 10)
    }
  },
  {
    name: 'TX indexer control endpoint is unreachable',
    pattern: /^the TX indexer control endpoint is unreachable$/,
    run (m, example, world) {
      world.txHandoff.unreachable = true
    }
  },
  {
    name: 'retry interval configured',
    pattern: /^the retry interval is configured to (.+) milliseconds$/,
    run (m, example, world) {
      world.txHandoff.retryIntervalMs = parseInt(resolveParam(m[1], example), 10)
    }
  },
  {
    name: 'block indexer runs TX indexer handoff',
    pattern: /^the block indexer runs the TX indexer handoff$/,
    async run (m, example, world) {
      world.txHandoff.result = await world.txHandoff.handoff.run({
        retryIntervalMs: world.txHandoff.retryIntervalMs
      })
    }
  },
  {
    name: 'block indexer runs TX indexer handoff until stopped',
    pattern: /^the block indexer runs the TX indexer handoff until stopped after (.+) retries?$/,
    async run (m, example, world) {
      world.txHandoff.result = await world.txHandoff.handoff.run({
        maxRetries: parseInt(resolveParam(m[1], example), 10),
        retryIntervalMs: world.txHandoff.retryIntervalMs
      })
    }
  },
  {
    name: 'block indexer starts TX indexer handoff in background',
    pattern: /^the block indexer starts the TX indexer handoff in the background$/,
    run (m, example, world) {
      world.txHandoff.parkSleeps = true
      world.txHandoff.backgroundPromise = world.txHandoff.handoff.startInBackground({
        retryIntervalMs: world.txHandoff.retryIntervalMs
      })
    }
  },
  {
    name: 'TX indexer start request attempted',
    pattern: /^the TX indexer start request was attempted (.+) times?$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      if (world.txHandoff.requestCount !== expected) {
        throw new Error(`Expected ${expected} TX indexer start request(s), got ${world.txHandoff.requestCount}`)
      }
    }
  },
  {
    name: 'handoff retried',
    pattern: /^the handoff retried (.+) time\(s\)$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      if (world.txHandoff.result?.retries !== expected) {
        throw new Error(`Expected ${expected} handoff retries, got ${world.txHandoff.result?.retries}`)
      }
    }
  },
  {
    name: 'handoff waited before each retry',
    pattern: /^the handoff waited (.+) milliseconds before each retry$/,
    run (m, example, world) {
      const expected = parseInt(resolveParam(m[1], example), 10)
      const waits = world.txHandoff.waits
      if (waits.length !== world.txHandoff.result?.retries) {
        throw new Error(`Expected a wait before each of ${world.txHandoff.result?.retries} retries, got ${waits.length}`)
      }
      if (!waits.every((w) => w === expected)) {
        throw new Error(`Expected each handoff wait to be ${expected}ms, got ${JSON.stringify(waits)}`)
      }
    }
  },
  {
    name: 'TX indexer is started',
    pattern: /^the TX indexer is started$/,
    run (m, example, world) {
      if (world.txHandoff.result?.started !== true) {
        throw new Error('Expected the TX indexer handoff to start the TX indexer')
      }
    }
  }
]

async function handleStep (step, example, world) {
  for (const handler of handlers.concat(muteHandlers)) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

export { createWorld, handleStep }
