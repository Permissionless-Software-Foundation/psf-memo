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
import BackupDb from '../../src/use-cases/backup-db.js'

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

function resolveTxid (value, example, world) {
  const resolved = resolveParam(value, example)
  if (!world.txidMap) world.txidMap = new Map()
  if (!world.txidMap.has(resolved)) {
    world.txidMap.set(resolved, deriveTxid(resolved))
  }
  return world.txidMap.get(resolved)
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
    pattern: /^the indexer processes a Memo post transaction (.+) from (.+) at block height (.+) with text "(.+)"$/,
    async run (m, example, world) {
      const txid = resolveTxid(m[1], example, world)
      const addr = resolveParam(m[2], example)
      const height = parseInt(resolveParam(m[3], example), 10)
      const text = resolveParam(m[4], example)

      world.lastTxid = txid
      world.lastHeight = height
      world.lastAddr = addr

      const prefix = Buffer.from('6d02', 'hex')
      const message = Buffer.from(text, 'utf8')

      await handlePost({
        adapters: world.adapters,
        txid,
        signerAddr: addr,
        seen: Date.now(),
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
