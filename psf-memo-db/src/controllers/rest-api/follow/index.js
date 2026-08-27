/*
  REST API router for /follow routes.
*/

import Router from 'koa-router'
import FollowRESTControllerLib from './controller.js'

class FollowRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating Follow REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required when instantiating Follow REST Controller.')
    }

    this.followRESTController = new FollowRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })
    this.router = new Router({ prefix: '/follow' })
  }

  attach (app) {
    this.router.get('/state', this.followRESTController.getFollowState)
    this.router.get('/following/:follower', this.followRESTController.getFollowing)
    this.router.get('/followers/:followee', this.followRESTController.getFollowers)

    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default FollowRouter
