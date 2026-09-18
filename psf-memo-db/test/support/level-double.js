/*
  In-memory LevelDB double shared by the txid repair and topic index unit and
  property tests.

  FakeDb implements the get/put/del/iterator surface the libraries use, honors
  the `gte`/`lte`/`limit` iterator options the topic read path relies on, and
  exposes the backing Map as `store` for assertions. makeLevel() wires the same
  store names the real psf-memo-db exposes so the repair library can be driven
  without opening any real LevelDB files.
*/

export class FakeDb {
  constructor (records = []) {
    this.map = new Map(records)
  }

  get store () {
    return this.map
  }

  async get (key) {
    if (!this.map.has(key)) {
      const err = new Error(`not found: ${key}`)
      err.notFound = true
      throw err
    }
    return this.map.get(key)
  }

  async put (key, value) {
    this.map.set(key, value)
  }

  async del (key) {
    this.map.delete(key)
  }

  async * iterator (opts = {}) {
    let keys = [...this.map.keys()].sort()
    if (opts.gte !== undefined) keys = keys.filter((key) => key >= opts.gte)
    if (opts.lte !== undefined) keys = keys.filter((key) => key <= opts.lte)
    const limit = opts.limit === undefined ? keys.length : opts.limit
    for (const key of keys.slice(0, limit)) {
      yield [key, this.map.get(key)]
    }
  }

  keys () {
    return [...this.map.keys()].sort()
  }
}

export function makeLevel () {
  return {
    postsDb: new FakeDb(),
    pollsDb: new FakeDb(),
    likesDb: new FakeDb(),
    postLikesDb: new FakeDb(),
    postParentsDb: new FakeDb(),
    postChildrenDb: new FakeDb(),
    pollOptionsDb: new FakeDb(),
    pollVotesDb: new FakeDb()
  }
}
