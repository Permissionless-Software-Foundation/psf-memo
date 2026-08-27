/*
  Retrieve a Memo post and its nested replies.
*/

class GetPostThread {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error(
        'Adapters required when instantiating GetPostThread.'
      )
    }

    this.execute = this.execute.bind(this)
    this.buildThreadNode = this.buildThreadNode.bind(this)
    this.attachLikeCounts = this.attachLikeCounts.bind(this)
    this.fetchPostOrNull = this.fetchPostOrNull.bind(this)
    this.loadChildTxids = this.loadChildTxids.bind(this)
    this.compareReplies = this.compareReplies.bind(this)
  }

  async execute ({ txid } = {}) {
    if (!txid || typeof txid !== 'string') {
      const err = new Error('A transaction ID is required.')
      err.status = 400
      throw err
    }

    const [likeCounts, rootPost] = await Promise.all([
      this.adapters.postQuery.buildLikeCountMap(),
      this.buildThreadNode(txid)
    ])

    if (!rootPost) {
      const err = new Error('Post not found.')
      err.status = 404
      throw err
    }

    this.attachLikeCounts(rootPost, likeCounts)

    return {
      post: rootPost
    }
  }

  attachLikeCounts (node, likeCounts) {
    node.likeCount = likeCounts.get(node.txid) ?? 0
    if (Array.isArray(node.replies)) {
      for (const reply of node.replies) {
        this.attachLikeCounts(reply, likeCounts)
      }
    }
  }

  async fetchPostOrNull (txid) {
    try {
      return await this.adapters.postQuery.postsDb.get(txid)
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
        return null
      }

      throw err
    }
  }

  async loadChildTxids (txid) {
    const childTxids = []

    for await (
      const [, child]
      of this.adapters.postQuery.postChildrenDb.iterator()
    ) {
      if (child?.parentTxid !== txid) continue
      if (!child?.childTxid) continue

      childTxids.push(child.childTxid)
    }

    return childTxids
  }

  compareReplies (a, b) {
    const blockDifference =
      (a.blockHeight ?? 0) - (b.blockHeight ?? 0)

    if (blockDifference !== 0) {
      return blockDifference
    }

    return (a.seen ?? 0) - (b.seen ?? 0)
  }

  async buildThreadNode (txid, visited = new Set()) {
    if (visited.has(txid)) return null

    visited.add(txid)

    const post = await this.fetchPostOrNull(txid)
    if (!post) return null

    const childTxids = await this.loadChildTxids(txid)

    const replies = []

    for (const childTxid of childTxids) {
      const reply = await this.buildThreadNode(childTxid, visited)

      if (reply) {
        replies.push(reply)
      }
    }

    replies.sort(this.compareReplies)

    return {
      txid,
      addr: post.addr,
      text: post.text,
      seen: post.seen,
      blockHeight: post.blockHeight ?? 0,
      replyCount: replies.length,
      replies
    }
  }
}

export default GetPostThread
