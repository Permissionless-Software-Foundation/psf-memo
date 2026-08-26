/*
  Koa REST API for Memo indexer LevelDB storage.
  Architecture mirrors psf-slp-db bin/server.js.
*/

import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import convert from 'koa-convert'
import logger from 'koa-logger'
import mount from 'koa-mount'
import serve from 'koa-static'
import cors from 'kcors'
import 'dotenv/config'

import config from '../config/index.js'
import errorMiddleware from '../src/controllers/rest-api/middleware/error.js'
import wlogger from '../src/adapters/wlogger.js'
import Controllers from '../src/controllers/index.js'

class Server {
  constructor () {
    this.controllers = new Controllers()
    this.config = config
    this.process = process
  }

  async startServer () {
    try {
      const app = new Koa()
      app.keys = [this.config.session]

      console.log(`Starting environment: ${this.config.env}`)

      app.use(convert(logger()))
      app.use(bodyParser({
        jsonLimit: '100mb',
        formLimit: '100mb',
        textLimit: '100mb'
      }))
      app.use(errorMiddleware())
      app.use(cors({ origin: '*' }))

      app.use(mount('/', serve(`${process.cwd()}/docs`)))

      await this.controllers.initAdapters()
      await this.controllers.initUseCases()
      await this.controllers.attachRESTControllers(app)

      app.controllers = this.controllers

      console.log(`Running server in environment: ${this.config.env}`)
      wlogger.info(`Running server in environment: ${this.config.env}`)

      this.server = await app.listen(this.config.port)
      console.log(`Server started on ${this.config.port}`)

      if (this.config.env !== 'test') {
        await this.controllers.attachControllers(app)
      }

      return app
    } catch (err) {
      console.error('Could not start server. Error: ', err)
      console.log('Exiting after 5 seconds.')
      await this.sleep(5000)
      this.process.exit(1)
    }
  }

  sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default Server
