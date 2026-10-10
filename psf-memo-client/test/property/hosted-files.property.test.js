/*
  Property tests for the hosted-files dashboard.

  The unit tests probe the formatters and the page controller at fixed
  fixtures. These properties pin their contracts over broad random inputs:

    - formatSize: a byte count below 1,000 renders as whole bytes; one below
      1,000,000 renders as two-decimal KB; a larger count renders as
      two-decimal MB; a non-finite count renders empty.
    - formatDate: a parseable timestamp renders as the UTC
      "YYYY-MM-DD HH:MM UTC" minute form; an unparseable value renders empty.
    - truncateCid: a CID of at most sixteen characters is unchanged; a longer
      CID is its first and last eight characters joined by "...".
    - feed mapping: load maps every feed record in order, keeps the public
      fields, and builds the download and view URLs.
    - paging: loadMore appends exactly the next page and follows its cursor,
      and is a no-op without a cursor.
    - single source: the view and the page service share one empty message.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { seededRandom, forAll, intGen, randomFrom } = require('./harness')
const DashboardPage = require('../../src/services/dashboard-page')
const DashboardView = require('../../src/components/app-body/dashboard/dashboard-view')
const { formatSize, formatDate, truncateCid } = DashboardView

const rng = seededRandom(20261010)
const CID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const BASE = 'https://file-hosting-api.blippost.com'

function randomCid () {
  return 'bafy' + randomFrom(rng, CID_CHARS, 1, 60)
}

function randomFeedFile () {
  return {
    status: 'pinned',
    cid: randomCid(),
    filename: randomFrom(rng, 'abcXYZ0123._-', 1, 12) + '.bin',
    sizeBytes: intGen(rng, 0, 5000000)(),
    paidAt: new Date(intGen(rng, 0, 4000000000000)()).toISOString(),
    hostedUntil: new Date(intGen(rng, 4000000000000, 8000000000000)()).toISOString(),
    paymentAddress: 'bitcoincash:q' + randomFrom(rng, CID_CHARS, 5, 20),
    gatewayUrls: rng() < 0.5 ? ['https://ipfs.io/ipfs/' + randomCid()] : [],
    pins: []
  }
}

test('formatSize renders bytes, KB, and MB by magnitude', async () => {
  await forAll(
    () => intGen(rng, 0, 5000000)(),
    (bytes) => {
      const expected = bytes < 1000
        ? `${bytes} bytes`
        : bytes < 1000000
          ? `${(bytes / 1000).toFixed(2)} KB`
          : `${(bytes / 1000000).toFixed(2)} MB`
      return formatSize(bytes) === expected
    },
    { label: 'dashboard formatSize magnitude' }
  )
})

test('formatSize renders empty for a non-finite byte count', async () => {
  await forAll(
    (i) => [NaN, Infinity, -Infinity, undefined, 'nope'][i % 5],
    (value) => formatSize(value) === '',
    { label: 'dashboard formatSize non-finite' }
  )
})

test('formatDate renders a parseable timestamp as its UTC minute stamp', async () => {
  await forAll(
    () => intGen(rng, 0, 4102444800000)(),
    (ms) => {
      const expected = new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
      return formatDate(ms) === expected
    },
    { label: 'dashboard formatDate utc' }
  )
})

test('formatDate renders empty for an unparseable value', async () => {
  await forAll(
    (i) => ['not a date', '', 'nope', undefined, {}][i % 5],
    (value) => formatDate(value) === '',
    { label: 'dashboard formatDate invalid' }
  )
})

test('truncateCid leaves a short CID and trims a long one to eight plus eight', async () => {
  await forAll(
    () => randomFrom(rng, CID_CHARS, 0, 40),
    (cid) => cid.length <= 16
      ? truncateCid(cid) === cid
      : truncateCid(cid) === `${cid.slice(0, 8)}...${cid.slice(-8)}`,
    { label: 'dashboard truncateCid' }
  )
})

test('load maps every feed record in order and builds its download and view URLs', async () => {
  await forAll(
    () => {
      const count = intGen(rng, 0, 6)()
      const files = []
      for (let i = 0; i < count; i++) files.push(randomFeedFile())
      return files
    },
    async (files) => {
      const api = { getFeed: async () => ({ files, nextCursor: null }) }
      const page = new DashboardPage({ hostingApi: api, downloadBaseUrl: `${BASE}/` })
      const state = await page.load()
      if (state.status !== 'loaded' || state.files.length !== files.length) return false
      return state.files.every((mapped, i) => {
        const source = files[i]
        return mapped.cid === source.cid &&
          mapped.filename === source.filename &&
          mapped.sizeBytes === source.sizeBytes &&
          mapped.paidAt === source.paidAt &&
          mapped.hostedUntil === source.hostedUntil &&
          mapped.downloadUrl === `${BASE}/download/${source.cid}` &&
          mapped.viewUrl === ((source.gatewayUrls || [])[0] || '')
      })
    },
    { label: 'dashboard load mapping' }
  )
})

test('loadMore appends the next page in order and follows the cursor', async () => {
  await forAll(
    () => {
      const first = [randomFeedFile(), randomFeedFile()]
      const second = [randomFeedFile()]
      const cursor = 'c-' + randomFrom(rng, 'abcdef', 1, 6)
      return { first, second, cursor }
    },
    async ({ first, second, cursor }) => {
      const calls = []
      let call = 0
      const api = {
        getFeed: async (params) => {
          calls.push(params)
          call++
          return call === 1
            ? { files: first, nextCursor: cursor }
            : { files: second, nextCursor: null }
        }
      }
      const page = new DashboardPage({ hostingApi: api, downloadBaseUrl: BASE })
      await page.load()
      const state = await page.loadMore()
      const expected = [...first, ...second].map((f) => f.cid)
      return JSON.stringify(state.files.map((f) => f.cid)) === JSON.stringify(expected) &&
        state.hasMore === false &&
        JSON.stringify(calls[1]) === JSON.stringify({ limit: DashboardPage.DEFAULT_PAGE_SIZE, cursor })
    },
    { label: 'dashboard loadMore paging' }
  )
})

test('loadMore is a no-op when the feed has no next page', async () => {
  await forAll(
    () => intGen(rng, 0, 4)(),
    async (count) => {
      const files = []
      for (let i = 0; i < count; i++) files.push(randomFeedFile())
      let calls = 0
      const api = { getFeed: async () => { calls++; return { files, nextCursor: null } } }
      const page = new DashboardPage({ hostingApi: api, downloadBaseUrl: BASE })
      await page.load()
      const before = calls
      const state = await page.loadMore()
      return calls === before && state.files.length === files.length
    },
    { label: 'dashboard loadMore no cursor' }
  )
})

test('the view and the page service share one empty message', () => {
  assert.equal(DashboardView.EMPTY_MESSAGE, DashboardPage.EMPTY_MESSAGE)
})
