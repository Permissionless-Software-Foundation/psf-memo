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

    return {
      post: rootPost
    }
  }

  async buildThreadNode (txid, visited = new Set()) {
    if (visited.has(txid)) return null

    visited.add(txid)

    let post

    try {
      post = await this.adapters.postQuery.postsDb.get(txid)
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
        return null
      }

      throw err
    }

    const childTxids = []

    for await (
      const [, child]
      of this.adapters.postQuery.postChildrenDb.iterator()
    ) {
      if (child?.parentTxid !== txid) continue
      if (!child?.childTxid) continue

      childTxids.push(child.childTxid)
    }

    const replies = []

    for (const childTxid of childTxids) {
      const reply = await this.buildThreadNode(childTxid, visited)

      if (reply) {
        replies.push(reply)
      }
    }

    replies.sort((a, b) => {
      const blockDifference =
        (a.blockHeight ?? 0) - (b.blockHeight ?? 0)

      if (blockDifference !== 0) {
        return blockDifference
      }

      return (a.seen ?? 0) - (b.seen ?? 0)
    })

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