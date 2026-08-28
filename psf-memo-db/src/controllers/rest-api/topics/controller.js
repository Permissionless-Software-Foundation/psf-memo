/*
  REST API controller for /topics routes.
*/

import wlogger from '../../../adapters/wlogger.js'

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
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    if (err.status) {
      ctx.throw(err.status, err.message || err)
    } else {
      wlogger.error('Error in topics controller: ', err)
      ctx.throw(500, err.message || 'Internal server error')
    }
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
      const { limit, offset } = ctx.query
      ctx.body = await this.useCases.listTopicPosts.execute({ room, limit, offset })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default TopicsRESTControllerLib

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T15:26:54.488Z","module_hash":"64ac0a8aa7c2e0b575a89161ceb19c59e6618448eaf767ef5bbccc3ce174afaa","functions":[{"id":"func/TopicsRESTControllerLib.constructor","name":"TopicsRESTControllerLib.constructor","line":8,"end_line":21,"hash":"63d2092a2bd7946dd11bdf0c4ff102e31c47a0ed6ad56a0652f26e1760d525f9"},{"id":"func/TopicsRESTControllerLib.handleError","name":"TopicsRESTControllerLib.handleError","line":23,"end_line":30,"hash":"b9ba0c7b9752ac2fda3cf058a983a8b6708715e2e4dc882903ab5ef369956e03"},{"id":"func/TopicsRESTControllerLib.getTopics","name":"TopicsRESTControllerLib.getTopics","line":47,"end_line":53,"hash":"b89a696bcd1d601ef86754974dbf181baf2ece7d592674ba4fd87887725d6fa8"},{"id":"func/TopicsRESTControllerLib.getTopicPosts","name":"TopicsRESTControllerLib.getTopicPosts","line":80,"end_line":88,"hash":"8ad5f9b1749968c3fbfea95683bb388a5d99eda0b8fe7a4dce3447d6d47e6dba"}]}
// mutate4javascript-manifest-end
