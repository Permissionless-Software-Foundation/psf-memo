/*
  Shared Gherkin result assertions for read commands.

  `runReadCommand` records the parsed stdout under a generic `world.readJson` in
  addition to the feature's prefixed field, so a step shape shared by several
  read features can assert against it without knowing which feature ran.
*/

// Local libraries
import { assertEqual, resolveParam } from '../step-support.js'

// Assert a reported list's named field values, joined by ", ", match the
// expected value.
export function assertReportedField (items, field, expected, label) {
  const actual = (items || []).map((item) => item[field]).join(', ')
  assertEqual(actual, expected, label, { quote: true })
}

// Assert a reported list's txids, joined by ", ", match the expected value.
export function assertReportedTxids (items, expected, label) {
  assertReportedField(items, 'txid', expected, label)
}

// Find an item in a reported list by a field value, throwing when it is absent.
export function findReportedItem (items, field, value, label) {
  const item = (items || []).find((entry) => entry[field] === value)
  if (!item) {
    throw new Error(`Expected ${label} with ${field} ${value}`)
  }
  return item
}

// Find a reported post in the generic read result, throwing when it is absent.
export function findReportedPost (world, txid) {
  return findReportedItem(world.readJson?.posts, 'txid', txid, 'a reported post')
}

// Assert a reported list of plain address strings, joined by ", ", match the
// expected value.
export function assertReportedAddresses (addresses, expected, label) {
  assertEqual((addresses || []).join(', '), expected, label, { quote: true })
}

// Assert the last request hit `path` with the given limit and offset.
export function assertPageRequest (world, path, limit, offset) {
  assertEqual(world.lastRequest?.pathname, path, 'request path')
  assertEqual(world.lastRequest?.searchParams.get('limit'), limit, 'limit')
  assertEqual(world.lastRequest?.searchParams.get('offset'), offset, 'offset')
}

// Assert the last request hit an address-scoped /posts route with the page.
// The client percent-encodes the address into the path, so compare the
// encoded form (a colon in a cash address becomes %3A).
function assertAddressPageRequest (world, path, { addr, limit, offset }) {
  assertPageRequest(world, `/posts/${path}/${encodeURIComponent(addr)}`, limit, offset)
}

// Assert selected fields on the generic read result's pagination object. Only
// the named fields are checked, so a step can pin total/hasMore alone or the
// full limit/offset/total/hasMore set.
export function assertPagination (world, expected) {
  const pagination = world.readJson?.pagination || {}
  for (const [field, value] of Object.entries(expected)) {
    assertEqual(pagination[field], value, `pagination ${field}`)
  }
}

const readResultHandlers = [
  {
    name: 'command reported pagination',
    pattern: /^the command reported pagination total (.+) and hasMore (.+)$/,
    run (m, example, world) {
      assertPagination(world, {
        total: Number.parseInt(resolveParam(m[1], example), 10),
        hasMore: resolveParam(m[2], example) === 'true'
      })
    }
  },
  {
    name: 'command reported full pagination',
    pattern: /^the command reported pagination limit (.+), offset (.+), total (.+), and hasMore (.+)$/,
    run (m, example, world) {
      assertPagination(world, {
        limit: Number.parseInt(resolveParam(m[1], example), 10),
        offset: Number.parseInt(resolveParam(m[2], example), 10),
        total: Number.parseInt(resolveParam(m[3], example), 10),
        hasMore: resolveParam(m[4], example) === 'true'
      })
    }
  },
  {
    name: 'command reported the post txids',
    pattern: /^the command reported the post txids "(.+)"$/,
    run (m, example, world) {
      assertReportedTxids(world.readJson?.posts, resolveParam(m[1], example), 'post txids')
    }
  },
  {
    name: 'command reported a post count',
    pattern: /^the command reported (.+) posts$/,
    run (m, example, world) {
      assertEqual((world.readJson?.posts || []).length, Number.parseInt(resolveParam(m[1], example), 10), 'post count')
    }
  },
  {
    name: 'service received an address-posts request',
    pattern: /^the service received an? (notifications|address-posts) request for "([^"]+)" with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      assertAddressPageRequest(world, m[1] === 'notifications' ? 'notifications' : 'by', {
        addr: resolveParam(m[2], example),
        limit: resolveParam(m[3], example),
        offset: resolveParam(m[4], example)
      })
    }
  },
  {
    name: 'command reported the profile addresses',
    pattern: /^the command reported the profile addresses "(.+)"$/,
    run (m, example, world) {
      assertReportedField(world.readJson?.profiles, 'addr', resolveParam(m[1], example), 'profile addresses')
    }
  },
  {
    name: 'command reported no profiles',
    pattern: /^the command reported 0 profiles$/,
    run (m, example, world) {
      assertEqual((world.readJson?.profiles || []).length, 0, 'profile count')
    }
  }
]

export { readResultHandlers }
