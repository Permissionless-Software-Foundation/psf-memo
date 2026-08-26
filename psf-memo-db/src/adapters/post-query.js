/*
  Adapter for efficient post queries using a postHeights secondary index.
*/

const HEIGHT_PAD = 12

class PostQuery {
  constructor (localConfig = {}) {
    const { postsDb, postHeightsDb, postParentsDb, postChildrenDb } = localConfig
    if (!postsDb) {
      throw new Error('postsDb required when instantiating PostQuery adapter.')
    }
    if (!postHeightsDb) {
      throw new Error('postHeightsDb required when instantiating PostQuery adapter.')
    }
    if (!postParentsDb) {
      throw new Error('postParentsDb required when instantiating PostQuery adapter.')
    }
    if (!postChildrenDb) {
      throw new Error('postChildrenDb required when instantiating PostQuery adapter.')
    }
    this.postsDb = postsDb
    this.postHeightsDb = postHeightsDb
    this.postParentsDb = postParentsDb
    this.postChildrenDb = postChildrenDb

    this.scanRecentPostTxids = this.scanRecentPostTxids.bind(this)
    this.scanPostsByAddrTxids = this.scanPostsByAddrTxids.bind(this)
    this.loadPostsByTxids = this.loadPostsByTxids.bind(this)
    this.countTopLevelPosts = this.countTopLevelPosts.bind(this)
    this.countTopLevelPostsByAddr = this.countTopLevelPostsByAddr.bind(this)
    this.loadReplyTxids = this.loadReplyTxids.bind(this)
    this.buildReplyCountMap = this.buildReplyCountMap.bind(this)
    this.txidFromPostHeight = this.txidFromPostHeight.bind(this)
    this.getPostOrNull = this.getPostOrNull.bind(this)
    this.topLevelPostTxids = this.topLevelPostTxids.bind(this)
  }

  static padHeight (height) {
    return String(height).padStart(HEIGHT_PAD, '0')
  }

  static postHeightKey (blockHeight, txid) {
    return `${PostQuery.padHeight(blockHeight)}:${txid}`
  }

  txidFromPostHeight (key, value) {
    if (value && typeof value.txid === 'string') return value.txid
    const parts = String(key).split(':')
    return parts[parts.length - 1]
  }

  async loadReplyTxids () {
    const replyTxids = new Set()

    for await (const [childTxid] of this.postParentsDb.iterator()) {
      replyTxids.add(childTxid)
    }

    return replyTxids
  }

  async buildReplyCountMap () {
    const counts = new Map()

    for await (const [, child] of this.postChildrenDb.iterator()) {
      const parentTxid = child?.parentTxid
      if (!parentTxid) continue
      counts.set(parentTxid, (counts.get(parentTxid) || 0) + 1)
    }

    return counts
  }

  // Fetch a post by txid, returning null when the post is not found.
  async getPostOrNull (txid) {
    try {
      return await this.postsDb.get(txid)
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') return null
      throw err
    }
  }

  // Iterate the txids of top-level posts (replies excluded) in postHeights
  // key order. Pass { reverse: true } for newest-first iteration.
  async * topLevelPostTxids ({ reverse = false } = {}) {
    const replyTxids = await this.loadReplyTxids()

    for await (const [key, value] of this.postHeightsDb.iterator({ reverse })) {
      const txid = this.txidFromPostHeight(key, value)
      if (replyTxids.has(txid)) continue
      yield txid
    }
  }

  async scanRecentPostTxids ({ limit, offset }) {
    const txids = []
    let skipped = 0

    for await (const txid of this.topLevelPostTxids({ reverse: true })) {
      if (skipped < offset) {
        skipped++
        continue
      }

      txids.push(txid)
      if (txids.length >= limit) break
    }

    return txids
  }

  async scanPostsByAddrTxids (addr, { limit, offset }) {
    const txids = []
    let skipped = 0

    for await (const txid of this.topLevelPostTxids({ reverse: true })) {
      const post = await this.getPostOrNull(txid)
      if (!post || post.addr !== addr) continue

      if (skipped < offset) {
        skipped++
        continue
      }

      txids.push(txid)
      if (txids.length >= limit) break
    }

    return txids
  }

  async loadPostsByTxids (txids) {
    const posts = []

    for (const txid of txids) {
      const post = await this.getPostOrNull(txid)
      if (!post) continue
      posts.push({
        txid,
        addr: post.addr,
        text: post.text,
        seen: post.seen,
        blockHeight: post.blockHeight ?? 0
      })
    }

    return posts
  }

  async countTopLevelPosts () {
    let count = 0
    const iterator = this.topLevelPostTxids()

    for (;;) {
      const { done } = await iterator.next()
      if (done) break
      count++
    }

    return count
  }

  async countTopLevelPostsByAddr (addr) {
    let count = 0

    for await (const txid of this.topLevelPostTxids()) {
      const post = await this.getPostOrNull(txid)
      if (post && post.addr === addr) count++
    }

    return count
  }
}

export default PostQuery
