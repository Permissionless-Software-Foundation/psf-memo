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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T18:11:36.339Z","module_hash":"9d849ae3741dcb65f12ea75f911bf873e36f5748183df777be6296c709c5e598","functions":[{"id":"func/PostQuery.constructor","name":"PostQuery.constructor","line":8,"end_line":37,"hash":"75efd21f33ee6a78e6c41e71b2b7dea75a7b66bb2f7e27569864d0c9a4843383"},{"id":"func/PostQuery.padHeight","name":"PostQuery.padHeight","line":39,"end_line":41,"hash":"be6c442a4d3d86ab3b60314756b7f7c0592479c21cb3b2e1273dcf139a84fb00"},{"id":"func/PostQuery.postHeightKey","name":"PostQuery.postHeightKey","line":43,"end_line":45,"hash":"2d4dff9464aa4c1e805da5de2ba314fbd856530c046705237ea848d5feff8c7c"},{"id":"func/PostQuery.txidFromPostHeight","name":"PostQuery.txidFromPostHeight","line":47,"end_line":51,"hash":"691bcf6f1ab70e0608e3f05da9b9f7d88cc8ac710cdcb14e6dc4a1c1c0546744"},{"id":"func/PostQuery.loadReplyTxids","name":"PostQuery.loadReplyTxids","line":53,"end_line":61,"hash":"a397af5257d234a2aa9c18b1de49aa3738bf31645e0efbb9ed71bd0940abdb18"},{"id":"func/PostQuery.buildReplyCountMap","name":"PostQuery.buildReplyCountMap","line":63,"end_line":73,"hash":"1d9762d70dca3439c0bb382b09882faee215f1d53f0656aff8bcbde429ec63b4"},{"id":"func/PostQuery.getPostOrNull","name":"PostQuery.getPostOrNull","line":76,"end_line":83,"hash":"792ce2a8d5f19ed3d159c7af7e95c310e5b0c05cbef4de5be8f8f78403680b91"},{"id":"func/PostQuery.topLevelPostTxids","name":"PostQuery.topLevelPostTxids","line":87,"end_line":95,"hash":"0457d8b43b692d7bbfde283e63663d74542778d3893b45202fcb6ae0f1fc6776"},{"id":"func/PostQuery.scanRecentPostTxids","name":"PostQuery.scanRecentPostTxids","line":97,"end_line":112,"hash":"bed887c0eeec051e082657cac518bbd2f60df84bbb86c9d8aa76015194e7a73a"},{"id":"func/PostQuery.scanPostsByAddrTxids","name":"PostQuery.scanPostsByAddrTxids","line":114,"end_line":132,"hash":"6485e255e529be0172debb67749fc2fc1757e5c41f6d03fd14f8d277aea4b91a"},{"id":"func/PostQuery.loadPostsByTxids","name":"PostQuery.loadPostsByTxids","line":134,"end_line":150,"hash":"86b05107f3ecc240b2e734217cedf29ef44c48474bf31c1c8f75f2e4b4f84bea"},{"id":"func/PostQuery.countTopLevelPosts","name":"PostQuery.countTopLevelPosts","line":152,"end_line":163,"hash":"a26a6fdd12201de71965545f4113e3598f325fa4d96076289d371e4157c667ff"},{"id":"func/PostQuery.countTopLevelPostsByAddr","name":"PostQuery.countTopLevelPostsByAddr","line":165,"end_line":174,"hash":"d5bcd0c7140f6c05cc3e66037ca96627ff262dd975a5553483bbd8f91bfdd7f5"}]}
// mutate4javascript-manifest-end
