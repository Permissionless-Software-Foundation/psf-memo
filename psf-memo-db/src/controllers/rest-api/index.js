/*
  REST API controllers index.
*/

import LevelRESTController from './level/index.js'
import HealthRouter from './health/index.js'
import ProfileRouter from './profile/index.js'
import PostsRouter from './posts/index.js'
import FollowRouter from './follow/index.js'
import MuteRouter from './mute/index.js'
import TopicsRouter from './topics/index.js'
import PollsRouter from './polls/index.js'
import SearchRouter from './search/index.js'

class RESTControllers {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    this.attachRESTControllers = this.attachRESTControllers.bind(this)
  }

  attachRESTControllers (app) {
    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    const levelRESTController = new LevelRESTController(dependencies)
    levelRESTController.attach(app)

    const healthRouter = new HealthRouter()
    healthRouter.attach(app)

    const profileRouter = new ProfileRouter(dependencies)
    profileRouter.attach(app)

    const postsRouter = new PostsRouter(dependencies)
    postsRouter.attach(app)

    const followRouter = new FollowRouter(dependencies)
    followRouter.attach(app)

    const muteRouter = new MuteRouter(dependencies)
    muteRouter.attach(app)

    const topicsRouter = new TopicsRouter(dependencies)
    topicsRouter.attach(app)

    const pollsRouter = new PollsRouter(dependencies)
    pollsRouter.attach(app)

    const searchRouter = new SearchRouter(dependencies)
    searchRouter.attach(app)
  }
}

export default RESTControllers

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:03:03.560Z","module_hash":"3ddddec1509f140bafe4af35e833b5d7da26c83c285a01aeb2278854fee652b5","functions":[{"id":"func/RESTControllers.constructor","name":"RESTControllers.constructor","line":14,"end_line":18,"hash":"031cf6d9700e200ae1692b726146d49767c8a626b9fc6e5827e950da3883b13c"},{"id":"func/RESTControllers.attachRESTControllers","name":"RESTControllers.attachRESTControllers","line":20,"end_line":46,"hash":"c784ae664454f30c336337e0b68d71655b37a630a4ae13ec4cf4179272591783"}]}
// mutate4javascript-manifest-end
