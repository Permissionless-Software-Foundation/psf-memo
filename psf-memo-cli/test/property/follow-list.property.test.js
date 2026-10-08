/*
  Property tests for the follow-list helpers shared by memo-following and
  memo-followers.

  These exercise broad input ranges to confirm:

    - the following wallet source passes through as name/wif or null.
    - the required followee -a address resolves, and every missing value is a
      UsageError with the documented message.
    - the summary counts and orders the address list and singularizes a
      one-address list.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, randomAddress, randomAddresses } from './harness.js'
import {
  parseFollowingFlags,
  parseFollowersFlags,
  formatFollowListMessage,
  MISSING_FOLLOWEE_MESSAGE
} from '../../src/lib/follow-list.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261101)

test('parseFollowingFlags passes through the wallet source or nulls it', () => {
  for (let i = 0; i < 400; i++) {
    const name = rng() < 0.5 ? randomAddress(rng, 'wallet', i) : null
    const wif = rng() < 0.5 ? randomAddress(rng, 'wif', i) : null

    const flags = parseFollowingFlags({ name, wif })

    assert.equal(flags.name, name || null)
    assert.equal(flags.wif, wif || null)
  }

  for (const value of [undefined, null, '']) {
    assert.deepEqual(parseFollowingFlags({ name: value, wif: value }), { name: null, wif: null })
  }
})

test('parseFollowersFlags resolves the address and rejects every missing value', () => {
  for (let i = 0; i < 300; i++) {
    const addr = randomAddress(rng, 'addr', i)
    assert.deepEqual(parseFollowersFlags({ addr }), { address: addr })
  }

  for (const value of [undefined, null, '']) {
    assert.throws(
      () => parseFollowersFlags({ addr: value }),
      (err) => err instanceof UsageError && err.message === MISSING_FOLLOWEE_MESSAGE
    )
  }
})

test('formatFollowListMessage counts, orders, and pluralizes the address list', () => {
  for (let i = 0; i < 400; i++) {
    const addresses = randomAddresses(rng, { maxItems: 12 })
    const label = rng() < 0.5 ? 'following' : 'follower'
    const message = formatFollowListMessage(addresses, label)

    const noun = addresses.length === 1 ? 'address' : 'addresses'
    assert.equal(message.split('\n')[0], `Read ${addresses.length} ${label} ${noun}`)

    let cursor = -1
    for (const address of addresses) {
      const at = message.indexOf(address)
      assert.ok(at > cursor, `${address} should appear after the previous address`)
      cursor = at
    }
  }
})
