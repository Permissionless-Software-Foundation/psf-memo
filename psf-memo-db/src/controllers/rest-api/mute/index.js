/*
  REST API router for /mute routes.
*/

import Router from 'koa-router'
import MuteRESTControllerLib from './controller.js'

class MuteRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating Mute REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required when instantiating Mute REST Controller.')
    }

    this.muteRESTController = new MuteRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })
    this.router = new Router({ prefix: '/mute' })
  }

  attach (app) {
    this.router.get('/state', this.muteRESTController.getMuteState)
    this.router.get('/muted/:muter', this.muteRESTController.getMuted)

    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default MuteRouter
