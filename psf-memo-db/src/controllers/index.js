/*
  Top-level controllers for psf-memo-db.
*/

import Adapters from '../adapters/index.js'
import UseCases from '../use-cases/index.js'
import RESTControllers from './rest-api/index.js'

class Controllers {
  constructor () {
    this.adapters = new Adapters()
    this.useCases = new UseCases({ adapters: this.adapters })
    this.initAdapters = this.initAdapters.bind(this)
    this.initUseCases = this.initUseCases.bind(this)
    this.attachRESTControllers = this.attachRESTControllers.bind(this)
    this.attachControllers = this.attachControllers.bind(this)
  }

  async initAdapters () {
    await this.adapters.start()
  }

  async initUseCases () {
    await this.useCases.start()
  }

  attachRESTControllers (app) {
    const restControllers = new RESTControllers({
      adapters: this.adapters,
      useCases: this.useCases
    })
    restControllers.attachRESTControllers(app)
  }

  async attachControllers () {
    return true
  }
}

export default Controllers
