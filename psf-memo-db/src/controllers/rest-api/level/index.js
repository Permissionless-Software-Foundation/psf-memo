/*
  REST API router for /level routes.
*/

import Router from 'koa-router'
import LevelRESTControllerLib from './controller.js'
import { ENTITY_CONFIG } from './crud-handlers.js'

class LevelRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    this.levelRESTController = new LevelRESTControllerLib({
      adapters: this.adapters,
      useCases: this.useCases
    })
    this.router = new Router({ prefix: '/level' })
  }

  attach (app) {
    const ctrl = this.levelRESTController

    for (const cfg of ENTITY_CONFIG) {
      const h = ctrl.entityHandlers[cfg.route]
      this.router.post(`/${cfg.route}`, h.create)
      this.router.get(`/${cfg.route}/:${cfg.keyParam}`, h.get)
      this.router.put(`/${cfg.route}/:${cfg.keyParam}`, h.update)
      this.router.delete(`/${cfg.route}/:${cfg.keyParam}`, h.delete)
    }

    this.router.post('/status', ctrl.createStatus)
    this.router.get('/status/:statusKey', ctrl.getStatus)
    this.router.put('/status', ctrl.updateStatus)
    this.router.delete('/status/:statusKey', ctrl.deleteStatus)

    this.router.post('/backup', ctrl.backup)
    this.router.post('/restore', ctrl.restore)

    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default LevelRouter
