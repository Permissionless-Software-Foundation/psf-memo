/*
  REST API controllers index.
*/

import LevelRESTController from './level/index.js'
import HealthRouter from './health/index.js'
import ProfileRouter from './profile/index.js'
import PostsRouter from './posts/index.js'
import FollowRouter from './follow/index.js'
import TopicsRouter from './topics/index.js'
import PollsRouter from './polls/index.js'

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

    const topicsRouter = new TopicsRouter(dependencies)
    topicsRouter.attach(app)

    const pollsRouter = new PollsRouter(dependencies)
    pollsRouter.attach(app)
  }
}

export default RESTControllers
