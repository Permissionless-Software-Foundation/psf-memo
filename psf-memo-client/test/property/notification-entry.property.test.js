/*
  Property tests for the notification entry view model.

  The unit tests probe fixed fixtures. These properties pin the view-model
  contract over broad random inputs so it holds everywhere:

    - Profile link round trip: profilePath percent-encodes the address and
      decodes back to it.
    - Name fallback: displayName is the profile name when present, and the
      truncated address otherwise.
    - Derivation: buildNotificationEntry preserves every notification field
      and derives the avatar, link, View Post flag, display name, and message
      from the notification and resolved profile.
    - Message mapping: notificationMessage describes exactly the reply, like,
      follow, and unknown types.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const {
  PROFILE_PATH_PREFIX,
  VIEW_POST_TYPES,
  profilePath,
  displayName,
  notificationMessage,
  buildNotificationEntry
} = require('../../src/services/notification-entry')
const { truncateAddr } = require('../../src/util')

const rng = seededRandom(20260918)

const TYPES = ['like', 'reply', 'follow', 'mention', '', 'unknown']
const ADDR_CHARS = 'abcXYZ0123456789:qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const NAMES = ['alice', 'bob', 'Zoë', ' spaced ', '0', '']

// An address-shaped string that exercises encoding without using characters
// that encodeURIComponent leaves ambiguous (such as '%').
function randomAddr () {
  const length = intGen(rng, 1, 60)()
  let addr = ''
  for (let i = 0; i < length; i++) {
    addr += ADDR_CHARS[Math.floor(rng() * ADDR_CHARS.length)]
  }
  return addr
}

// A profile with optional name and picture, or null for "not resolved".
function randomProfile () {
  if (rng() < 0.2) return null
  const profile = {}
  if (rng() < 0.8) profile.name = NAMES[Math.floor(rng() * NAMES.length)]
  if (rng() < 0.8) profile.profilePicUrl = `https://example.com/${intGen(rng, 0, 999)()}.png`
  return profile
}

function randomNotification () {
  const notification = {
    type: TYPES[Math.floor(rng() * TYPES.length)],
    txid: `tx-${intGen(rng, 0, 999)()}`,
    addr: randomAddr()
  }
  if (rng() < 0.7) notification.postTxid = `post-${intGen(rng, 0, 999)()}`
  if (rng() < 0.7) notification.text = `text ${intGen(rng, 0, 999)()}`
  return notification
}

test('profilePath percent-encodes the address and round-trips it', async () => {
  await forAll(
    randomAddr,
    (addr) => {
      const path = profilePath(addr)
      return path.startsWith(`${PROFILE_PATH_PREFIX}/`) &&
        decodeURIComponent(path.slice(PROFILE_PATH_PREFIX.length + 1)) === addr
    },
    { label: 'notification entry profile path round trip' }
  )
})

test('displayName prefers a non-empty profile name and truncates otherwise', async () => {
  await forAll(
    () => ({ addr: randomAddr(), profile: randomProfile() }),
    ({ addr, profile }) => {
      const expected = profile?.name || truncateAddr(addr, 24)
      return displayName(addr, profile) === expected
    },
    { label: 'notification entry display name fallback' }
  )
})

test('buildNotificationEntry preserves the notification and derives the view fields', async () => {
  await forAll(
    () => ({ notification: randomNotification(), profile: randomProfile() }),
    ({ notification, profile }) => {
      const entry = buildNotificationEntry(notification, profile)
      return entry.type === notification.type &&
        entry.txid === notification.txid &&
        entry.addr === notification.addr &&
        entry.postTxid === notification.postTxid &&
        entry.text === notification.text &&
        entry.displayName === (profile?.name || truncateAddr(notification.addr, 24)) &&
        entry.avatarUrl === (profile?.profilePicUrl || null) &&
        entry.profilePath === `${PROFILE_PATH_PREFIX}/${encodeURIComponent(notification.addr)}` &&
        entry.showViewPost === VIEW_POST_TYPES.includes(notification.type) &&
        entry.message === notificationMessage(notification)
    },
    { label: 'notification entry view-model derivation' }
  )
})

test('notificationMessage describes exactly the reply, like, follow, and unknown types', async () => {
  await forAll(
    randomNotification,
    (notification) => {
      const message = notificationMessage(notification)
      if (notification.type === 'reply') {
        return message === `replied to your post: ${notification.text || ''}`
      }
      if (notification.type === 'like') return message === 'liked your post'
      if (notification.type === 'follow') return message === 'followed you'
      return message === ''
    },
    { label: 'notification entry message mapping' }
  )
})
