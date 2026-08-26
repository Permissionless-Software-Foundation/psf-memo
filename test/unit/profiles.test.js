/*
  Unit tests for the session profile store (src/services/profiles.js).

  The store indexes display names by BCH cash address so that pages can read
  a name immediately after it is broadcast.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const Profiles = require('../../src/services/profiles')

test('returns null when no name has been set for an address', () => {
  const profiles = new Profiles()
  assert.equal(profiles.getName('bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'), null)
})

test('stores and retrieves a name by address', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  profiles.setName(addr, 'trout')
  assert.equal(profiles.getName(addr), 'trout')
})

test('updating a name overwrites the previous value', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  profiles.setName(addr, 'trout')
  profiles.setName(addr, 'salmon')
  assert.equal(profiles.getName(addr), 'salmon')
})

test('different addresses keep independent names', () => {
  const profiles = new Profiles()
  const addr1 = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const addr2 = 'bitcoincash:qq0ktdlgekdszmxhmg7y6a90t9dpj6p0pg3gctn9e'
  profiles.setName(addr1, 'trout')
  profiles.setName(addr2, 'salmon')
  assert.equal(profiles.getName(addr1), 'trout')
  assert.equal(profiles.getName(addr2), 'salmon')
})

test('ignores setName for a missing address', () => {
  const profiles = new Profiles()
  profiles.setName(null, 'trout')
  assert.equal(profiles.getName(null), null)
})
