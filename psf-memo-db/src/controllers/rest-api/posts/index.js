/*
  REST API router for /posts routes.
*/

import Router from 'koa-router'
import PostsRESTControllerLib from './controller.js'

class PostsRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required when instantiating Posts REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required when instantiating Posts REST Controller.')
    }

    this.postsRESTController = new PostsRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })
    this.router = new Router({ prefix: '/posts' })
  }

  attach (app) {
    this.router.get('/recent', this.postsRESTController.getRecentPosts)
    this.router.get('/by/:addr', this.postsRESTController.getPostsByAddr)
    this.router.get('/following/:addr', this.postsRESTController.getFollowingFeed)
    this.router.get('/:txid/thread', this.postsRESTController.getPostThread)
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default PostsRouter
