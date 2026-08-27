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

test('setAvatarUrl stores and getAvatarUrl retrieves an avatar URL', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  profiles.setAvatarUrl(addr, 'https://example.com/avatar.png')

  assert.equal(profiles.getAvatarUrl(addr), 'https://example.com/avatar.png')
})

test('getAvatarUrl returns null for an unknown address', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  assert.equal(profiles.getAvatarUrl(addr), null)
})

test('setAvatarUrl with no address does nothing', () => {
  const profiles = new Profiles()

  profiles.setAvatarUrl('', 'https://example.com/avatar.png')

  assert.equal(profiles.getAvatarUrl(''), null)
})

test('setFollowState stores and getFollowState retrieves follow state', () => {
  const profiles = new Profiles()
  const selfAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const targetAddr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

  profiles.setFollowState(selfAddr, targetAddr, true)

  assert.equal(profiles.getFollowState(selfAddr, targetAddr), true)
})

test('getFollowState returns false for an unknown follow relationship', () => {
  const profiles = new Profiles()
  const selfAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const targetAddr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

  assert.equal(profiles.getFollowState(selfAddr, targetAddr), false)
})

test('setFollowState with no self address does nothing', () => {
  const profiles = new Profiles()
  const targetAddr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

  profiles.setFollowState('', targetAddr, true)

  assert.equal(profiles.getFollowState('', targetAddr), false)
})

test('follow state storage is independent per self address', () => {
  const profiles = new Profiles()
  const selfAddr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
  const otherSelfAddr = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'
  const targetAddr = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

  profiles.setFollowState(selfAddr, targetAddr, true)
  profiles.setFollowState(otherSelfAddr, targetAddr, false)

  assert.equal(profiles.getFollowState(selfAddr, targetAddr), true)
  assert.equal(profiles.getFollowState(otherSelfAddr, targetAddr), false)
})

test('avatar URL storage is independent of name and bio storage', () => {
  const profiles = new Profiles()
  const addr = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

  profiles.setName(addr, 'trout')
  profiles.setBio(addr, 'Building on BCH')
  profiles.setAvatarUrl(addr, 'https://example.com/avatar.png')

  assert.equal(profiles.getName(addr), 'trout')
  assert.equal(profiles.getBio(addr), 'Building on BCH')
  assert.equal(profiles.getAvatarUrl(addr), 'https://example.com/avatar.png')
})
