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
