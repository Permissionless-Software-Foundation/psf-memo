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
