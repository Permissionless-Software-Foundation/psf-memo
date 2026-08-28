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
    if (!selfAddr || !targetAddr) return
    if (!this.following.has(selfAddr)) {
      this.following.set(selfAddr, new Map())
    }
    this.following.get(selfAddr).set(targetAddr, isFollowing)
  }

  getFollowState (selfAddr, targetAddr) {
    if (!selfAddr || !targetAddr) return false
    return this.following.get(selfAddr)?.get(targetAddr) || false
  }

  // Track whether the current wallet follows a given topic.
  setTopicFollowState (selfAddr, room, isFollowing) {
    if (!selfAddr || !room) return
    if (!this.topicFollowing.has(selfAddr)) {
      this.topicFollowing.set(selfAddr, new Map())
    }
    this.topicFollowing.get(selfAddr).set(room, isFollowing)
  }

  getTopicFollowState (selfAddr, room) {
    if (!selfAddr || !room) return false
    return this.topicFollowing.get(selfAddr)?.get(room) || false
  }
}

module.exports = Profiles

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T17:52:37.432Z","module_hash":"f729d4125eea29c45c4a0d7bd691a5f590512922f2ba78c85756643638fb0859","functions":[{"id":"func/Profiles.constructor","name":"Profiles.constructor","line":13,"end_line":18,"hash":"574f0b3772f783646c283c6ddc4d5ff200ca1f9918ab1fa668205003f885d4d3"},{"id":"func/Profiles.setName","name":"Profiles.setName","line":20,"end_line":23,"hash":"5a36c6e237798608de0bedd8744b75000c0eec5c0a6a64c870a25bcdf20aed21"},{"id":"func/Profiles.getName","name":"Profiles.getName","line":25,"end_line":28,"hash":"2fcb9d84687ea0f3b24f3e34c0a72eda55a4e869b87e08a7f4551321a4166198"},{"id":"func/Profiles.setBio","name":"Profiles.setBio","line":30,"end_line":33,"hash":"3825665ead1ba9bb217694c45a17bb2e11c78ffa053e5e90111a4b9208183b56"},{"id":"func/Profiles.getBio","name":"Profiles.getBio","line":35,"end_line":38,"hash":"2e9708249db4a0e4fa642cbe52e6216144ec91283281c61dee2ff3cc3d8f1572"},{"id":"func/Profiles.setAvatarUrl","name":"Profiles.setAvatarUrl","line":40,"end_line":43,"hash":"e4ccb0164fee4ab6cc3a1290fb4bf85e4a79f2227ca72872b1f10bc616926fd9"},{"id":"func/Profiles.getAvatarUrl","name":"Profiles.getAvatarUrl","line":45,"end_line":48,"hash":"0aa58dc15fd519e553136d04d1954e18084f79a6cd9349dc89b1136cf0a22a2b"},{"id":"func/Profiles.setFollowState","name":"Profiles.setFollowState","line":51,"end_line":57,"hash":"aa527936b6ca92a502e93e8241803318700c528e05f68ff7fb6fac1d410c197c"},{"id":"func/Profiles.getFollowState","name":"Profiles.getFollowState","line":59,"end_line":62,"hash":"299a44adb289026bf3b89a21947fc23bf05f5a40f07abb7f1bbd311c0479f562"}]}
// mutate4javascript-manifest-end
