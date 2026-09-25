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
    this.router.get('/newest-post/:addr', this.profileRESTController.getNewestQualifyingPost)
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default ProfileRouter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T17:19:16.737Z","module_hash":"7a4acec12d77c59c171173cb609c1db3356f8f63f873a2762cf45d48051642ee","functions":[{"id":"func/ProfileRouter.constructor","name":"ProfileRouter.constructor","line":9,"end_line":24,"hash":"dfce3fd8f434ef5fc738bd7a64fc1f1c649b7f1cc371ec452089829c4386f9fa"},{"id":"func/ProfileRouter.attach","name":"ProfileRouter.attach","line":26,"end_line":31,"hash":"5128f2d5c32c1577d5a95bc4472e660d374ede068161bfc61445676380860b4d"}]}
// mutate4javascript-manifest-end
