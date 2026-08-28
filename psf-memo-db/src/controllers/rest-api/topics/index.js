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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T15:31:40.510Z","module_hash":"de978ac9963fbdcbd609f19a59c75427ee9bead3c7116c4dee4891d8622ef1e4","functions":[{"id":"func/TopicsRouter.constructor","name":"TopicsRouter.constructor","line":9,"end_line":24,"hash":"2503fc8448efbd71984f84a1f5d7f35dc5151d4d6d0b847ac1a7ba40f57a50b3"},{"id":"func/TopicsRouter.attach","name":"TopicsRouter.attach","line":26,"end_line":31,"hash":"0ccc57d85658f06a3a7bcc4479dacf70b30196667846a24851e8d506a1931480"}]}
// mutate4javascript-manifest-end
