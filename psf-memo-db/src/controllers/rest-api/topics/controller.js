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
   * @apiDescription Returns a page of distinct Memo topics ordered by their
   * most recent post, newest first. Supports limit and offset.
   *
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of topics to skip after sorting
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/topics"
   *
   * @apiSuccess {Object[]} topics Array of topic objects
   * @apiSuccess {String} topics.room Topic name
   * @apiSuccess {Number} topics.postCount Number of posts in the topic
   * @apiSuccess {Object} pagination Pagination metadata
   */
  async getTopics (ctx) {
    try {
      const { limit, offset } = ctx.query
      ctx.body = await this.useCases.listTopics.execute({ limit, offset })
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
// {"version":1,"tested_at":"2026-09-17T16:42:30.815Z","module_hash":"50c5f72fa562d8c8f2c0ce8bed281a727b7effd3effbf92f8c4d573003b7b689","functions":[{"id":"func/TopicsRESTControllerLib.constructor","name":"TopicsRESTControllerLib.constructor","line":8,"end_line":23,"hash":"bacd230f3777dda39ec134a69a9a7c1801cb3cd09c0cc86659df324540053028"},{"id":"func/TopicsRESTControllerLib.handleError","name":"TopicsRESTControllerLib.handleError","line":25,"end_line":27,"hash":"801609a06e8f034702fb7293f5c7b0d316a54dfac1921d934e248a3b0a11f58c"},{"id":"func/TopicsRESTControllerLib.getTopics","name":"TopicsRESTControllerLib.getTopics","line":49,"end_line":56,"hash":"e2cf9b957874c42489d8c50b1d371f8191ce94d1002bca4a5ee7d6333d278d11"},{"id":"func/TopicsRESTControllerLib.getTopicPosts","name":"TopicsRESTControllerLib.getTopicPosts","line":84,"end_line":94,"hash":"bc18f51006b1c1079a0584b75d6666bec0b299febdcd565aab071679a2f1fe00"},{"id":"func/TopicsRESTControllerLib.getTopicFollowState","name":"TopicsRESTControllerLib.getTopicFollowState","line":114,"end_line":122,"hash":"6d72fecc2bf46276cd00d39cc1c19ed6647beed1f2f3ba187a2c085ed4308611"},{"id":"func/TopicsRESTControllerLib.getTopicFollowers","name":"TopicsRESTControllerLib.getTopicFollowers","line":140,"end_line":147,"hash":"2bcd22520d962c008a3255f5cf6cf536fdeb738d036d3c6b6d61d5d5cf040615"}]}
// mutate4javascript-manifest-end
