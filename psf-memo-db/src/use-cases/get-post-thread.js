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
    this.collectThreadTxids = this.collectThreadTxids.bind(this)
    this.attachLikeCounts = this.attachLikeCounts.bind(this)
    this.compareReplies = this.compareReplies.bind(this)
  }

  async execute ({ txid } = {}) {
    if (!txid || typeof txid !== 'string') {
      const err = new Error('A transaction ID is required.')
      err.status = 400
      throw err
    }

    const rootPost = await this.buildThreadNode(txid)

    if (!rootPost) {
      const err = new Error('Post not found.')
      err.status = 404
      throw err
    }

    // Build the thread first, then count likes for only its txids. This keeps
    // the endpoint's work proportional to the thread, not the whole database.
    const threadTxids = []
    this.collectThreadTxids(rootPost, threadTxids)
    const likeCounts = await this.adapters.postQuery.countLikesForTxids(threadTxids)

    this.attachLikeCounts(rootPost, likeCounts)

    return {
      post: rootPost
    }
  }

  collectThreadTxids (node, txids) {
    txids.push(node.txid)
    if (Array.isArray(node.replies)) {
      for (const reply of node.replies) {
        this.collectThreadTxids(reply, txids)
      }
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

  compareReplies (a, b) {
    const blockDifference =
      (a.blockHeight ?? 0) - (b.blockHeight ?? 0)

    if (blockDifference !== 0) {
      return blockDifference
    }

    return (a.seen ?? 0) - (b.seen ?? 0)
  }

  // The postChildren representation and its prefix-scan bounds live in the
  // PostQuery adapter, so this use case depends only on the adapter interface.
  async buildThreadNode (txid, visited = new Set()) {
    if (visited.has(txid)) return null

    visited.add(txid)

    const post = await this.adapters.postQuery.getPostOrNull(txid)
    if (!post) return null

    const childTxids = await this.adapters.postQuery.listChildTxids(txid)

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
// {"version":1,"tested_at":"2026-09-15T19:59:55.632Z","module_hash":"bd62a2406b8d4458ad4aee839d4eae4dbc5d70e35bc1439974b33aa5e7785a3c","functions":[{"id":"func/GetPostThread.constructor","name":"GetPostThread.constructor","line":6,"end_line":20,"hash":"0ef50404634f2ede06763d4c200988ab6c1d2d260b9a649e226d9b18263d6af1"},{"id":"func/GetPostThread.execute","name":"GetPostThread.execute","line":22,"end_line":48,"hash":"50af0b17eca5ab1b5a17cb9a0dbdd44e11730a0c38089eff40bd50363274cd49"},{"id":"func/GetPostThread.collectThreadTxids","name":"GetPostThread.collectThreadTxids","line":50,"end_line":57,"hash":"a69b4b97ea19185e0e5fffb6e1cac8b6dee8721bd7a3702edda6845b400ab2a0"},{"id":"func/GetPostThread.attachLikeCounts","name":"GetPostThread.attachLikeCounts","line":59,"end_line":66,"hash":"f7ba4717fd0cd0ba0c6cd3f7571c071a00bfc666076023a323d4848d6d4ba720"},{"id":"func/GetPostThread.compareReplies","name":"GetPostThread.compareReplies","line":68,"end_line":77,"hash":"60393ba5137feda1df76d54f2b5c4da0728cc0dd556d72748ff3ba69328ba9a9"},{"id":"func/GetPostThread.buildThreadNode","name":"GetPostThread.buildThreadNode","line":81,"end_line":112,"hash":"47bb08b598c94fd0d78a238785c3b47f724fd892f57f79c5c43a2b4ef7f52454"}]}
// mutate4javascript-manifest-end
