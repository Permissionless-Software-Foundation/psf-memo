import Router from 'koa-router'
import HealthRESTControllerLib from './controller.js'

class HealthRouter {
  constructor () {
    this.healthRESTController = new HealthRESTControllerLib()
    this.router = new Router({ prefix: '/health' })
  }

  attach (app) {
    this.router.get('/', this.healthRESTController.getHealth)
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }
}

export default HealthRouter
