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
  }

  setName (addr, name) {
    if (!addr) return
    this.names.set(addr, name)
  }

  getName (addr) {
    if (!addr) return null
    return this.names.get(addr) || null
  }
}

module.exports = Profiles

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:17:49.004Z","module_hash":"6a13673cbcae9c1dc6a497b7214409f415a403b9c6eaefd04776950fb8b64768","functions":[{"id":"func/Profiles.constructor","name":"Profiles.constructor","line":13,"end_line":15,"hash":"d13fcf15cca167093fca3cb89c2482d1fbbfac5afad666e4b9cf47a440aa8394"},{"id":"func/Profiles.setName","name":"Profiles.setName","line":17,"end_line":20,"hash":"5a36c6e237798608de0bedd8744b75000c0eec5c0a6a64c870a25bcdf20aed21"},{"id":"func/Profiles.getName","name":"Profiles.getName","line":22,"end_line":25,"hash":"2fcb9d84687ea0f3b24f3e34c0a72eda55a4e869b87e08a7f4551321a4166198"}]}
// mutate4javascript-manifest-end
