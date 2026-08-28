/*
  REST API router for /topics routes.
*/

import Router from 'koa-router'
import TopicsRESTControllerLib from './controller.js'

class TopicsRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating Topics REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required when instantiating Topics REST Controller.')
    }

    this.topicsRESTController = new TopicsRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })
    this.router = new Router({ prefix: '/topics' })
  }

  attach (app) {
    this.router.get('/', this.topicsRESTController.getTopics)
    this.router.get('/:room/posts', this.topicsRESTController.getTopicPosts)
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default TopicsRouter
