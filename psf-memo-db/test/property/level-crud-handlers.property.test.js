/*
  Property tests for the generic /level entity CRUD handlers.

  The mute persistence feature depends on the generic entity route contract:
  a create writes `{ key, muteData }` into the mutes store, GET reads it back,
  and a later write for the same key wins. The unit tests cover the fixed mute
  fixture; these properties cover broad random keys and records so the
  round-trip, upsert ordering, key isolation, and delete invariants hold
  everywhere the registry is used.
*/

import test from 'node:test'
import { seededRandom, forAll, intGen, txidGen } from './harness.js'
import { makeCrudHandlers, ENTITY_CONFIG } from '../../src/controllers/rest-api/level/crud-handlers.js'

const rng = seededRandom(20260925)

const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel']

function randomToken () {
  return `${WORDS[intGen(rng, 0, WORDS.length - 1)()]}-${intGen(rng, 0, 999)()}`
}

function muteDataGen () {
  return {
    muterAddr: `bitcoincash:${randomToken()}`,
    muteePkHash: txidGen(rng).slice(0, 40),
    unmute: rng() < 0.5,
    txid: txidGen(rng),
    seen: intGen(rng, 0, 1000000)(),
    blockHeight: intGen(rng, 0, 900000)()
  }
}

// The actual config the mute route is registered with.
const muteConfig = ENTITY_CONFIG.find((cfg) => cfg.route === 'mute')

// In-memory stand-in for the LevelDB contract the handlers rely on.
function makeHarness (config) {
  const store = new Map()
  const db = {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    async put (key, data) {
      store.set(key, data)
    },
    async del (key) {
      store.delete(key)
    }
  }
  return {
    handlers: makeCrudHandlers(config),
    adapters: { level: { [config.dbProp]: db } },
    store
  }
}

function createCtx (config, key, data) {
  return { params: {}, request: { body: { [config.bodyIdField]: key, [config.bodyDataField]: data } }, body: null }
}

function getCtx (config, key) {
  return { params: { [config.keyParam]: key }, body: null }
}

test('mute entity create then get round-trips the record', async () => {
  await forAll(
    () => ({ key: randomToken(), data: muteDataGen() }),
    async ({ key, data }) => {
      const { handlers, adapters } = makeHarness(muteConfig)
      const created = createCtx(muteConfig, key, data)
      await handlers.create(created, adapters)
      if (!created.body || created.body.success !== true) return false
      if (created.body[muteConfig.bodyIdField] !== key) return false

      const read = getCtx(muteConfig, key)
      await handlers.get(read, adapters)
      return JSON.stringify(read.body) === JSON.stringify(data)
    },
    { label: 'mute entity create/get round trip' }
  )
})

test('mute entity upsert keeps the latest record for a key', async () => {
  await forAll(
    () => {
      const key = randomToken()
      const writes = []
      for (let i = 0, n = intGen(rng, 2, 5)(); i < n; i++) writes.push(muteDataGen())
      return { key, writes }
    },
    async ({ key, writes }) => {
      const { handlers, adapters } = makeHarness(muteConfig)
      for (const data of writes) {
        await handlers.create(createCtx(muteConfig, key, data), adapters)
      }
      const read = getCtx(muteConfig, key)
      await handlers.get(read, adapters)
      return JSON.stringify(read.body) === JSON.stringify(writes[writes.length - 1])
    },
    { label: 'mute entity upsert last-write-wins' }
  )
})

test('mute entity writes to distinct keys stay isolated', async () => {
  await forAll(
    () => ({ a: { key: randomToken(), data: muteDataGen() }, b: { key: randomToken(), data: muteDataGen() } }),
    async ({ a, b }) => {
      if (a.key === b.key) return true
      const { handlers, adapters } = makeHarness(muteConfig)
      await handlers.create(createCtx(muteConfig, a.key, a.data), adapters)
      await handlers.create(createCtx(muteConfig, b.key, b.data), adapters)

      const readA = getCtx(muteConfig, a.key)
      const readB = getCtx(muteConfig, b.key)
      await handlers.get(readA, adapters)
      await handlers.get(readB, adapters)
      return JSON.stringify(readA.body) === JSON.stringify(a.data) &&
        JSON.stringify(readB.body) === JSON.stringify(b.data)
    },
    { label: 'mute entity key isolation' }
  )
})

test('mute entity delete removes the record', async () => {
  await forAll(
    () => ({ key: randomToken(), data: muteDataGen() }),
    async ({ key, data }) => {
      const { handlers, adapters, store } = makeHarness(muteConfig)
      await handlers.create(createCtx(muteConfig, key, data), adapters)
      const deleted = { params: { [muteConfig.keyParam]: key }, body: null }
      await handlers.delete(deleted, adapters)
      return deleted.body.success === true && !store.has(key)
    },
    { label: 'mute entity delete' }
  )
})
