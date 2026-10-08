/*
  Unit tests for the shared profile route path builder.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { profilePath, PROFILE_PATH_PREFIX } = require('../../src/services/profile-path')

const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'

test('PROFILE_PATH_PREFIX is the profile route prefix', () => {
  assert.equal(PROFILE_PATH_PREFIX, '/profile')
})

test('profilePath percent-encodes the address for the profile route', () => {
  assert.equal(
    profilePath(ALICE),
    '/profile/bitcoincash%3Aqr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
  )
})
