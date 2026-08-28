/*
  REST API router for /polls routes.
*/

import Router from 'koa-router'
import PollsRESTControllerLib from './controller.js'

class PollsRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating Polls REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required when instantiating Polls REST Controller.')
    }

    this.pollsRESTController = new PollsRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })
    this.router = new Router({ prefix: '/polls' })
  }

  attach (app) {
    this.router.get('/:txid', this.pollsRESTController.getPoll)
    this.router.get('/:txid/options', this.pollsRESTController.getPollOptions)
    this.router.get('/:txid/votes', this.pollsRESTController.getPollVotes)
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default PollsRouter
