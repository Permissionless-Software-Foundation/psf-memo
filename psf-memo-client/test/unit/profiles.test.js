/*
  Unit tests for the in-memory profile store.

  The profile store keeps display names and bios indexed by BCH cash address
  so that pages stay in sync immediately after a broadcast.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const Profiles = require('../../src/services/profiles')

test('setName stores and getName retrieves a display name', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  profiles.setName(addr, 'trout')

  assert.equal(profiles.getName(addr), 'trout')
})

test('getName returns null for an unknown address', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  assert.equal(profiles.getName(addr), null)
})

test('setName with no address does nothing', () => {
  const profiles = new Profiles()

  profiles.setName('', 'trout')

  assert.equal(profiles.getName(''), null)
})

test('setBio stores and getBio retrieves a bio', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  profiles.setBio(addr, 'Building on BCH')

  assert.equal(profiles.getBio(addr), 'Building on BCH')
})

test('getBio returns null for an unknown address', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  assert.equal(profiles.getBio(addr), null)
})

test('setBio with no address does nothing', () => {
  const profiles = new Profiles()

  profiles.setBio('', 'Building on BCH')

  assert.equal(profiles.getBio(''), null)
})

test('name and bio storage are independent', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  profiles.setName(addr, 'trout')
  profiles.setBio(addr, 'Building on BCH')

  assert.equal(profiles.getName(addr), 'trout')
  assert.equal(profiles.getBio(addr), 'Building on BCH')
})
