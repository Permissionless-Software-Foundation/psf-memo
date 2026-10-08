/*
  Property tests for the memo-profiles read-command helpers and wiring.

  These exercise broad input ranges to confirm:

    - the page flags parse as non-negative integers with the documented
      defaults, and any non-integer is a UsageError naming the exact flag.
    - the summary lists every profile's identity and recency fields and falls
      back to "(unset)" for a missing name or avatar.
    - JSON mode reports the service page verbatim, including null identity
      fields.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, intGen } from './harness.js'
import MemoProfiles from '../../src/commands/memo-profiles.js'
import { captureStream } from '../support/capture.js'
import {
  DEFAULT_PROFILES_LIMIT,
  DEFAULT_PROFILES_OFFSET,
  parseProfilesFlags,
  formatProfilesMessage
} from '../../src/lib/memo-profiles.js'
import { UsageError } from '../../src/lib/reporter.js'

const rng = seededRandom(20261031)
const FLAG_MAX = 1000000
const randomLimit = intGen(rng, 0, FLAG_MAX)
const randomOffset = intGen(rng, 0, FLAG_MAX)

function randomProfile (index) {
  return {
    addr: `addr-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    text: `bio ${index}`,
    name: rng() < 0.5 ? `name ${index}` : null,
    profilePicUrl: rng() < 0.5 ? `https://example.com/${index}.png` : null,
    txid: `tx-${index}-${Math.floor(rng() * 1e9).toString(16)}`,
    blockHeight: Math.floor(rng() * 1e9),
    seen: Math.floor(rng() * 1e9)
  }
}

function randomPage (maxItems = 8) {
  const count = Math.floor(rng() * (maxItems + 1))
  const profiles = []
  for (let i = 0; i < count; i++) profiles.push(randomProfile(i))
  return {
    profiles,
    pagination: {
      limit: randomLimit(),
      offset: randomOffset(),
      total: Math.floor(rng() * FLAG_MAX),
      hasMore: rng() < 0.5
    }
  }
}

test('parseProfilesFlags parses the page with the documented defaults', () => {
  for (let i = 0; i < 400; i++) {
    const limit = randomLimit()
    const offset = randomOffset()

    const flags = parseProfilesFlags({ limit: String(limit), offset: String(offset) })
    assert.equal(flags.limit, limit)
    assert.equal(flags.offset, offset)
  }

  for (const value of [undefined, null, '']) {
    const flags = parseProfilesFlags({ limit: value, offset: value })
    assert.equal(flags.limit, DEFAULT_PROFILES_LIMIT)
    assert.equal(flags.offset, DEFAULT_PROFILES_OFFSET)
  }
})

test('parseProfilesFlags rejects bad page flags', () => {
  for (let i = 0; i < 300; i++) {
    const flag = rng() < 0.5 ? '--limit' : '--offset'
    const invalid = rng() < 0.5 ? String(-(1 + Math.floor(rng() * 100))) : `x${Math.floor(rng() * 100)}`

    assert.throws(
      () => parseProfilesFlags({ [flag.slice(2)]: invalid }),
      (err) => err instanceof UsageError && err.message.includes(flag)
    )
  }
})

test('formatProfilesMessage lists every profile and the pagination', () => {
  for (let i = 0; i < 300; i++) {
    const { profiles, pagination } = randomPage(6)
    const message = formatProfilesMessage(profiles, pagination)

    for (const profile of profiles) {
      assert.ok(message.includes(profile.addr))
      assert.ok(message.includes(profile.name || '(unset)'))
      assert.ok(message.includes(profile.profilePicUrl || '(unset)'))
      assert.ok(message.includes(`blockHeight ${profile.blockHeight}`))
      assert.ok(message.includes(`seen ${profile.seen}`))
    }
    assert.ok(message.includes(
      `pagination: limit ${pagination.limit}, offset ${pagination.offset}, total ${pagination.total}, hasMore ${pagination.hasMore}`
    ))
  }
})

test('memo-profiles JSON mode reports the service page verbatim', async () => {
  const originalExitCode = process.exitCode

  try {
    for (let i = 0; i < 120; i++) {
      const servicePage = randomPage(8)

      class FakeMemoDb {
        async getRecentProfiles () {
          return servicePage
        }
      }

      const out = captureStream()
      const command = new MemoProfiles({
        MemoDbClass: FakeMemoDb,
        envUrl: null,
        stdout: out.stream,
        stderr: captureStream().stream
      })

      const code = await command.run({ json: true })

      assert.equal(code, 0)
      assert.deepEqual(JSON.parse(out.text()), {
        message: formatProfilesMessage(servicePage.profiles, servicePage.pagination),
        ...servicePage
      })
    }
  } finally {
    process.exitCode = originalExitCode
  }
})
