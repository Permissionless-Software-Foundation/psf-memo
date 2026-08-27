import { assert } from 'chai'
import sinon from 'sinon'
import LevelDb, { DB_NAMES, dbDir } from '../../../src/adapters/level-db.js'

describe('#LevelDb', () => {
  let uut
  let sandbox
  let fakeDbs

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fakeDbs = {}
    for (const name of DB_NAMES) {
      fakeDbs[name] = { close: sandbox.stub().resolves(true) }
    }

    uut = new LevelDb()
    // Replace the I/O boundary so the unit test exercises the adapter logic
    // without opening real LevelDB stores.
    uut.level = sandbox.stub().callsFake((path, opts) => {
      const match = path.match(/\/([^/]+)$/)
      const name = match ? match[1] : 'unknown'
      assert.include(opts, { valueEncoding: 'json' })
      return fakeDbs[name]
    })
    uut.shell = { mkdir: sandbox.stub().returns({}) }
  })

  afterEach(() => sandbox.restore())

  it('should export DB_NAMES containing the new index stores', () => {
    assert.include(DB_NAMES, 'addrPostHeights')
    assert.include(DB_NAMES, 'postLikes')
  })

  it('should expose dbDir as a string', () => {
    assert.isString(dbDir)
  })

  describe('#openDbs', () => {
    it('should open every store and register it on the instance', () => {
      const dbs = uut.openDbs()

      assert.equal(uut.level.callCount, DB_NAMES.length)
      for (const name of DB_NAMES) {
        assert.property(uut, `${name}Db`)
        assert.strictEqual(uut[`${name}Db`], fakeDbs[name])
        assert.strictEqual(dbs[`${name}Db`], fakeDbs[name])
      }
    })

    it('should give the posts store a larger cache size', () => {
      uut.openDbs()

      const postsCall = uut.level.getCalls().find((c) => c.args[0].endsWith('/posts'))
      const otherCall = uut.level.getCalls().find((c) => c.args[0].endsWith('/status'))
      assert.equal(postsCall.args[1].cacheSize, 512 * 1024 * 1024)
      assert.equal(otherCall.args[1].cacheSize, 64 * 1024 * 1024)
    })
  })

  describe('#getDbList', () => {
    it('should return the open db instances for every store', () => {
      uut.openDbs()
      const list = uut.getDbList()
      assert.equal(list.length, DB_NAMES.length)
      assert.deepEqual(list, DB_NAMES.map((name) => fakeDbs[name]))
    })
  })

  describe('#closeDbs', () => {
    it('should close every open store', async () => {
      uut.openDbs()
      const result = await uut.closeDbs()
      assert.isTrue(result)
      for (const name of DB_NAMES) {
        assert.isTrue(fakeDbs[name].close.calledOnce)
      }
    })
  })

  describe('#ensureDirectories', () => {
    it('should create the current, zips, and backup directories', async () => {
      const result = await uut.ensureDirectories()
      assert.isTrue(result)
      assert.equal(uut.shell.mkdir.callCount, 3)
    })
  })
})
