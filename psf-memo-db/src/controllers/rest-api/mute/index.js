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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:31:02.844Z","module_hash":"0539f755b7b843d59c73484a1c2411539198ddb243bdda64f35b4cab9d84d62d","functions":[{"id":"func/MuteRouter.constructor","name":"MuteRouter.constructor","line":9,"end_line":24,"hash":"70b571eea7a91fc3c2b2eecff7dc9003d679b2510813999cc63f81559032f094"},{"id":"func/MuteRouter.attach","name":"MuteRouter.attach","line":26,"end_line":32,"hash":"0f54317bf9a10a21fcbf15a722394d483b9089ca22661e0c1a43de32f45fb460"}]}
// mutate4javascript-manifest-end
