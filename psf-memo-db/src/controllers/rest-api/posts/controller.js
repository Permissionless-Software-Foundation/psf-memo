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
    this.getNotifications = this.getNotifications.bind(this)
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

  /**
   * @api {get} /posts/notifications/:addr List notifications for an address
   * @apiPermission public
   * @apiName GetNotifications
   * @apiGroup REST Posts
   *
   * @apiDescription Returns replies to the viewer's posts, likes on the viewer's posts, and new follows of the viewer, sorted by block height (newest first).
   *
   * @apiParam {String} addr Viewer cash address
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of notifications to skip after sorting
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/posts/notifications/bitcoincash:q...?limit=50&offset=0"
   *
   * @apiSuccess {Object[]} notifications Array of notification objects
   * @apiSuccess {String} notifications.type One of reply, like, follow
   * @apiSuccess {String} notifications.txid Action transaction id
   * @apiSuccess {String} notifications.addr Actor cash address
   * @apiSuccess {String} [notifications.postTxid] Liked/replied post txid
   * @apiSuccess {String} [notifications.text] Reply text
   * @apiSuccess {Number} notifications.blockHeight Block height when indexed
   * @apiSuccess {Object} pagination Pagination metadata
   */
  async getNotifications (ctx) {
    await this.listPostsForAddr(ctx, this.useCases.listNotifications)
  }

  async getPostThread (ctx) {
    const { txid } = ctx.params
    await this.runUseCase(ctx, () => this.useCases.getPostThread.execute({
      txid
    }))
  }
}

export default PostsRESTControllerLib

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T19:04:12.781Z","module_hash":"e9f06f6fdf475b85ec8ebd378f9c8784f38d0d05254d463f98b6df37f58c2886","functions":[{"id":"func/PostsRESTControllerLib.constructor","name":"PostsRESTControllerLib.constructor","line":8,"end_line":25,"hash":"ffe914078c8e659d1dc86fac2c236f5310aeddebffbf01c48d3c1907b2adb902"},{"id":"func/PostsRESTControllerLib.runUseCase","name":"PostsRESTControllerLib.runUseCase","line":31,"end_line":37,"hash":"116112d778cc231815bd7ac296e8e3f90fbc209e1c91892e9bec596ed0821863"},{"id":"func/PostsRESTControllerLib.listPostsForAddr","name":"PostsRESTControllerLib.listPostsForAddr","line":44,"end_line":48,"hash":"23c4480bc080ea2da6ca30cc36b78cc3b51357bf2cdb5927c1511c430b89e0c9"},{"id":"func/PostsRESTControllerLib.handleError","name":"PostsRESTControllerLib.handleError","line":50,"end_line":57,"hash":"57720513b9edacb2e38e6089ae5881c73cdc767c941977d8d979d2bf37513965"},{"id":"func/PostsRESTControllerLib.getRecentPosts","name":"PostsRESTControllerLib.getRecentPosts","line":86,"end_line":89,"hash":"cb96f5a491bc3f52e71ed5ff1bbc5ce1654bb38ec86dca0f00b407778645c322"},{"id":"func/PostsRESTControllerLib.getPostsByAddr","name":"PostsRESTControllerLib.getPostsByAddr","line":115,"end_line":117,"hash":"41283c2ead5c5015962daa1c094ed52db593750eb01094ce4dbe74c6ea979b70"},{"id":"func/PostsRESTControllerLib.getFollowingFeed","name":"PostsRESTControllerLib.getFollowingFeed","line":144,"end_line":146,"hash":"bba784a60d63043e039b341a6affb3029c1b1259f26479f078be93fef4fd6d3c"},{"id":"func/PostsRESTControllerLib.getPostThread","name":"PostsRESTControllerLib.getPostThread","line":148,"end_line":153,"hash":"d4a7873e7e024b861c7e1aebc98b4ebb563eab80d21f0027c94bda46fc9a20fb"}]}
// mutate4javascript-manifest-end
