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

  async scanRecentPostTxids ({ limit, offset }) {
    const replyTxids = await this.loadReplyTxids()
    const txids = []
    let skipped = 0

    for await (const [key, value] of this.postHeightsDb.iterator({ reverse: true })) {
      const txid = this.txidFromPostHeight(key, value)
      if (replyTxids.has(txid)) continue

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
    const replyTxids = await this.loadReplyTxids()
    const txids = []
    let skipped = 0

    for await (const [key, value] of this.postHeightsDb.iterator({ reverse: true })) {
      const txid = this.txidFromPostHeight(key, value)
      if (replyTxids.has(txid)) continue

      let post
      try {
        post = await this.postsDb.get(txid)
      } catch (err) {
        if (err.notFound || err.code === 'LEVEL_NOT_FOUND') continue
        throw err
      }

      if (post.addr !== addr) continue

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
      try {
        const post = await this.postsDb.get(txid)
        posts.push({
          txid,
          addr: post.addr,
          text: post.text,
          seen: post.seen,
          blockHeight: post.blockHeight ?? 0
        })
      } catch (err) {
        if (err.notFound || err.code === 'LEVEL_NOT_FOUND') continue
        throw err
      }
    }

    return posts
  }

  async countTopLevelPosts () {
    const replyTxids = await this.loadReplyTxids()
    let count = 0

    for await (const [key, value] of this.postHeightsDb.iterator()) {
      const txid = this.txidFromPostHeight(key, value)
      if (replyTxids.has(txid)) continue
      count++
    }

    return count
  }

  async countTopLevelPostsByAddr (addr) {
    const replyTxids = await this.loadReplyTxids()
    let count = 0

    for await (const [key, value] of this.postHeightsDb.iterator()) {
      const txid = this.txidFromPostHeight(key, value)
      if (replyTxids.has(txid)) continue

      try {
        const post = await this.postsDb.get(txid)
        if (post.addr === addr) count++
      } catch (err) {
        if (err.notFound || err.code === 'LEVEL_NOT_FOUND') continue
        throw err
      }
    }

    return count
  }
}

export default PostQuery
