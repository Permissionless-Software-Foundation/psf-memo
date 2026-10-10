/*
  Property tests for the /host upload and payment page service and the hosting
  API adapter.

  The unit tests probe the state machine and the request shapes at fixed
  fixtures. These properties pin their contracts over broad random inputs:

    - quote mapping: a quote response becomes the quote state with the API or
      local file name, the numeric price, the payment address, and the sizes
      exactly when the API reports them.
    - hosted mapping: an already-hosted response becomes the hosted state with
      its download URL.
    - error and no-file: a rejected upload carries the failure message, and a
      missing file carries the prompt.
    - confirmation: polling terminates paid on the first paid response within
      the window, and pending after exactly `maxConfirmations` unpaid polls.
    - feed query: getFeed includes limit and cursor exactly when supplied.
    - status encoding: getStatus encodes a CID as one path segment that
      decodes back unchanged.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { seededRandom, forAll, intGen, randomFrom } = require('./harness')
const FileUploadPage = require('../../src/services/file-upload-page')
const HostingApi = require('../../src/services/hosting-api')

const rng = seededRandom(20261010)
const BASE = 'https://file-hosting-api.blippost.com'

function fakeApi (response) {
  return { upload: async () => response }
}

test('a quote response maps to the quote state', async () => {
  await forAll(
    () => {
      const hasName = rng() < 0.5
      const hasSize = rng() < 0.5
      const hasBilled = rng() < 0.5
      return {
        response: {
          alreadyHosted: false,
          ...(hasName ? { filename: 'api-' + randomFrom(rng, 'abc', 1, 6) } : {}),
          priceSats: intGen(rng, 0, 10000000)(),
          paymentAddress: 'bitcoincash:q' + randomFrom(rng, 'abc', 3, 12),
          ...(hasSize ? { sizeBytes: intGen(rng, 0, 100000)() } : {}),
          ...(hasBilled ? { billedBytes: intGen(rng, 0, 100000)() } : {})
        },
        uploadName: 'local-' + randomFrom(rng, 'abc', 1, 6)
      }
    },
    async ({ response, uploadName }) => {
      const page = new FileUploadPage({ hostingApi: fakeApi(response) })
      const state = await page.upload({ name: uploadName })
      if (state.status !== 'quote') return false
      if (state.filename !== (response.filename || uploadName)) return false
      if (state.priceSats !== Number(response.priceSats)) return false
      if (state.paymentAddress !== response.paymentAddress) return false
      if (('sizeBytes' in state) !== ('sizeBytes' in response)) return false
      if (('billedBytes' in state) !== ('billedBytes' in response)) return false
      if ('sizeBytes' in response && state.sizeBytes !== Number(response.sizeBytes)) return false
      if ('billedBytes' in response && state.billedBytes !== Number(response.billedBytes)) return false
      return true
    },
    { label: 'host file quote mapping' }
  )
})

test('an already-hosted response maps to the hosted state with its URL', async () => {
  await forAll(
    () => {
      const url = 'https://file-hosting-api.blippost.com/download/' + randomFrom(rng, 'abcdef', 4, 20)
      return { url, uploadName: 'local-' + randomFrom(rng, 'abc', 1, 6) }
    },
    async ({ url, uploadName }) => {
      const page = new FileUploadPage({ hostingApi: fakeApi({ alreadyHosted: true, downloadUrl: url }) })
      const state = await page.upload({ name: uploadName })
      return state.status === 'hosted' && state.downloadUrl === url
    },
    { label: 'host file hosted mapping' }
  )
})

test('a rejected upload carries the failure message and the file name', async () => {
  await forAll(
    () => {
      const message = randomFrom(rng, 'abcdef  XYZ', 1, 30)
      const name = 'file-' + randomFrom(rng, 'abc', 1, 6)
      return { message, name }
    },
    async ({ message, name }) => {
      const page = new FileUploadPage({
        hostingApi: { upload: async () => { throw new Error(message) } }
      })
      const state = await page.upload({ name })
      return state.status === 'error' && state.message === message && state.filename === name
    },
    { label: 'host file upload error' }
  )
})

test('an upload with no file carries the prompt', async () => {
  const page = new FileUploadPage({ hostingApi: fakeApi({}) })
  const state = await page.upload(null)
  assert.equal(state.status, 'no-file')
  assert.equal(state.message, 'Choose a file to upload.')
})

test('waitForConfirmation terminates paid or pending within the window', async () => {
  await forAll(
    () => {
      const maxConfirmations = intGen(rng, 1, 8)()
      // -1 means the payment never becomes visible within the window.
      const paidAfter = rng() < 0.6 ? intGen(rng, 0, maxConfirmations - 1)() : -1
      return { maxConfirmations, paidAfter }
    },
    async ({ maxConfirmations, paidAfter }) => {
      let polls = 0
      const txid = 'tx-' + randomFrom(rng, '0123456789abcdef', 4, 8)
      const page = new FileUploadPage({
        hostingApi: {
          upload: async () => ({ alreadyHosted: false, priceSats: 1000, paymentAddress: 'bitcoincash:qquote' }),
          checkPayment: async () => {
            const index = polls++
            if (paidAfter >= 0 && index === paidAfter) {
              return { status: 'paid', cid: 'bafy-1', filename: 'f.bin', downloadUrl: 'u', gatewayUrls: [] }
            }
            return { status: 'unpaid' }
          }
        },
        wallet: { send: async () => txid },
        sleep: async () => {},
        maxConfirmations
      })
      await page.upload({ name: 'f.bin' })
      await page.payFromWallet()
      const state = await page.waitForConfirmation()
      return paidAfter >= 0
        ? state.status === 'paid' && state.txid === txid && polls === paidAfter + 1
        : state.status === 'pending' && polls === maxConfirmations
    },
    { label: 'host file confirmation window' }
  )
})

test('getFeed includes limit and cursor exactly when supplied', async () => {
  await forAll(
    (i) => {
      const values = [undefined, null, '', 0, 20, 'x']
      return { limit: values[i % values.length], cursor: values[(i * 3 + 1) % values.length] }
    },
    async ({ limit, cursor }) => {
      let url = ''
      const api = new HostingApi({
        config: { fileHostingUrl: BASE },
        fetch: async (u) => {
          url = u
          return { ok: true, status: 200, json: async () => ({}) }
        },
        FormData: class {}
      })
      await api.getFeed({ limit, cursor })
      const params = new URLSearchParams()
      if (limit !== undefined && limit !== null && limit !== '') params.set('limit', String(limit))
      if (cursor !== undefined && cursor !== null && cursor !== '') params.set('cursor', String(cursor))
      const query = params.toString()
      return url === `${BASE}/files${query ? `?${query}` : ''}`
    },
    { label: 'hosting feed query' }
  )
})

test('getStatus encodes a CID as one path segment that decodes back', async () => {
  await forAll(
    () => randomFrom(rng, 'ab/../../%?# xyz', 1, 20),
    async (cid) => {
      let url = ''
      const api = new HostingApi({
        config: { fileHostingUrl: BASE },
        fetch: async (u) => {
          url = u
          return { ok: true, status: 200, json: async () => ({}) }
        },
        FormData: class {}
      })
      await api.getStatus({ cid })
      const path = url.slice(`${BASE}/files/`.length)
      return !path.includes('/') && decodeURIComponent(path) === cid
    },
    { label: 'hosting status encoding' }
  )
})
