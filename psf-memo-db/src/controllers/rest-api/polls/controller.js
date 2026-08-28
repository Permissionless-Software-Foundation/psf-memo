/*
  REST API controller for /polls routes.
*/

import wlogger from '../../../adapters/wlogger.js'

class PollsRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Polls REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required for Polls REST Controller.')
    }

    this.getPoll = this.getPoll.bind(this)
    this.getPollOptions = this.getPollOptions.bind(this)
    this.getPollVotes = this.getPollVotes.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    if (err.status) {
      ctx.throw(err.status, err.message || err)
    } else {
      wlogger.error('Error in polls controller: ', err)
      ctx.throw(500, err.message || 'Internal server error')
    }
  }

  /**
   * @api {get} /polls/:txid Get a poll
   * @apiPermission public
   * @apiName GetPoll
   * @apiGroup REST Polls
   *
   * @apiDescription Returns a poll with its question, options, and votes.
   */
  async getPoll (ctx) {
    try {
      const { txid } = ctx.params
      ctx.body = await this.useCases.getPoll.execute({ txid })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /polls/:txid/options Get poll options
   * @apiPermission public
   * @apiName GetPollOptions
   * @apiGroup REST Polls
   *
   * @apiDescription Returns the options for a poll.
   */
  async getPollOptions (ctx) {
    try {
      const { txid } = ctx.params
      ctx.body = await this.useCases.getPollOptions.execute({ txid })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /polls/:txid/votes Get poll votes
   * @apiPermission public
   * @apiName GetPollVotes
   * @apiGroup REST Polls
   *
   * @apiDescription Returns the votes for a poll.
   */
  async getPollVotes (ctx) {
    try {
      const { txid } = ctx.params
      ctx.body = await this.useCases.getPollVotes.execute({ txid })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default PollsRESTControllerLib
