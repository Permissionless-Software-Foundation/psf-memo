/*
  REST API controller for /topics routes.
*/

import { handleControllerError } from '../lib/handle-error.js'

class TopicsRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Topics REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required for Topics REST Controller.')
    }

    this.getTopics = this.getTopics.bind(this)
    this.getTopicPosts = this.getTopicPosts.bind(this)
    this.getTopicFollowState = this.getTopicFollowState.bind(this)
    this.getTopicFollowers = this.getTopicFollowers.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    handleControllerError(ctx, err, 'topics')
  }

  /**
   * @api {get} /topics List topics
   * @apiPermission public
   * @apiName GetTopics
   * @apiGroup REST Topics
   *
   * @apiDescription Returns all distinct Memo topics with their post counts.
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/topics"
   *
   * @apiSuccess {Object[]} topics Array of topic objects
   * @apiSuccess {String} topics.room Topic name
   * @apiSuccess {Number} topics.postCount Number of posts in the topic
   */
  async getTopics (ctx) {
    try {
      ctx.body = await this.useCases.listTopics.execute()
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /topics/:room/posts List posts for a topic
   * @apiPermission public
   * @apiName GetTopicPosts
   * @apiGroup REST Topics
   *
   * @apiDescription Returns posts for a single topic sorted by block height
   * (newest first).
   *
   * @apiParam {String} room Topic name
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of posts to skip after sorting
   * @apiQuery {String} [viewer] Viewer cash address; posts from addresses the viewer mutes are excluded
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/topics/bitcoin/posts?limit=50&offset=0"
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
  async getTopicPosts (ctx) {
    try {
      const { room } = ctx.params
      const { limit, offset, viewer } = ctx.query
      const args = { room, limit, offset }
      if (viewer) args.viewerAddr = viewer
      ctx.body = await this.useCases.listTopicPosts.execute(args)
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /topics/:room/follow/state Check topic follow state
   * @apiPermission public
   * @apiName GetTopicFollowState
   * @apiGroup REST Topics
   *
   * @apiDescription Returns whether an address follows a topic.
   *
   * @apiParam {String} room Topic name
   * @apiQuery {String} addr Cash address to check
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/topics/bitcoin/follow/state?addr=bitcoincash:q..."
   *
   * @apiSuccess {String} room Topic name
   * @apiSuccess {String} addr Checked cash address
   * @apiSuccess {Boolean} following True when an active topic follow exists
   */
  async getTopicFollowState (ctx) {
    try {
      const { room } = ctx.params
      const { addr } = ctx.query
      ctx.body = await this.useCases.topicFollowState.execute({ room, addr })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /topics/:room/followers List topic followers
   * @apiPermission public
   * @apiName GetTopicFollowers
   * @apiGroup REST Topics
   *
   * @apiDescription Returns the addresses that currently follow a topic.
   *
   * @apiParam {String} room Topic name
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/topics/bitcoin/followers"
   *
   * @apiSuccess {String} room Topic name
   * @apiSuccess {String[]} followers Array of follower cash addresses
   */
  async getTopicFollowers (ctx) {
    try {
      const { room } = ctx.params
      ctx.body = await this.useCases.listTopicFollowers.execute({ room })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default TopicsRESTControllerLib

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T19:53:31.127Z","module_hash":"4c3f3e9152899ed272cb583e558c4522c0f54c37a0ae728f3ec6bc40248a3fdc","functions":[{"id":"func/TopicsRESTControllerLib.constructor","name":"TopicsRESTControllerLib.constructor","line":8,"end_line":23,"hash":"bacd230f3777dda39ec134a69a9a7c1801cb3cd09c0cc86659df324540053028"},{"id":"func/TopicsRESTControllerLib.handleError","name":"TopicsRESTControllerLib.handleError","line":25,"end_line":32,"hash":"b9ba0c7b9752ac2fda3cf058a983a8b6708715e2e4dc882903ab5ef369956e03"},{"id":"func/TopicsRESTControllerLib.getTopics","name":"TopicsRESTControllerLib.getTopics","line":49,"end_line":55,"hash":"b89a696bcd1d601ef86754974dbf181baf2ece7d592674ba4fd87887725d6fa8"},{"id":"func/TopicsRESTControllerLib.getTopicPosts","name":"TopicsRESTControllerLib.getTopicPosts","line":82,"end_line":90,"hash":"8ad5f9b1749968c3fbfea95683bb388a5d99eda0b8fe7a4dce3447d6d47e6dba"},{"id":"func/TopicsRESTControllerLib.getTopicFollowState","name":"TopicsRESTControllerLib.getTopicFollowState","line":110,"end_line":118,"hash":"6d72fecc2bf46276cd00d39cc1c19ed6647beed1f2f3ba187a2c085ed4308611"},{"id":"func/TopicsRESTControllerLib.getTopicFollowers","name":"TopicsRESTControllerLib.getTopicFollowers","line":136,"end_line":143,"hash":"2bcd22520d962c008a3255f5cf6cf536fdeb738d036d3c6b6d61d5d5cf040615"}]}
// mutate4javascript-manifest-end
