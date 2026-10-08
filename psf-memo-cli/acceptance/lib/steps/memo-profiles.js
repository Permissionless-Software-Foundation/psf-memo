/*
  Gherkin step handlers for the Memo Profiles feature.

  The scenario world serves the recent-profiles list through the same fake fetch
  used by the Memo DB client handlers, and each scenario runs the real
  memo-profiles command in JSON mode so the reported profiles and pagination can
  be asserted from the captured stdout. The address-list, profile-count,
  pagination, and error assertions are shared with the other read features.
*/

// Local libraries
import MemoProfiles from '../../../src/commands/memo-profiles.js'
import { runReadCommand, assertReadCommandError } from '../read-command.js'
import { findReportedItem } from './read-result.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Five recent profiles in the service's order (most recent qualifying post
// first). addrB has no name record; addrC has no picture record.
const RECENT_PROFILES = [
  { addr: 'addrA', text: 'alice bio', name: 'alice', profilePicUrl: 'https://example.com/alice.png', txid: 'txA', blockHeight: 600300, seen: 300 },
  { addr: 'addrB', text: 'bob bio', name: null, profilePicUrl: 'https://example.com/bob.jpg', txid: 'txB', blockHeight: 600250, seen: 250 },
  { addr: 'addrC', text: 'carol bio', name: 'carol', profilePicUrl: null, txid: 'txC', blockHeight: 600200, seen: 400 },
  { addr: 'addrD', text: 'dave bio', name: 'dave', profilePicUrl: 'https://example.com/dave.png', txid: 'txD', blockHeight: 600100, seen: 100 },
  { addr: 'addrE', text: 'erin bio', name: 'erin', profilePicUrl: 'https://example.com/erin.png', txid: 'txE', blockHeight: 600050, seen: 50 }
]

async function runProfiles (world, flags) {
  await runReadCommand(world, MemoProfiles, 'profiles', flags)
}

// An empty Gherkin example cell means "no value"; the service (and the CLI)
// report a missing identity field as null, so map the empty expectation to null.
function emptyToNull (value) {
  return value === '' ? null : value
}

const memoProfilesHandlers = [
  {
    name: 'service serves the recent profiles list',
    pattern: /^the Memo DB service serves the recent profiles list$/,
    run (m, example, world) {
      world.recentProfiles = RECENT_PROFILES.map((profile) => ({ ...profile }))
    }
  },
  {
    name: 'recent profiles list is empty',
    pattern: /^the recent profiles list is empty$/,
    run (m, example, world) {
      world.recentProfiles = []
    }
  },
  {
    name: 'recent-profiles request fails',
    pattern: /^the recent-profiles request fails$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'memo-profiles command runs',
    pattern: /^the memo-profiles command runs$/,
    async run (m, example, world) {
      await runProfiles(world, {})
    }
  },
  {
    name: 'memo-profiles command runs with a page',
    pattern: /^the memo-profiles command runs with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      await runProfiles(world, {
        limit: resolveParam(m[1], example),
        offset: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'service received a recent-profiles request',
    pattern: /^the service received a recent-profiles request with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      assertEqual(world.lastRequest?.pathname, '/profile/recent', 'request path')
      assertEqual(world.lastRequest?.searchParams.get('limit'), resolveParam(m[1], example), 'limit')
      assertEqual(world.lastRequest?.searchParams.get('offset'), resolveParam(m[2], example), 'offset')
    }
  },
  {
    name: 'command reported a profile with its name and avatar',
    pattern: /^the command reported the profile "([^"]+)" with name "([^"]*)" and avatar "([^"]*)"$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const profile = findReportedItem(world.readJson?.profiles, 'addr', addr, 'a reported profile')
      assertEqual(profile.name ?? null, emptyToNull(resolveParam(m[2], example)), 'profile name', { quote: true })
      assertEqual(profile.profilePicUrl ?? null, emptyToNull(resolveParam(m[3], example)), 'profile avatar', { quote: true })
    }
  },
  {
    name: 'command reported a profile with its bio and recency',
    pattern: /^the command reported the profile "([^"]+)" with bio "([^"]*)", block height (.+), and seen (.+)$/,
    run (m, example, world) {
      const addr = resolveParam(m[1], example)
      const profile = findReportedItem(world.readJson?.profiles, 'addr', addr, 'a reported profile')
      assertEqual(profile.text, resolveParam(m[2], example), 'profile bio', { quote: true })
      assertEqual(profile.blockHeight, Number.parseInt(resolveParam(m[3], example), 10), 'block height')
      assertEqual(profile.seen, Number.parseInt(resolveParam(m[4], example), 10), 'seen')
    }
  },
  {
    name: 'memo-profiles command reported an error',
    pattern: /^the memo-profiles command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'profiles', 'memo-profiles')
    }
  }
]

export { memoProfilesHandlers }
