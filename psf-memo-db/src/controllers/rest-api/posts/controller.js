/*
  REST API controller for /posts routes.
*/

import { handleControllerError } from '../lib/handle-error.js'

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
    handleControllerError(ctx, err, 'posts')
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
   * @apiQuery {String} [viewer] Viewer cash address; posts from addresses the viewer mutes are excluded
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
    const { limit, offset, viewer } = ctx.query
    const args = { limit, offset }
    if (viewer) args.viewerAddr = viewer
    await this.runUseCase(ctx, () => this.useCases.listRecentPosts.execute(args))
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
// {"version":1,"tested_at":"2026-09-02T20:14:56.373Z","module_hash":"5d43fd45fdfeeef08e0c69af9f1e4e06128dd1858818c0cd38eb718619083f58","functions":[{"id":"func/PostsRESTControllerLib.constructor","name":"PostsRESTControllerLib.constructor","line":8,"end_line":26,"hash":"8d7ff84be53037a92bd5834179c065a5edf05facd70778c2ed35aa871f1f9e40"},{"id":"func/PostsRESTControllerLib.runUseCase","name":"PostsRESTControllerLib.runUseCase","line":32,"end_line":38,"hash":"116112d778cc231815bd7ac296e8e3f90fbc209e1c91892e9bec596ed0821863"},{"id":"func/PostsRESTControllerLib.listPostsForAddr","name":"PostsRESTControllerLib.listPostsForAddr","line":45,"end_line":49,"hash":"23c4480bc080ea2da6ca30cc36b78cc3b51357bf2cdb5927c1511c430b89e0c9"},{"id":"func/PostsRESTControllerLib.handleError","name":"PostsRESTControllerLib.handleError","line":51,"end_line":58,"hash":"57720513b9edacb2e38e6089ae5881c73cdc767c941977d8d979d2bf37513965"},{"id":"func/PostsRESTControllerLib.getRecentPosts","name":"PostsRESTControllerLib.getRecentPosts","line":87,"end_line":90,"hash":"cb96f5a491bc3f52e71ed5ff1bbc5ce1654bb38ec86dca0f00b407778645c322"},{"id":"func/PostsRESTControllerLib.getPostsByAddr","name":"PostsRESTControllerLib.getPostsByAddr","line":116,"end_line":118,"hash":"41283c2ead5c5015962daa1c094ed52db593750eb01094ce4dbe74c6ea979b70"},{"id":"func/PostsRESTControllerLib.getFollowingFeed","name":"PostsRESTControllerLib.getFollowingFeed","line":145,"end_line":147,"hash":"bba784a60d63043e039b341a6affb3029c1b1259f26479f078be93fef4fd6d3c"},{"id":"func/PostsRESTControllerLib.getNotifications","name":"PostsRESTControllerLib.getNotifications","line":173,"end_line":175,"hash":"3385ba48da47021b6f8770f643d4d37c5092f79f674736f3ee04adaf3c951092"},{"id":"func/PostsRESTControllerLib.getPostThread","name":"PostsRESTControllerLib.getPostThread","line":177,"end_line":182,"hash":"d4a7873e7e024b861c7e1aebc98b4ebb563eab80d21f0027c94bda46fc9a20fb"}]}
// mutate4javascript-manifest-end
