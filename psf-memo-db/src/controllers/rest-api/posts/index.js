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
    this.router.get('/notifications/:addr', this.postsRESTController.getNotifications)
    this.router.get('/:txid/thread', this.postsRESTController.getPostThread)
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default PostsRouter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T20:15:32.177Z","module_hash":"57e7ca39a57e35a97b547b683a77223d17d666ba6878f08a387e42d044a46f85","functions":[{"id":"func/PostsRouter.constructor","name":"PostsRouter.constructor","line":9,"end_line":24,"hash":"552bd82e3f00dd57053a773a52a72c40e522cb146e146bf3335cc119504e963e"},{"id":"func/PostsRouter.attach","name":"PostsRouter.attach","line":26,"end_line":34,"hash":"f6d97a26736967d4be3685c63cfcae0eab7001d27dca22ce5c71199e98209d36"}]}
// mutate4javascript-manifest-end
