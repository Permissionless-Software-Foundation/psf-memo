/*
  Adapter for efficient post queries using secondary indexes.

  - postHeights:    global top-level post ordering by block height
  - addrPostHeights: posts by address ordered by block height
  - postLikes:      likes grouped by liked post txid
*/

import { loadReplyTxids } from './lib/load-reply-txids.js'

const HEIGHT_PAD = 12

class PostQuery {
  constructor (localConfig = {}) {
    const { postsDb, postHeightsDb, addrPostHeightsDb, postParentsDb, postChildrenDb, likesDb, postLikesDb } = localConfig
    if (!postsDb) {
      throw new Error('postsDb required when instantiating PostQuery adapter.')
    }
    if (!postHeightsDb) {
      throw new Error('postHeightsDb required when instantiating PostQuery adapter.')
    }
    if (!addrPostHeightsDb) {
      throw new Error('addrPostHeightsDb required when instantiating PostQuery adapter.')
    }
    if (!postParentsDb) {
      throw new Error('postParentsDb required when instantiating PostQuery adapter.')
    }
    if (!postChildrenDb) {
      throw new Error('postChildrenDb required when instantiating PostQuery adapter.')
    }
    if (!likesDb) {
      throw new Error('likesDb required when instantiating PostQuery adapter.')
    }
    if (!postLikesDb) {
      throw new Error('postLikesDb required when instantiating PostQuery adapter.')
    }
    this.postsDb = postsDb
    this.postHeightsDb = postHeightsDb
    this.addrPostHeightsDb = addrPostHeightsDb
    this.postParentsDb = postParentsDb
    this.postChildrenDb = postChildrenDb
    this.likesDb = likesDb
    this.postLikesDb = postLikesDb

    this.scanRecentPostTxids = this.scanRecentPostTxids.bind(this)
    this.scanPostsByAddrTxids = this.scanPostsByAddrTxids.bind(this)
    this.loadPostsByTxids = this.loadPostsByTxids.bind(this)
    this.countTopLevelPosts = this.countTopLevelPosts.bind(this)
    this.countTopLevelPostsByAddr = this.countTopLevelPostsByAddr.bind(this)
    this.countRepliesForTxids = this.countRepliesForTxids.bind(this)
    this.countLikesForTxids = this.countLikesForTxids.bind(this)
    this.buildLikeCountMap = this.buildLikeCountMap.bind(this)
    this.txidFromPostHeight = this.txidFromPostHeight.bind(this)
    this.txidFromAddrPostHeight = this.txidFromAddrPostHeight.bind(this)
    this.getPostOrNull = this.getPostOrNull.bind(this)
    this.topLevelPostTxids = this.topLevelPostTxids.bind(this)
    this.loadReplyTxids = this.loadReplyTxids.bind(this)
    this.isReply = this.isReply.bind(this)
  }

  static padHeight (height) {
    return String(height).padStart(HEIGHT_PAD, '0')
  }

  static postHeightKey (blockHeight, txid) {
    return `${PostQuery.padHeight(blockHeight)}:${txid}`
  }

  static addrPostHeightKey (addr, blockHeight, txid) {
    return `${addr}:${PostQuery.padHeight(blockHeight)}:${txid}`
  }

  static postLikeKey (postTxid, likeTxid) {
    return `${postTxid}:${likeTxid}`
  }

  txidFromPostHeight (key, value) {
    if (value && typeof value.txid === 'string') return value.txid
    return this.txidFromKeyParts(key)
  }

  txidFromAddrPostHeight (key, value) {
    return this.txidFromPostHeight(key, value)
  }

  // Fall back to the txid embedded as the final segment of a keyed index entry.
  txidFromKeyParts (key) {
    const parts = String(key).split(':')
    return parts[parts.length - 1]
  }

  async loadReplyTxids () {
    return loadReplyTxids(this.postParentsDb)
  }

  async isReply (txid) {
    try {
      await this.postParentsDb.get(txid)
      return true
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') return false
      throw err
    }
  }

  // Count replies for each txid by prefix-scanning postChildren.
  async countRepliesForTxids (txids) {
    const counts = new Map()
    const end = ':\uffff'

    for (const txid of txids) {
      const prefix = `${txid}:`
      let count = 0
      for await (const [, child] of this.postChildrenDb.iterator({ gte: prefix, lte: `${txid}${end}` })) {
        if (child?.parentTxid === txid) count++
      }
      counts.set(txid, count)
    }

    return counts
  }

  // Build a global reply-count map by scanning all postChildren entries.
  async buildReplyCountMap () {
    const counts = new Map()

    for await (const [, child] of this.postChildrenDb.iterator()) {
      const parentTxid = child?.parentTxid
      if (!parentTxid) continue
      counts.set(parentTxid, (counts.get(parentTxid) || 0) + 1)
    }

    return counts
  }

  // Count likes for each txid by prefix-scanning postLikes.
  async countLikesForTxids (txids) {
    const counts = new Map()
    const end = ':\uffff'

    for (const txid of txids) {
      const prefix = `${txid}:`
      let count = 0
      for await (const [key, value] of this.postLikesDb.iterator({ gte: prefix, lte: `${txid}${end}` })) {
        const likeTxid = this.likeTxidFromPostLike(key, value)
        if (likeTxid) count++
      }
      counts.set(txid, count)
    }

    return counts
  }

  likeTxidFromPostLike (key, value) {
    if (value && typeof value.likeTxid === 'string') return value.likeTxid
    if (value && typeof value.txid === 'string') return value.txid
    return this.txidFromKeyParts(key)
  }

  // Build a global like-count map from the postLikes secondary index,
  // ignoring likes whose target post no longer exists.
  async buildLikeCountMap () {
    const counts = new Map()

    for await (const [key, value] of this.postLikesDb.iterator()) {
      const postTxid = this.postTxidFromPostLike(key, value)
      if (!postTxid) continue
      const post = await this.getPostOrNull(postTxid)
      if (!post) continue
      counts.set(postTxid, (counts.get(postTxid) || 0) + 1)
    }

    return counts
  }

  postTxidFromPostLike (key, value) {
    if (value && typeof value.postTxid === 'string') return value.postTxid
    const parts = String(key).split(':')
    return parts[0]
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

  // Iterate posts for a single address using the addrPostHeights index,
  // newest first, skipping replies (which have their own listing path).
  // Returns both the page txids and the total top-level count for the address
  // so the caller can compute pagination with a single index scan.
  async scanPostsByAddrTxidsAndCount (addr, { limit, offset }) {
    const txids = []
    let skipped = 0
    let total = 0
    const start = `${addr}:`
    const end = `${addr}:\uffff`

    for await (const [key, value] of this.addrPostHeightsDb.iterator({
      gte: start,
      lte: end,
      reverse: true
    })) {
      const txid = this.txidFromAddrPostHeight(key, value)
      if (await this.isReply(txid)) continue

      total++

      if (skipped < offset) {
        skipped++
        continue
      }

      if (txids.length < limit) {
        txids.push(txid)
      }
    }

    return { txids, total }
  }

  // Backwards-compatible variant that returns only txids.
  async scanPostsByAddrTxids (addr, { limit, offset }) {
    const { txids } = await this.scanPostsByAddrTxidsAndCount(addr, { limit, offset })
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

  // Count top-level posts for an address using the addrPostHeights index.
  async countTopLevelPostsByAddr (addr) {
    const replyTxids = await this.loadReplyTxids()
    let count = 0
    const start = `${addr}:`
    const end = `${addr}:\uffff`

    for await (const [key, value] of this.addrPostHeightsDb.iterator({
      gte: start,
      lte: end
    })) {
      const txid = this.txidFromAddrPostHeight(key, value)
      if (!replyTxids.has(txid)) count++
    }

    return count
  }
}

export default PostQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T14:30:59.518Z","module_hash":"48f80ca7bfd456c9cf4c373e5ed22db42826d44df7a720babbd4e6b8e80a8e76","functions":[{"id":"func/PostQuery.constructor","name":"PostQuery.constructor","line":14,"end_line":59,"hash":"d7104ee46a40c256bc93c795c04a71f9ff212d723480cbc75ec6d497a0995e84"},{"id":"func/PostQuery.padHeight","name":"PostQuery.padHeight","line":61,"end_line":63,"hash":"be6c442a4d3d86ab3b60314756b7f7c0592479c21cb3b2e1273dcf139a84fb00"},{"id":"func/PostQuery.postHeightKey","name":"PostQuery.postHeightKey","line":65,"end_line":67,"hash":"2d4dff9464aa4c1e805da5de2ba314fbd856530c046705237ea848d5feff8c7c"},{"id":"func/PostQuery.addrPostHeightKey","name":"PostQuery.addrPostHeightKey","line":69,"end_line":71,"hash":"48579f08593cee36cc2f107c2526ac9def687b354cc5e54089defa3fd37117eb"},{"id":"func/PostQuery.postLikeKey","name":"PostQuery.postLikeKey","line":73,"end_line":75,"hash":"5d16caac2cf88932702b28f9d95927183f8904948eb8c16c7e8c672cd3a0780c"},{"id":"func/PostQuery.txidFromPostHeight","name":"PostQuery.txidFromPostHeight","line":77,"end_line":80,"hash":"0fd135c51089dcc9bd2f166bb9f28faaa6a03d7eb84cf03cb9b36e97cdb3139c"},{"id":"func/PostQuery.txidFromAddrPostHeight","name":"PostQuery.txidFromAddrPostHeight","line":82,"end_line":84,"hash":"314d5432292a78b273e3165343d3e09276600cbaf239f76bcd1b36fe5fcf5e10"},{"id":"func/PostQuery.txidFromKeyParts","name":"PostQuery.txidFromKeyParts","line":87,"end_line":90,"hash":"59fb8173599070095d87e5d6f56eeb999f79e75e4d3f3e435515e9db8ac71868"},{"id":"func/PostQuery.loadReplyTxids","name":"PostQuery.loadReplyTxids","line":92,"end_line":94,"hash":"74621495a3affc6ef8688b9d6a814a91c99b22c86c348d261c952aad25df1661"},{"id":"func/PostQuery.isReply","name":"PostQuery.isReply","line":96,"end_line":104,"hash":"be2e3729bd5f05cbfbab3630678eb5c389bd04c616d53b1e0c48c852f4cb25b1"},{"id":"func/PostQuery.countRepliesForTxids","name":"PostQuery.countRepliesForTxids","line":107,"end_line":121,"hash":"16268cd2a0f8db020a099b704c3d5a3cea5daf6a0936dd1f8d85c38809f006aa"},{"id":"func/PostQuery.buildReplyCountMap","name":"PostQuery.buildReplyCountMap","line":124,"end_line":134,"hash":"1d9762d70dca3439c0bb382b09882faee215f1d53f0656aff8bcbde429ec63b4"},{"id":"func/PostQuery.countLikesForTxids","name":"PostQuery.countLikesForTxids","line":137,"end_line":152,"hash":"54e6e3e6467e72d9dd033c9861b3b9ef5e426a76aed7a13e8ac1a0f0389468a3"},{"id":"func/PostQuery.likeTxidFromPostLike","name":"PostQuery.likeTxidFromPostLike","line":154,"end_line":158,"hash":"7e07a9c278a9abae8f646b4f1950f88760f2d5c6445600a42fa42f36d029a45a"},{"id":"func/PostQuery.buildLikeCountMap","name":"PostQuery.buildLikeCountMap","line":162,"end_line":174,"hash":"a82ca3b46d68426edbe25f176c4a6019ea5fb6abea4c5d5e84aff3b381f63c61"},{"id":"func/PostQuery.postTxidFromPostLike","name":"PostQuery.postTxidFromPostLike","line":176,"end_line":180,"hash":"da7f8d0c63dbc074fb25da1a31dde5075c2c3469b84a5c700bd4a2961879d8e9"},{"id":"func/PostQuery.getPostOrNull","name":"PostQuery.getPostOrNull","line":183,"end_line":190,"hash":"792ce2a8d5f19ed3d159c7af7e95c310e5b0c05cbef4de5be8f8f78403680b91"},{"id":"func/PostQuery.topLevelPostTxids","name":"PostQuery.topLevelPostTxids","line":194,"end_line":202,"hash":"0457d8b43b692d7bbfde283e63663d74542778d3893b45202fcb6ae0f1fc6776"},{"id":"func/PostQuery.scanRecentPostTxids","name":"PostQuery.scanRecentPostTxids","line":204,"end_line":219,"hash":"bed887c0eeec051e082657cac518bbd2f60df84bbb86c9d8aa76015194e7a73a"},{"id":"func/PostQuery.scanPostsByAddrTxidsAndCount","name":"PostQuery.scanPostsByAddrTxidsAndCount","line":225,"end_line":253,"hash":"a872d7a1f71ce1ba6a1dee46a820989cbbb7287dfc433051be1e15890dbc010b"},{"id":"func/PostQuery.scanPostsByAddrTxids","name":"PostQuery.scanPostsByAddrTxids","line":256,"end_line":259,"hash":"3498f2b9615e79b9472a5c7be26520c78db7c1661071c90a882f981d8acca477"},{"id":"func/PostQuery.loadPostsByTxids","name":"PostQuery.loadPostsByTxids","line":261,"end_line":277,"hash":"86b05107f3ecc240b2e734217cedf29ef44c48474bf31c1c8f75f2e4b4f84bea"},{"id":"func/PostQuery.countTopLevelPosts","name":"PostQuery.countTopLevelPosts","line":279,"end_line":290,"hash":"a26a6fdd12201de71965545f4113e3598f325fa4d96076289d371e4157c667ff"},{"id":"func/PostQuery.countTopLevelPostsByAddr","name":"PostQuery.countTopLevelPostsByAddr","line":293,"end_line":308,"hash":"6e12c0b66758cd0103ff6abad1379b3883bea82f084d2382991b4643dfb63360"}]}
// mutate4javascript-manifest-end
