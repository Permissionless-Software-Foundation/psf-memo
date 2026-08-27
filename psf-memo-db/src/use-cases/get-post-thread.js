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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T03:24:13.418Z","module_hash":"3270d9244ee4517c8d64770645d4b38e8d1937a4bb13beea79d0611960305aea","functions":[{"id":"func/GetPostThread.constructor","name":"GetPostThread.constructor","line":6,"end_line":21,"hash":"b23e82ab887fb68d199f23b4c6d94f6417556cbf7f7eeaeff7efdb5cce74f3f0"},{"id":"func/GetPostThread.execute","name":"GetPostThread.execute","line":23,"end_line":46,"hash":"968030072d4946cd4d00832fb334dc25d1286b24c1bc71252d30de6e3faebd38"},{"id":"func/GetPostThread.attachLikeCounts","name":"GetPostThread.attachLikeCounts","line":48,"end_line":55,"hash":"f7ba4717fd0cd0ba0c6cd3f7571c071a00bfc666076023a323d4848d6d4ba720"},{"id":"func/GetPostThread.fetchPostOrNull","name":"GetPostThread.fetchPostOrNull","line":57,"end_line":67,"hash":"b853fa9e3b121a3a0fae8c6828865039add3ec5950ae4cfa2db252f9db09446c"},{"id":"func/GetPostThread.loadChildTxids","name":"GetPostThread.loadChildTxids","line":69,"end_line":83,"hash":"9c1a7feff0dd92624b77127de70b2b13eea13854cf2e807b9c2c635b072a932f"},{"id":"func/GetPostThread.compareReplies","name":"GetPostThread.compareReplies","line":85,"end_line":94,"hash":"60393ba5137feda1df76d54f2b5c4da0728cc0dd556d72748ff3ba69328ba9a9"},{"id":"func/GetPostThread.buildThreadNode","name":"GetPostThread.buildThreadNode","line":96,"end_line":127,"hash":"e5ca3213bad9d22d9a87a2cf24f55cc5ffc4a6acd2d0e6c026ade991b490f43f"}]}
// mutate4javascript-manifest-end
