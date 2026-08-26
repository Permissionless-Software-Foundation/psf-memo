/*
  Project step handlers for the psf-memo-indexer acceptance pipeline.

  These handlers exercise the real Memo action handlers (handlePost, handleReply)
  against an in-memory database that exposes the same CRUD surface as the
  psf-memo-db entity routes used by the indexer.
*/

import crypto from 'node:crypto'
import { handlePost } from '../../src/use-cases/action-types/post.js'
import { handleReply } from '../../src/use-cases/action-types/reply.js'

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
  const postParentsDb = makeInMemoryDb()
  const postChildrenDb = makeInMemoryDb()

  const adapters = {
    postDb: postsDb,
    postHeightDb: postHeightsDb,
    postParentDb: postParentsDb,
    postChildDb: postChildrenDb,
    processErrorDb: makeInMemoryDb()
  }

  return {
    adapters,
    postsDb,
    postHeightsDb,
    postParentsDb,
    postChildrenDb,
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
