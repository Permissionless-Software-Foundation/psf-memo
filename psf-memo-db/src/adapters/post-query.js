/*
  Adapter for scanning posts with stored block height.
  Excludes reply posts (txids present in postParentsDb).
*/

class PostQuery {
  constructor (localConfig = {}) {
    const { postsDb, postParentsDb, postChildrenDb } = localConfig
    if (!postsDb) {
      throw new Error('postsDb required when instantiating PostQuery adapter.')
    }
    if (!postParentsDb) {
      throw new Error('postParentsDb required when instantiating PostQuery adapter.')
    }
    if (!postChildrenDb) {
      throw new Error('postChildrenDb required when instantiating PostQuery adapter.')
    }
    this.postsDb = postsDb
    this.postParentsDb = postParentsDb
    this.postChildrenDb = postChildrenDb
    this.scanPostsWithBlockHeight = this.scanPostsWithBlockHeight.bind(this)
    this.scanPostsByAddr = this.scanPostsByAddr.bind(this)
    this.loadReplyTxids = this.loadReplyTxids.bind(this)
    this.buildReplyCountMap = this.buildReplyCountMap.bind(this)
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
      const parentTxid = child.parentTxid
      if (!parentTxid) continue
      counts.set(parentTxid, (counts.get(parentTxid) || 0) + 1)
    }

    return counts
  }

  async scanPostsWithBlockHeight () {
    const [replyTxids, replyCounts] = await Promise.all([
      this.loadReplyTxids(),
      this.buildReplyCountMap()
    ])
    const posts = []

    for await (const [txid, post] of this.postsDb.iterator()) {
      if (replyTxids.has(txid)) continue
      posts.push({
        txid,
        addr: post.addr,
        text: post.text,
        seen: post.seen,
        blockHeight: post.blockHeight ?? 0,
        replyCount: replyCounts.get(txid) ?? 0
      })
    }

    return posts
  }

  async scanPostsByAddr (addr) {
    const [replyTxids, replyCounts] = await Promise.all([
      this.loadReplyTxids(),
      this.buildReplyCountMap()
    ])
    const posts = []

    for await (const [txid, post] of this.postsDb.iterator()) {
      if (post.addr !== addr) continue
      if (replyTxids.has(txid)) continue
      posts.push({
        txid,
        addr: post.addr,
        text: post.text,
        seen: post.seen,
        blockHeight: post.blockHeight ?? 0,
        replyCount: replyCounts.get(txid) ?? 0
      })
    }

    return posts
  }

  async buildReplyCountMap () {
  const counts = new Map()
  let total = 0

  for await (const [childTxid, child] of this.postChildrenDb.iterator()) {
    total++

    console.log('Indexed reply:', {
      childTxid,
      child,
      parentTxid: child?.parentTxid
    })

    const parentTxid = child?.parentTxid
    if (!parentTxid) continue

    counts.set(parentTxid, (counts.get(parentTxid) || 0) + 1)
  }

  console.log(`Total postChildrenDb records: ${total}`)

  return counts
}
}

export default PostQuery
