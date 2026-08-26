/*
  REST API router for /profile routes.
*/

import Router from 'koa-router'
import ProfileRESTControllerLib from './controller.js'

class ProfileRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating Profile REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required when instantiating Profile REST Controller.')
    }

    this.profileRESTController = new ProfileRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })
    this.router = new Router({ prefix: '/profile' })
  }

  attach (app) {
    this.router.get('/recent', this.profileRESTController.getRecentProfiles)
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default ProfileRouter
