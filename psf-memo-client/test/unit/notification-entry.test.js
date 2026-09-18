/*
  Unit tests for the notification entry view model.

  Each Notifications entry names its actor with the actor's Memo display name
  and avatar, resolved client-side from the name and profile-picture records.
  These tests pin the pure view-model behavior independent of the React shell.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  PROFILE_PATH_PREFIX,
  VIEW_POST_LABEL,
  profilePath,
  displayName,
  notificationMessage,
  buildNotificationEntry
} = require('../../src/services/notification-entry')

const ALICE = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const BOB = 'bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r'

test('profilePath encodes the address for the profile route', () => {
  assert.equal(profilePath(ALICE), `${PROFILE_PATH_PREFIX}/${encodeURIComponent(ALICE)}`)
  assert.equal(profilePath(ALICE), '/profile/bitcoincash%3Aqr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy')
})

test('displayName prefers the profile display name', () => {
  assert.equal(displayName(ALICE, { name: 'alice' }), 'alice')
})

test('displayName falls back to the truncated address without a name', () => {
  assert.equal(displayName(ALICE, null), 'bitcoincas...4y0qverfuy')
  assert.equal(displayName(BOB, { name: null }), 'bitcoincas...zqre909m2r')
  assert.equal(displayName(BOB, {}), 'bitcoincas...zqre909m2r')
})

test('buildNotificationEntry carries the actor display name and profile path', () => {
  const notification = { type: 'like', txid: 'a'.repeat(64), addr: ALICE, postTxid: 'b'.repeat(64) }
  const entry = buildNotificationEntry(notification, { name: 'alice', profilePicUrl: 'https://example.com/alice.png' })

  assert.equal(entry.addr, ALICE)
  assert.equal(entry.displayName, 'alice')
  assert.equal(entry.avatarUrl, 'https://example.com/alice.png')
  assert.equal(entry.profilePath, `/profile/${encodeURIComponent(ALICE)}`)
  assert.equal(entry.postTxid, 'b'.repeat(64))
})

test('buildNotificationEntry falls back to the truncated address without a profile', () => {
  const notification = { type: 'follow', txid: 'c'.repeat(64), addr: BOB }
  const entry = buildNotificationEntry(notification, null)

  assert.equal(entry.displayName, 'bitcoincas...zqre909m2r')
  assert.equal(entry.avatarUrl, null)
})

test('buildNotificationEntry offers a View Post link for like and reply notifications', () => {
  for (const type of ['like', 'reply']) {
    const entry = buildNotificationEntry({ type, txid: 'd'.repeat(64), addr: ALICE, postTxid: 'e'.repeat(64) }, null)
    assert.equal(entry.showViewPost, true)
  }
})

test('buildNotificationEntry does not offer a View Post link for follow notifications', () => {
  const entry = buildNotificationEntry({ type: 'follow', txid: 'f'.repeat(64), addr: ALICE }, null)
  assert.equal(entry.showViewPost, false)
})

test('exposes the View Post label', () => {
  assert.equal(VIEW_POST_LABEL, 'View Post')
})

test('notificationMessage describes each notification type', () => {
  assert.equal(notificationMessage({ type: 'reply', text: 'nice post' }), 'replied to your post: nice post')
  assert.equal(notificationMessage({ type: 'like' }), 'liked your post')
  assert.equal(notificationMessage({ type: 'follow' }), 'followed you')
  assert.equal(notificationMessage({ type: 'unknown' }), '')
})
