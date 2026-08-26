/*
  Unit tests for bin/server.js
*/

import { assert } from 'chai'
import sinon from 'sinon'
import Server from '../../../bin/server.js'

describe('#server', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new Server()
  })

  afterEach(() => sandbox.restore())

  describe('#startServer', () => {
    it('should start the server', async () => {
      sandbox.stub(uut.controllers, 'initAdapters').resolves()
      sandbox.stub(uut.controllers, 'initUseCases').resolves()
      sandbox.stub(uut.controllers, 'attachRESTControllers').resolves()
      sandbox.stub(uut.controllers, 'attachControllers').resolves()
      uut.config.env = 'dev'
      uut.config.port = 5041

      const result = await uut.startServer()

      assert.property(result, 'env')
      uut.server.close()
      uut.config.env = 'test'
    })
  })
})
