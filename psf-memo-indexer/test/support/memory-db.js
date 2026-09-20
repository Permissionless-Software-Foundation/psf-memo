/*
  In-memory LevelDB double shared by the Memo action-type unit and property
  tests. It supports the get/create/update/delete surface the action handlers
  use and exposes the backing Map as `store` for assertions.
*/

export function makeMemoryDb () {
  const store = new Map()
  return {
    store,
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    async create (key, value) {
      if (!store.has(key)) store.set(key, value)
      return { success: true }
    },
    async update (key, value) {
      store.set(key, value)
      return { success: true }
    },
    async delete (key) {
      store.delete(key)
      return { success: true }
    },
    async * iterator (opts = {}) {
      let keys = [...store.keys()].sort()
      if (opts.gte !== undefined) keys = keys.filter((key) => key >= opts.gte)
      if (opts.lte !== undefined) keys = keys.filter((key) => key <= opts.lte)
      const limit = opts.limit === undefined ? keys.length : opts.limit
      for (const key of keys.slice(0, limit)) {
        yield [key, store.get(key)]
      }
    }
  }
}
