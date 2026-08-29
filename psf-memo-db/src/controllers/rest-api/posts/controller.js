/*
  REST API controller for /posts routes.
*/

import wlogger from '../../../adapters/wlogger.js'

class PostsRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Posts REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required for Posts REST Controller.')
    }

    this.getRecentPosts = this.getRecentPosts.bind(this)
    this.getPostsByAddr = this.getPostsByAddr.bind(this)
    this.getFollowingFeed = this.getFollowingFeed.bind(this)
    this.getPostThread = this.getPostThread.bind(this)
    this.runUseCase = this.runUseCase.bind(this)
    this.listPostsForAddr = this.listPostsForAddr.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /*
    Run a use-case delegate against a Koa context, storing the resolved value
    on ctx.body and routing any rejection through the shared handleError.
  */
  async runUseCase (ctx, fn) {
    try {
      ctx.body = await fn()
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /*
    Shared handler body for the addr-scoped post listings (/by/:addr and
    /following/:addr): read the address route param plus pagination query
    params and delegate to the given use case.
  */
  async listPostsForAddr (ctx, useCase) {
    const { addr } = ctx.params
    const { limit, offset } = ctx.query
    await this.runUseCase(ctx, () => useCase.execute({ addr, limit, offset }))
  }

  handleError (ctx, err) {
    if (err.status) {
      ctx.throw(err.status, err.message || err)
    } else {
      wlogger.error('Error in posts controller: ', err)
      ctx.throw(500, err.message || 'Internal server error')
    }
  }

  /**
   * @api {get} /posts/recent List recent posts
   * @apiPermission public
   * @apiName GetRecentPosts
   * @apiGroup REST Posts
   *
   * @apiDescription Returns top-level posts only (replies excluded), sorted by block height (newest first), with seen timestamp as tie-breaker.
   *
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of posts to skip after sorting
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/posts/recent?limit=50&offset=0"
   *
   * @apiSuccess {Object[]} posts Array of post objects
   * @apiSuccess {String} posts.txid Post transaction id
   * @apiSuccess {String} posts.addr Author cash address
   * @apiSuccess {String} posts.text Post text
   * @apiSuccess {Number} posts.seen Unix epoch milliseconds
   * @apiSuccess {Number} posts.blockHeight Block height when indexed
   * @apiSuccess {Number} posts.replyCount Number of replies to this post
   * @apiSuccess {Object} pagination Pagination metadata
   * @apiSuccess {Number} pagination.limit Page size used
   * @apiSuccess {Number} pagination.offset Offset used
   * @apiSuccess {Number} pagination.total Total matching posts
   * @apiSuccess {Boolean} pagination.hasMore True if more pages exist
   */
  async getRecentPosts (ctx) {
    const { limit, offset } = ctx.query
    await this.runUseCase(ctx, () => this.useCases.listRecentPosts.execute({ limit, offset }))
  }

  /**
   * @api {get} /posts/by/:addr List posts by address
   * @apiPermission public
   * @apiName GetPostsByAddr
   * @apiGroup REST Posts
   *
   * @apiDescription Returns top-level posts for a single address (replies excluded), sorted by block height (newest first).
   *
   * @apiParam {String} addr Author cash address
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of posts to skip after sorting
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/posts/by/bitcoincash:q...?limit=50&offset=0"
   *
   * @apiSuccess {Object[]} posts Array of post objects
   * @apiSuccess {String} posts.txid Post transaction id
   * @apiSuccess {String} posts.addr Author cash address
   * @apiSuccess {String} posts.text Post text
   * @apiSuccess {Number} posts.seen Unix epoch milliseconds
   * @apiSuccess {Number} posts.blockHeight Block height when indexed
   * @apiSuccess {Number} posts.replyCount Number of replies to this post
   * @apiSuccess {Object} pagination Pagination metadata
   */
  async getPostsByAddr (ctx) {
    await this.listPostsForAddr(ctx, this.useCases.listPostsByAddr)
  }

  /**
   * @api {get} /posts/following/:addr List posts from followed profiles
   * @apiPermission public
   * @apiName GetFollowingFeed
   * @apiGroup REST Posts
   *
   * @apiDescription Returns top-level posts from profiles the viewer follows (replies and the viewer's own posts excluded), sorted by block height (newest first).
   *
   * @apiParam {String} addr Viewer cash address
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of posts to skip after sorting
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/posts/following/bitcoincash:q...?limit=50&offset=0"
   *
   * @apiSuccess {Object[]} posts Array of post objects
   * @apiSuccess {String} posts.txid Post transaction id
   * @apiSuccess {String} posts.addr Author cash address
   * @apiSuccess {String} posts.text Post text
   * @apiSuccess {Number} posts.seen Unix epoch milliseconds
   * @apiSuccess {Number} posts.blockHeight Block height when indexed
   * @apiSuccess {Number} posts.replyCount Number of replies to this post
   * @apiSuccess {Number} posts.likeCount Number of likes for this post
   * @apiSuccess {Object} pagination Pagination metadata
   */
  async getFollowingFeed (ctx) {
    await this.listPostsForAddr(ctx, this.useCases.listFollowingFeed)
  }

  async getPostThread (ctx) {
    const { txid } = ctx.params
    await this.runUseCase(ctx, () => this.useCases.getPostThread.execute({
      txid
    }))
  }
}

export default PostsRESTControllerLib
