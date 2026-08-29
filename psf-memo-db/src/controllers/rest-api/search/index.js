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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T15:20:33.643Z","module_hash":"a32dfbdaa55df013a2d49f84a3089f66f38021248e12efcb11407118c94c9bc6","functions":[{"id":"func/SearchRouter.constructor","name":"SearchRouter.constructor","line":9,"end_line":16,"hash":"1eb5af36a47b22f3a868e5b9919dd1014e3a02ad9433f8eb30dda1ea30fdc046"},{"id":"func/SearchRouter.attach","name":"SearchRouter.attach","line":18,"end_line":32,"hash":"5b86e45767e913c1917b019cc2a3a46a150e9830022064012d72c0d6157f0591"},{"id":"func/SearchRouter.search","name":"SearchRouter.search","line":34,"end_line":38,"hash":"5dc63a71388481ce121a1eb449311e6bf09f98ebded6ed8dd5ea62922f2297c0"}]}
// mutate4javascript-manifest-end
