/*
  REST API controller for /polls routes.
*/

import { handleControllerError } from '../lib/handle-error.js'

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
    handleControllerError(ctx, err, 'polls')
  }

  // Run a poll read use case for the txid in ctx.params and surface the result
  // on ctx.body, routing any error through handleError.
  async _run (ctx, useCase) {
    try {
      const { txid } = ctx.params
      ctx.body = await useCase.execute({ txid })
    } catch (err) {
      this.handleError(ctx, err)
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
    await this._run(ctx, this.useCases.getPoll)
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
    await this._run(ctx, this.useCases.getPollOptions)
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
    await this._run(ctx, this.useCases.getPollVotes)
  }
}

export default PollsRESTControllerLib

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T00:15:40.936Z","module_hash":"1ba0b711ef8d4702bfd92d282898577110efbf49a3ae239efd938658f7db05fd","functions":[{"id":"func/PollsRESTControllerLib.constructor","name":"PollsRESTControllerLib.constructor","line":8,"end_line":22,"hash":"3ca791734bf514b4dac5fcdb46eacbab0ef4b86628f11ea5d64ee6ce6fe17cf6"},{"id":"func/PollsRESTControllerLib.handleError","name":"PollsRESTControllerLib.handleError","line":24,"end_line":31,"hash":"8acfb5f315721c8866e4b735febb545f530efaa194243a2e921b04fb3ab87f68"},{"id":"func/PollsRESTControllerLib._run","name":"PollsRESTControllerLib._run","line":35,"end_line":42,"hash":"b19e3acdd8b19c8c75a506a89f937c8d6732af50753fa3e5494855cb7a091d95"},{"id":"func/PollsRESTControllerLib.getPoll","name":"PollsRESTControllerLib.getPoll","line":52,"end_line":54,"hash":"4064bdaafd63614d997cc03f592cb49530853ccff8cee61edff973212e48984a"},{"id":"func/PollsRESTControllerLib.getPollOptions","name":"PollsRESTControllerLib.getPollOptions","line":64,"end_line":66,"hash":"d8ee0e6f393d97669bb1d775eeee3c804ddadf546072eaa2a0ffa0dcabf6de3e"},{"id":"func/PollsRESTControllerLib.getPollVotes","name":"PollsRESTControllerLib.getPollVotes","line":76,"end_line":78,"hash":"d25ca37fabc1d307965a33739626512472ff654955056667b2a46c3bf3d86de5"}]}
// mutate4javascript-manifest-end
