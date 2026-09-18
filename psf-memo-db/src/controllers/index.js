/*
  Top-level controllers for psf-memo-db.
*/

import Adapters from '../adapters/index.js'
import UseCases from '../use-cases/index.js'
import RESTControllers from './rest-api/index.js'
import config from '../../config/index.js'

class Controllers {
  constructor () {
    this.adapters = new Adapters({ notificationBlockWindow: config.notificationBlockWindow })
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T17:39:21.348Z","module_hash":"98a0ad31a137cbf1413da73e2a38c574ea0c5a0e46f55ad0aa0e575389096304","functions":[{"id":"func/Controllers.constructor","name":"Controllers.constructor","line":11,"end_line":18,"hash":"4799333910953ea1a2196c22466c2d529c840e0c5ecb96164dedfadcfdfd4311"},{"id":"func/Controllers.initAdapters","name":"Controllers.initAdapters","line":20,"end_line":22,"hash":"429e1b6bc7528723a86f14a0ca132759543d14df21445ee6e3bd3791383bfc70"},{"id":"func/Controllers.initUseCases","name":"Controllers.initUseCases","line":24,"end_line":26,"hash":"fdd81ae86205740b77c9e714d36f9779b65d132797b5350eb5012d63ba96256b"},{"id":"func/Controllers.attachRESTControllers","name":"Controllers.attachRESTControllers","line":28,"end_line":34,"hash":"59d6bda23b84e24509f6723cc6eeedfefd4439537cba43db8da76b00eac31d9a"},{"id":"func/Controllers.attachControllers","name":"Controllers.attachControllers","line":36,"end_line":38,"hash":"7ff26d7b484f8ecf169fe7f75e65a852d3af022d4de568cc22f283a9169f1bf3"}]}
// mutate4javascript-manifest-end
