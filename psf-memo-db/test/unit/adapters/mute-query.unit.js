/*
  Unit tests for the MuteQuery adapter.
*/

import { assert } from 'chai'
import MuteQuery from '../../../src/adapters/mute-query.js'

function makeMutesDb (records = {}) {
  const store = new Map(Object.entries(records))
  return {
    async get (key) {
      if (!store.has(key)) {
        const err = new Error('not found')
        err.notFound = true
        throw err
      }
      return store.get(key)
    },
    iterator (opts = {}) {
      const entries = Array.from(store.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      const { gte, lt } = opts
      const filtered = entries.filter(([key]) => {
        if (gte && key < gte) return false
        if (lt && key >= lt) return false
        return true
      })
      let i = 0
      return {
        [Symbol.asyncIterator] () {
          return this
        },
        async next () {
          if (i >= filtered.length) return { value: undefined, done: true }
          const entry = filtered[i++]
          return { value: entry, done: false }
        },
        async close () {}
      }
    }
  }
}

const MUTER = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const MUTEE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const OTHER_MUTER = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'

describe('#MuteQuery', () => {
  it('should throw when mutesDb is missing', () => {
    assert.throws(() => new MuteQuery({}), /mutesDb required/)
  })

  it('isMuted returns false when no mute record exists', async () => {
    const query = new MuteQuery({ mutesDb: makeMutesDb({}) })
    const result = await query.isMuted(MUTER, MUTEE)
    assert.equal(result, false)
  })

  it('isMuted returns true for an active mute record', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const mutesDb = makeMutesDb({
      [`${MUTER}:${hash160}`]: { muterAddr: MUTER, muteePkHash: hash160, unmute: false }
    })
    const query = new MuteQuery({ mutesDb })
    const result = await query.isMuted(MUTER, MUTEE)
    assert.equal(result, true)
  })

  it('isMuted returns false when the latest record is an unmute', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const mutesDb = makeMutesDb({
      [`${MUTER}:${hash160}`]: { muterAddr: MUTER, muteePkHash: hash160, unmute: true }
    })
    const query = new MuteQuery({ mutesDb })
    const result = await query.isMuted(MUTER, MUTEE)
    assert.equal(result, false)
  })

  it('listMuted returns active mutees for a muter', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const hash160Two = '44c44cfcb6e4e00386c7b0d14eaac6b7f47695e3'
    const mutesDb = makeMutesDb({
      [`${MUTER}:${hash160}`]: { muterAddr: MUTER, muteePkHash: hash160, unmute: false },
      [`${MUTER}:${hash160Two}`]: { muterAddr: MUTER, muteePkHash: hash160Two, unmute: true },
      [`${OTHER_MUTER}:${hash160}`]: { muterAddr: OTHER_MUTER, muteePkHash: hash160, unmute: false }
    })
    const query = new MuteQuery({ mutesDb })
    const result = await query.listMuted(MUTER)
    assert.deepEqual(result, [MUTEE])
  })

  it('listMuted ignores unmute records', async () => {
    const hash160 = 'cb481232299cd5743151ac4b2d63ae198e7bb0a9'
    const mutesDb = makeMutesDb({
      [`${MUTER}:${hash160}`]: { muterAddr: MUTER, muteePkHash: hash160, unmute: true }
    })
    const query = new MuteQuery({ mutesDb })
    const result = await query.listMuted(MUTER)
    assert.deepEqual(result, [])
  })
})
