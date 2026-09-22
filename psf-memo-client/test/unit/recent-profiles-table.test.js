/*
  Unit tests for the Recent Profiles table view model.

  The /profile/recent response already carries each profile's display name
  (name) and avatar URL (profilePicUrl), joined by the DB. These tests pin the
  pure table/account view model independent of the React shell: the leftmost
  Account column, its truncated-address fallback, and the preserved columns.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  PROFILE_PATH_PREFIX,
  RECENT_PROFILES_TABLE_HEADERS,
  profilePath,
  accountDisplayName,
  buildRecentProfileAccount,
  buildRecentProfileFollow,
  buildRecentProfilesTable
} = require('../../src/services/recent-profiles-table')

const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const DAVE = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

test('profilePath encodes the address for the profile route', () => {
  assert.equal(profilePath(ALICE), `${PROFILE_PATH_PREFIX}/${encodeURIComponent(ALICE)}`)
})

test('accountDisplayName prefers the display name', () => {
  assert.equal(accountDisplayName(ALICE, 'alice'), 'alice')
})

test('accountDisplayName falls back to the truncated address without a name', () => {
  assert.equal(accountDisplayName(DAVE, null), 'bitcoincas...py26r63g3d')
  assert.equal(accountDisplayName(DAVE, ''), 'bitcoincas...py26r63g3d')
})

test('buildRecentProfileAccount carries the name, avatar, and profile path', () => {
  const account = buildRecentProfileAccount({
    addr: ALICE,
    name: 'alice',
    profilePicUrl: 'https://example.com/alice.png'
  })

  assert.equal(account.addr, ALICE)
  assert.equal(account.displayName, 'alice')
  assert.equal(account.avatarUrl, 'https://example.com/alice.png')
  assert.equal(account.profilePath, `/profile/${encodeURIComponent(ALICE)}`)
})

test('buildRecentProfileAccount reports a null avatar when the profile has no picture', () => {
  const account = buildRecentProfileAccount({ addr: ALICE, name: 'alice', profilePicUrl: null })

  assert.equal(account.avatarUrl, null)
})

test('the table headers put Account first and end with the Follow column', () => {
  assert.deepEqual(RECENT_PROFILES_TABLE_HEADERS, ['Account', 'Address', 'Bio', 'Block', 'Seen', 'Follow'])
})

test('buildRecentProfilesTable builds one row per profile with its account', () => {
  const table = buildRecentProfilesTable([
    { addr: ALICE, name: 'alice', profilePicUrl: 'https://example.com/alice.png' },
    { addr: DAVE, name: null, profilePicUrl: 'https://example.com/dave.png' }
  ])

  assert.deepEqual(table.headers, RECENT_PROFILES_TABLE_HEADERS)
  assert.equal(table.rows.length, 2)
  assert.equal(table.rows[0].addr, ALICE)
  assert.equal(table.rows[0].account.displayName, 'alice')
  assert.equal(table.rows[1].account.displayName, 'bitcoincas...py26r63g3d')
})

test('buildRecentProfileFollow shows Follow when the viewer does not follow', () => {
  const follow = buildRecentProfileFollow({ addr: ALICE }, { myAddr: DAVE, following: false })

  assert.equal(follow.addr, ALICE)
  assert.equal(follow.label, 'Follow')
  assert.equal(follow.disabled, false)
})

test('buildRecentProfileFollow shows Unfollow when the viewer follows', () => {
  const follow = buildRecentProfileFollow({ addr: ALICE }, { myAddr: DAVE, following: true })

  assert.equal(follow.label, 'Unfollow')
})

test('buildRecentProfileFollow shows a disabled Follow button on the viewer own row', () => {
  const follow = buildRecentProfileFollow({ addr: DAVE }, { myAddr: DAVE, following: false })

  assert.equal(follow.label, 'Follow')
  assert.equal(follow.disabled, true)
})

test('buildRecentProfilesTable carries each row follow button from the page state', () => {
  const table = buildRecentProfilesTable(
    [{ addr: ALICE }, { addr: DAVE }],
    { myAddr: DAVE, followingByAddr: { [ALICE]: true } }
  )

  assert.equal(table.rows[0].follow.label, 'Unfollow')
  assert.equal(table.rows[0].follow.disabled, false)
  assert.equal(table.rows[1].follow.label, 'Follow')
  assert.equal(table.rows[1].follow.disabled, true)
})
