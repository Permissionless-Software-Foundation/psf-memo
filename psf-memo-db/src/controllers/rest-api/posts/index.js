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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T19:04:31.503Z","module_hash":"640e7871f89083654c3a3d442b91cd29bc5f9f483f43bc3f521e7c874932a696","functions":[{"id":"func/PostsRouter.constructor","name":"PostsRouter.constructor","line":9,"end_line":24,"hash":"552bd82e3f00dd57053a773a52a72c40e522cb146e146bf3335cc119504e963e"},{"id":"func/PostsRouter.attach","name":"PostsRouter.attach","line":26,"end_line":33,"hash":"452b2740b90a4f51ac1b4fdde8c305b6a5e6e93e806acd4e5d37d2e9b940bbf1"}]}
// mutate4javascript-manifest-end
