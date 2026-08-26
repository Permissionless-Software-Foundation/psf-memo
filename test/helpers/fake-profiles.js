'use strict'

// A fake profile store that records names set for addresses.
function fakeProfiles () {
  const names = new Map()
  return {
    names,
    setName: (addr, name) => names.set(addr, name),
    getName: (addr) => names.get(addr) || null
  }
}

module.exports = { fakeProfiles }
