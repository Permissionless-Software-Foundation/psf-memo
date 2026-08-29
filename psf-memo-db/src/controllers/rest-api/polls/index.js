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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:03:23.586Z","module_hash":"513519de883b3a86c55dbfac0282a28da8c55b234d5bd3da179c67999d3bd641","functions":[{"id":"func/PollsRouter.constructor","name":"PollsRouter.constructor","line":9,"end_line":24,"hash":"15322091dfd4b69a3edffc9381579a6d356db5acbb8c330e17d715b354ba2fbc"},{"id":"func/PollsRouter.attach","name":"PollsRouter.attach","line":26,"end_line":32,"hash":"14d03a2f70baf72738b27d4bf570f9731634db43648ad065019f7724daa3b38a"}]}
// mutate4javascript-manifest-end
