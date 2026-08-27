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
}

module.exports = Profiles

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T15:05:55.871Z","module_hash":"7c75650f72fefd5e9f8fea638c1d9ca9fad9eeebabe16e62fed4f5e828e39248","functions":[{"id":"func/Profiles.constructor","name":"Profiles.constructor","line":13,"end_line":16,"hash":"8f7409de885759ce97767c69097a353ec557bd5212eef76ead0388174389ff24"},{"id":"func/Profiles.setName","name":"Profiles.setName","line":18,"end_line":21,"hash":"5a36c6e237798608de0bedd8744b75000c0eec5c0a6a64c870a25bcdf20aed21"},{"id":"func/Profiles.getName","name":"Profiles.getName","line":23,"end_line":26,"hash":"2fcb9d84687ea0f3b24f3e34c0a72eda55a4e869b87e08a7f4551321a4166198"},{"id":"func/Profiles.setBio","name":"Profiles.setBio","line":28,"end_line":31,"hash":"3825665ead1ba9bb217694c45a17bb2e11c78ffa053e5e90111a4b9208183b56"},{"id":"func/Profiles.getBio","name":"Profiles.getBio","line":33,"end_line":36,"hash":"2e9708249db4a0e4fa642cbe52e6216144ec91283281c61dee2ff3cc3d8f1572"}]}
// mutate4javascript-manifest-end
