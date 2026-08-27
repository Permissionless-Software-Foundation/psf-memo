/*
  Adapter for querying Memo follow relationships from the follows LevelDB.

  The indexer stores a follow record keyed as `${followerAddr}:${followeeHash160}`
  with an `unfollow` flag. This adapter exposes:
    - isFollowing(followerAddr, followeeAddr)
    - listFollowing(followerAddr)
    - listFollowers(followeeAddr)

  Cash addresses are converted to 20-byte hash160 hex via bch-js Address.toHash160()
  and back via Address.hash160ToCash().
*/

import BCHJS from '@psf/bch-js'

class FollowQuery {
  constructor (localConfig = {}) {
    const { followsDb, bchjs = new BCHJS({ restURL: process.env.RESTURL || 'https://api.fullstack.cash/v5/' }) } = localConfig
    if (!followsDb) {
      throw new Error('followsDb required when instantiating FollowQuery adapter.')
    }
    this.followsDb = followsDb
    this.bchjs = bchjs
    this.isFollowing = this.isFollowing.bind(this)
    this.listFollowing = this.listFollowing.bind(this)
    this.listFollowers = this.listFollowers.bind(this)
  }

  // Return true when followerAddr has an active (not unfollowed) follow record
  // for followeeAddr.
  async isFollowing (followerAddr, followeeAddr) {
    const hash160 = this._toHash160(followeeAddr)
    const key = `${followerAddr}:${hash160}`
    try {
      const record = await this.followsDb.get(key)
      return record.unfollow !== true
    } catch (err) {
      if (err.notFound) return false
      throw err
    }
  }

  // Return the cash addresses the follower currently follows.
  async listFollowing (followerAddr) {
    const prefix = `${followerAddr}:`
    const following = new Set()
    for await (const [key, record] of this.followsDb.iterator({ gte: prefix, lt: this._nextString(prefix) })) {
      if (record.unfollow === true) continue
      const hash160 = key.slice(prefix.length)
      following.add(this._toCashAddress(hash160))
    }
    return Array.from(following)
  }

  // Return the cash addresses that currently follow the followee.
  async listFollowers (followeeAddr) {
    const hash160 = this._toHash160(followeeAddr)
    const suffix = `:${hash160}`
    const followers = new Set()
    for await (const [key, record] of this.followsDb.iterator()) {
      if (!key.endsWith(suffix)) continue
      if (record.unfollow === true) continue
      const followerAddr = key.slice(0, key.length - suffix.length)
      followers.add(followerAddr)
    }
    return Array.from(followers)
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

export default FollowQuery
