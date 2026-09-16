/*
  In-memory LevelDB double shared by the txid repair unit and property tests.

  FakeDb implements just the get/put/del/iterator surface the repair library
  uses, plus keys() for assertions. makeLevel() wires the same store names the
  real psf-memo-db exposes so the repair library can be driven without opening
  any real LevelDB files.
*/

export class FakeDb {
  constructor () {
    this.map = new Map()
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

  async * iterator () {
    for (const [key, value] of this.map) {
      yield [key, value]
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
