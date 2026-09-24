/*
  Property tests for the shared token mutable-data resolution.

  The unit tests pin the resolution at fixed fixtures. These properties
  exercise it over broad random mutable-data values and wallet shapes:

    - parse: parseMutableDataCid strips an ipfs:// prefix (round trip) and
      passes any other string through unchanged, and is null for non-strings.
    - precedence: tokenIconFromMutableData always chooses an http fullSizedUrl
      over a tokenIcon and falls back to the tokenIcon, else null.
    - identity: an already-resolved record is returned as-is without a wallet
      lookup.
    - resolve: an ipfs:// value is resolved through cid2json with the parsed
      CID, and every unresolvable shape returns null without throwing.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll } = require('./harness')
const { randomString } = require('../support/random')
const {
  IPFS_PREFIX,
  parseMutableDataCid,
  tokenIconFromMutableData,
  resolveTokenMutableData
} = require('../../src/services/token-mutable-data')

const rng = seededRandom(20260924)
const TOKEN_ID = '1'.repeat(64)
const CID_CHARS = Array.from('abcdefghijklmnopqrstuvwxyz0123456789')

function randomCid () {
  return randomString(rng, CID_CHARS, 1, 64)
}

function randomUrl () {
  const slug = randomString(rng, CID_CHARS, 1, 8)
  const kind = rng()
  if (kind < 0.4) return `https://example.com/${slug}.png`
  if (kind < 0.6) return `http://example.com/${slug}.png`
  if (kind < 0.8) return `${IPFS_PREFIX}${slug}`
  return slug
}

function randomRecord () {
  const record = {}
  if (rng() < 0.8) record.tokenIcon = randomUrl()
  if (rng() < 0.8) record.fullSizedUrl = randomUrl()
  return record
}

// Independent restatement of the expected icon precedence.
function expectedIcon (record) {
  if (!record || typeof record !== 'object') return null
  if (typeof record.fullSizedUrl === 'string' && record.fullSizedUrl.includes('http')) {
    return record.fullSizedUrl
  }
  return record.tokenIcon || null
}

test('parseMutableDataCid round-trips an ipfs:// URI and passes text through', async () => {
  await forAll(
    () => randomCid(),
    (cid) => {
      return parseMutableDataCid(cid) === cid &&
        parseMutableDataCid(`${IPFS_PREFIX}${cid}`) === cid
    },
    { label: 'token mutable data cid parse', samples: 1000 }
  )
})

test('parseMutableDataCid is null for every non-string value', async () => {
  await forAll(
    () => [null, undefined, 0, 42, true, false, {}, [], () => {}][Math.floor(rng() * 9)],
    (value) => parseMutableDataCid(value) === null,
    { label: 'token mutable data non-string cid', samples: 400 }
  )
})

test('tokenIconFromMutableData honours the http fullSizedUrl then tokenIcon precedence', async () => {
  await forAll(
    () => randomRecord(),
    (record) => tokenIconFromMutableData(record) === expectedIcon(record),
    { label: 'token mutable data icon precedence', samples: 1000 }
  )
})

test('an already-resolved record is returned as-is without a wallet lookup', async () => {
  await forAll(
    () => randomRecord(),
    async (record) => {
      let queried = 0
      const wallet = {
        async getTokenData () {
          return { mutableData: record }
        },
        async cid2json () {
          queried++
          return { json: {} }
        }
      }

      const resolved = await resolveTokenMutableData(wallet, TOKEN_ID)
      return resolved === record && queried === 0
    },
    { label: 'token mutable data identity', samples: 600 }
  )
})

test('an ipfs:// value is resolved through cid2json with the parsed CID', async () => {
  await forAll(
    () => ({ cid: randomCid(), record: randomRecord() }),
    async ({ cid, record }) => {
      const cids = []
      const wallet = {
        async getTokenData () {
          return { mutableData: `${IPFS_PREFIX}${cid}` }
        },
        async cid2json ({ cid: resolvedCid }) {
          cids.push(resolvedCid)
          return { json: record }
        }
      }

      const resolved = await resolveTokenMutableData(wallet, TOKEN_ID)
      return cids.length === 1 &&
        cids[0] === cid &&
        JSON.stringify(resolved) === JSON.stringify(record)
    },
    { label: 'token mutable data ipfs resolve', samples: 800 }
  )
})

test('every unresolvable mutable-data shape returns null without throwing', async () => {
  await forAll(
    () => randomCid(),
    async (cid) => {
      const noMutableData = {
        async getTokenData () {
          return { mutableData: null }
        }
      }
      const noCid2json = {
        async getTokenData () {
          return { mutableData: `${IPFS_PREFIX}${cid}` }
        }
      }
      const emptyJson = {
        async getTokenData () {
          return { mutableData: `${IPFS_PREFIX}${cid}` }
        },
        async cid2json () {
          return {}
        }
      }
      const nullJson = {
        async getTokenData () {
          return { mutableData: `${IPFS_PREFIX}${cid}` }
        },
        async cid2json () {
          return null
        }
      }

      return (await resolveTokenMutableData(noMutableData, TOKEN_ID)) === null &&
        (await resolveTokenMutableData(noCid2json, TOKEN_ID)) === null &&
        (await resolveTokenMutableData(emptyJson, TOKEN_ID)) === null &&
        (await resolveTokenMutableData(nullJson, TOKEN_ID)) === null
    },
    { label: 'token mutable data unresolvable', samples: 500 }
  )
})

test('an ipfs:// value with no CID returns null without querying the gateway', async () => {
  await forAll(
    () => randomCid(),
    async () => {
      let queried = 0
      const wallet = {
        async getTokenData () {
          return { mutableData: IPFS_PREFIX }
        },
        async cid2json () {
          queried++
          return { json: { tokenIcon: 'https://example.com/a.png' } }
        }
      }

      return (await resolveTokenMutableData(wallet, TOKEN_ID)) === null && queried === 0
    },
    { label: 'token mutable data empty cid', samples: 300 }
  )
})
