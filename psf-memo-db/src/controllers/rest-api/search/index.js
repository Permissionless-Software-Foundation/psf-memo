/*
  REST API route for /search.
*/

import Router from 'koa-router'
import SearchRESTControllerLib from './controller.js'

class SearchRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    this.router = new Router({ prefix: '/search' })
    this.basev1 = '/'
    this.attach = this.attach.bind(this)
    this.search = this.search.bind(this)
  }

  attach (app) {
    if (!app) {
      throw new Error('App object must be passed when attaching SearchRouter.')
    }

    const searchRESTController = new SearchRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })

    this.router.get(this.basev1, this.search(searchRESTController))

    app.use(this.router.routes())
    app.use(this.router.allowedMethods({ throw: true }))
  }

  search (searchRESTController) {
    return async (ctx, next) => {
      await searchRESTController.search(ctx, next)
    }
  }
}

export default SearchRouter
