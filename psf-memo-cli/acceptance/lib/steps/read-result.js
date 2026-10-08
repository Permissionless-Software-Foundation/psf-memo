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

// Assert the last request hit an address-scoped /posts route with the page.
function assertAddressPageRequest (world, path, { addr, limit, offset }) {
  assertEqual(world.lastRequest?.pathname, `/posts/${path}/${addr}`, 'request path')
  assertEqual(world.lastRequest?.searchParams.get('limit'), limit, 'limit')
  assertEqual(world.lastRequest?.searchParams.get('offset'), offset, 'offset')
}

const readResultHandlers = [
  {
    name: 'command reported pagination',
    pattern: /^the command reported pagination total (.+) and hasMore (.+)$/,
    run (m, example, world) {
      const pagination = world.readJson?.pagination || {}
      assertEqual(pagination.total, Number.parseInt(resolveParam(m[1], example), 10), 'pagination total')
      assertEqual(pagination.hasMore, resolveParam(m[2], example) === 'true', 'pagination hasMore')
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
  }
]

export { readResultHandlers }
