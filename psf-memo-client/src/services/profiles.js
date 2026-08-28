/*
  Simple in-memory profile store for the current session.

  Holds display names and other profile data indexed by BCH cash address. This
  keeps the Set Name and Account pages in sync immediately after a name is
  broadcast, without waiting for the memo-db indexer to crawl the transaction.

  In a production app this would be backed by memo-db or persistent storage;
  for the current SPA it is a small shared adapter boundary.
*/

class Profiles {
  constructor () {
    this.names = new Map()
    this.bios = new Map()
    this.avatarUrls = new Map()
    this.following = new Map()
    this.topicFollowing = new Map()
  }

  setName (addr, name) {
    if (!addr) return
    this.names.set(addr, name)
  }

  getName (addr) {
    if (!addr) return null
    return this.names.get(addr) || null
  }

  setBio (addr, bio) {
    if (!addr) return
    this.bios.set(addr, bio)
  }

  getBio (addr) {
    if (!addr) return null
    return this.bios.get(addr) || null
  }

  setAvatarUrl (addr, url) {
    if (!addr) return
    this.avatarUrls.set(addr, url)
  }

  getAvatarUrl (addr) {
    if (!addr) return null
    return this.avatarUrls.get(addr) || null
  }

  // Track whether the current wallet follows a given address.
  setFollowState (selfAddr, targetAddr, isFollowing) {
    this._setMapState(this.following, selfAddr, targetAddr, isFollowing)
  }

  getFollowState (selfAddr, targetAddr) {
    return this._getMapState(this.following, selfAddr, targetAddr)
  }

  // Track whether the current wallet follows a given topic.
  setTopicFollowState (selfAddr, room, isFollowing) {
    this._setMapState(this.topicFollowing, selfAddr, room, isFollowing)
  }

  getTopicFollowState (selfAddr, room) {
    return this._getMapState(this.topicFollowing, selfAddr, room)
  }

  // Set a boolean value on a per-self-address nested map.
  _setMapState (map, selfAddr, key, value) {
    if (!selfAddr || !key) return
    if (!map.has(selfAddr)) {
      map.set(selfAddr, new Map())
    }
    map.get(selfAddr).set(key, value)
  }

  // Read a boolean value from a per-self-address nested map.
  _getMapState (map, selfAddr, key) {
    if (!selfAddr || !key) return false
    return map.get(selfAddr)?.get(key) || false
  }
}

module.exports = Profiles

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T18:21:58.102Z","module_hash":"1cec5125fb228d43d47e4ec171eb43c492f2bd773ca315748df78a16071e2802","functions":[{"id":"func/Profiles.constructor","name":"Profiles.constructor","line":13,"end_line":19,"hash":"247804207ec0220b6e6507f6beb6f86023a7c08b50737a52a0dbb99d262993d3"},{"id":"func/Profiles.setName","name":"Profiles.setName","line":21,"end_line":24,"hash":"5a36c6e237798608de0bedd8744b75000c0eec5c0a6a64c870a25bcdf20aed21"},{"id":"func/Profiles.getName","name":"Profiles.getName","line":26,"end_line":29,"hash":"2fcb9d84687ea0f3b24f3e34c0a72eda55a4e869b87e08a7f4551321a4166198"},{"id":"func/Profiles.setBio","name":"Profiles.setBio","line":31,"end_line":34,"hash":"3825665ead1ba9bb217694c45a17bb2e11c78ffa053e5e90111a4b9208183b56"},{"id":"func/Profiles.getBio","name":"Profiles.getBio","line":36,"end_line":39,"hash":"2e9708249db4a0e4fa642cbe52e6216144ec91283281c61dee2ff3cc3d8f1572"},{"id":"func/Profiles.setAvatarUrl","name":"Profiles.setAvatarUrl","line":41,"end_line":44,"hash":"e4ccb0164fee4ab6cc3a1290fb4bf85e4a79f2227ca72872b1f10bc616926fd9"},{"id":"func/Profiles.getAvatarUrl","name":"Profiles.getAvatarUrl","line":46,"end_line":49,"hash":"0aa58dc15fd519e553136d04d1954e18084f79a6cd9349dc89b1136cf0a22a2b"},{"id":"func/Profiles.setFollowState","name":"Profiles.setFollowState","line":52,"end_line":54,"hash":"805cafb46052f91bfa0a123842c25ff8ee0f7f4a7e661f51d289b0487738dbd4"},{"id":"func/Profiles.getFollowState","name":"Profiles.getFollowState","line":56,"end_line":58,"hash":"48fdf5a632825946c391146628cd6f51b4eb0169c7a6d6b89c795ff554e62b07"},{"id":"func/Profiles.setTopicFollowState","name":"Profiles.setTopicFollowState","line":61,"end_line":63,"hash":"54ab980e42018d64fbacee7d80347d530791b7ba21d8fac46f5ed85f33903f98"},{"id":"func/Profiles.getTopicFollowState","name":"Profiles.getTopicFollowState","line":65,"end_line":67,"hash":"90ce88799dda5477e20ce4de17404dace55abf1d2f2c1c87671e94fc2f270205"},{"id":"func/Profiles._setMapState","name":"Profiles._setMapState","line":70,"end_line":76,"hash":"13d2cad84be961b89482970f55f107d93fa1bdc10636dc64844c6a9263e88583"},{"id":"func/Profiles._getMapState","name":"Profiles._getMapState","line":79,"end_line":82,"hash":"c1c8966a797533614d35c7a13deb8f757572127ebcbde1d234c7d966346d89a8"}]}
// mutate4javascript-manifest-end
