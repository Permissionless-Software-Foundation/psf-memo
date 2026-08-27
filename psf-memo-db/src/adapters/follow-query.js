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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T18:05:09.378Z","module_hash":"00de769ca2e93299592c29a5c794911e59b972121763fd907eb568314a559a74","functions":[{"id":"func/FollowQuery.constructor","name":"FollowQuery.constructor","line":17,"end_line":27,"hash":"5389c3c9513d9d576e89969f741c5a511d4fadada98676780ee38b017e2c759a"},{"id":"func/FollowQuery.isFollowing","name":"FollowQuery.isFollowing","line":31,"end_line":41,"hash":"dde01f8501cddd45b091bbf0516994e66b80bd1ca23ffe4b8382c6ee75fbd7ea"},{"id":"func/FollowQuery.listFollowing","name":"FollowQuery.listFollowing","line":44,"end_line":53,"hash":"d354fe051ef6816b948402a94c551792340ec3a4a602aef54aa460a9a119329a"},{"id":"func/FollowQuery.listFollowers","name":"FollowQuery.listFollowers","line":56,"end_line":67,"hash":"332a2bcae7045c3af9e3fbcf5ae5134876be449ada041e7fe1525e2969ae6aee"},{"id":"func/FollowQuery._toHash160","name":"FollowQuery._toHash160","line":69,"end_line":71,"hash":"248ed673be41bc9dcaa0d2fbeed1596784b7bde8877eafe43a05e29e430f9e8b"},{"id":"func/FollowQuery._toCashAddress","name":"FollowQuery._toCashAddress","line":73,"end_line":75,"hash":"0706292919ee44a25e63565558d4d9499188c7c49b3afc39eeb20438f4d5c4d4"},{"id":"func/FollowQuery._nextString","name":"FollowQuery._nextString","line":79,"end_line":81,"hash":"faa7823440ac998c3d5920ebcfe336d7b8df7e705dd6a1177dc8ccbd21f9ecf2"}]}
// mutate4javascript-manifest-end
