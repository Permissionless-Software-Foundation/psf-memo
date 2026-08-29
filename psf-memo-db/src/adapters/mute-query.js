/*
  Adapter for querying Memo mute relationships from the mutes LevelDB.

  The indexer stores a mute record keyed as `${muterAddr}:${muteeHash160}`
  with an `unmute` flag. This adapter exposes:
    - isMuted(muterAddr, muteeAddr)
    - listMuted(muterAddr)

  Cash addresses are converted to 20-byte hash160 hex via bch-js Address.toHash160()
  and back via Address.hash160ToCash().
*/

import BCHJS from '@psf/bch-js'

class MuteQuery {
  constructor (localConfig = {}) {
    const { mutesDb, bchjs = new BCHJS({ restURL: process.env.RESTURL || 'https://api.fullstack.cash/v5/' }) } = localConfig
    if (!mutesDb) {
      throw new Error('mutesDb required when instantiating MuteQuery adapter.')
    }
    this.mutesDb = mutesDb
    this.bchjs = bchjs
    this.isMuted = this.isMuted.bind(this)
    this.listMuted = this.listMuted.bind(this)
  }

  // Return true when muterAddr has an active (not unmuted) mute record
  // for muteeAddr.
  async isMuted (muterAddr, muteeAddr) {
    const hash160 = this._toHash160(muteeAddr)
    const key = `${muterAddr}:${hash160}`
    try {
      const record = await this.mutesDb.get(key)
      return record.unmute !== true
    } catch (err) {
      if (err.notFound) return false
      throw err
    }
  }

  // Return the cash addresses the muter currently mutes.
  async listMuted (muterAddr) {
    const prefix = `${muterAddr}:`
    const muted = new Set()
    for await (const [key, record] of this.mutesDb.iterator({ gte: prefix, lt: this._nextString(prefix) })) {
      if (record.unmute === true) continue
      const hash160 = key.slice(prefix.length)
      muted.add(this._toCashAddress(hash160))
    }
    return Array.from(muted)
  }

  _toHash160 (addr) {
    return this.bchjs.Address.toHash160(addr)
  }

  _toCashAddress (hash160) {
    return this.bchjs.Address.hash160ToCash(hash160)
  }

  // Lexicographic successor for a string, used as an exclusive upper bound
  // for LevelDB prefix scans.
  _nextString (s) {
    return s.slice(0, -1) + String.fromCharCode(s.charCodeAt(s.length - 1) + 1)
  }
}

export default MuteQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:27:18.711Z","module_hash":"ea0307363359511b441e8b8dcdfb98c1020a605eac066df6dbdd8bf483d27cae","functions":[{"id":"func/MuteQuery.constructor","name":"MuteQuery.constructor","line":16,"end_line":25,"hash":"5f3104002d87ee9f837d862cbc64197963704c5fd3aa3631d5c5e71f6cc59f21"},{"id":"func/MuteQuery.isMuted","name":"MuteQuery.isMuted","line":29,"end_line":39,"hash":"76d1d6507cb040a3b3cecd1fee11b140f96d3836a05ee912f45b6534d55a1a50"},{"id":"func/MuteQuery.listMuted","name":"MuteQuery.listMuted","line":42,"end_line":51,"hash":"290ffc75a83bc51226d915b4962beacec7a48d611367e1bc7e4144056b3ae2f9"},{"id":"func/MuteQuery._toHash160","name":"MuteQuery._toHash160","line":53,"end_line":55,"hash":"248ed673be41bc9dcaa0d2fbeed1596784b7bde8877eafe43a05e29e430f9e8b"},{"id":"func/MuteQuery._toCashAddress","name":"MuteQuery._toCashAddress","line":57,"end_line":59,"hash":"0706292919ee44a25e63565558d4d9499188c7c49b3afc39eeb20438f4d5c4d4"},{"id":"func/MuteQuery._nextString","name":"MuteQuery._nextString","line":63,"end_line":65,"hash":"faa7823440ac998c3d5920ebcfe336d7b8df7e705dd6a1177dc8ccbd21f9ecf2"}]}
// mutate4javascript-manifest-end
