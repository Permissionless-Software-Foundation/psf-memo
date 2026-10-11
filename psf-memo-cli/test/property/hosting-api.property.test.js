/*
  Property tests for the bch-file-hosting REST adapter.

  Unit tests cover fixed requests. These properties exercise broad input ranges
  to confirm:

    - request fidelity: any upload POSTs multipart form data to
      `${base}/files` carrying the exact filename and bytes, any check-payment
      POSTs the address as JSON to `${base}/files/check-payment`, and any
      getStatus GETs the URL-encoded CID from `${base}/files/:cid`, all
      returning the parsed body unchanged.
    - error mapping: a non-2xx response surfaces the API's `error` string when
      present, otherwise a message naming the HTTP status, in every case as a
      HostingApiError.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import HostingApi, { HostingApiError } from '../../src/lib/hosting-api.js'

const rng = seededRandom(20261011)

const NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_'

function randomText (maxLength) {
  const length = 1 + Math.floor(rng() * maxLength)
  let text = ''
  for (let i = 0; i < length; i++) text += NAME_CHARS[Math.floor(rng() * NAME_CHARS.length)]
  return text
}

function randomBytes () {
  const length = Math.floor(rng() * 64)
  const bytes = Buffer.alloc(length)
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(rng() * 256)
  return bytes
}

function jsonResponse (body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

async function uploadAndCatch (api) {
  try {
    await api.upload({ filename: 'file.bin', buffer: Buffer.from('') })
    return undefined
  } catch (err) {
    return err
  }
}

async function checkPaymentAndCatch (api) {
  try {
    await api.checkPayment({ paymentAddress: 'bitcoincash:qcheck' })
    return undefined
  } catch (err) {
    return err
  }
}

async function getStatusAndCatch (api, cid) {
  try {
    await api.getStatus({ cid })
    return undefined
  } catch (err) {
    return err
  }
}

test('upload POSTs the exact file to /files and returns the parsed body', async () => {
  for (let i = 0; i < 300; i++) {
    const base = `http://host-${Math.floor(rng() * 1000)}:${5000 + Math.floor(rng() * 1000)}`
    const filename = `${randomText(12)}.bin`
    const bytes = randomBytes()
    const body = {
      success: true,
      cid: `bafy-${randomText(20)}`,
      priceSats: Math.floor(rng() * 1e8)
    }

    let request
    const api = new HostingApi({
      config: { hostingApiUrl: base },
      fetch: async (url, options) => {
        request = { url, options }
        return jsonResponse(body)
      }
    })

    const result = await api.upload({ filename, buffer: bytes })

    assert.deepEqual(result, body)
    assert.equal(request.url, `${base}/files`)
    assert.equal(request.options.method, 'POST')
    assert.ok(request.options.body instanceof FormData)

    const uploaded = request.options.body.get('file')
    assert.equal(uploaded.name, filename)
    assert.equal(await uploaded.text(), bytes.toString())
  }
})

test('a non-2xx response surfaces the API error string when present', async () => {
  for (let i = 0; i < 300; i++) {
    const status = 400 + Math.floor(rng() * 200)
    const message = randomText(40)
    const api = new HostingApi({
      config: { hostingApiUrl: 'http://host' },
      fetch: async () => jsonResponse({ success: false, error: message }, status)
    })

    const err = await uploadAndCatch(api)

    assert.ok(err instanceof HostingApiError)
    assert.equal(err.message, message)
  }
})

test('a non-2xx response without an error string names the HTTP status', async () => {
  for (let i = 0; i < 200; i++) {
    const status = 400 + Math.floor(rng() * 200)
    const api = new HostingApi({
      config: { hostingApiUrl: 'http://host' },
      fetch: async () => ({ ok: false, status, json: async () => { throw new Error('not json') } })
    })

    const err = await uploadAndCatch(api)

    assert.ok(err instanceof HostingApiError)
    assert.ok(err.message.includes(`HTTP ${status}`))
  }
})

test('checkPayment POSTs the address as JSON and returns the parsed body', async () => {
  for (let i = 0; i < 300; i++) {
    const base = `http://host-${Math.floor(rng() * 1000)}:${5000 + Math.floor(rng() * 1000)}`
    const paymentAddress = `bitcoincash:q${randomText(24)}`
    const body = {
      status: 'paid',
      cid: `bafy-${randomText(20)}`,
      downloadUrl: `http://host/download/${randomText(10)}`
    }

    let request
    const api = new HostingApi({
      config: { hostingApiUrl: base },
      fetch: async (url, options) => {
        request = { url, options }
        return jsonResponse(body)
      }
    })

    const result = await api.checkPayment({ paymentAddress })

    assert.deepEqual(result, body)
    assert.equal(request.url, `${base}/files/check-payment`)
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(request.options.body), { paymentAddress })
  }
})

test('checkPayment maps a non-2xx response to the API error', async () => {
  for (let i = 0; i < 300; i++) {
    const status = 400 + Math.floor(rng() * 200)
    const message = randomText(40)
    const api = new HostingApi({
      config: { hostingApiUrl: 'http://host' },
      fetch: async () => jsonResponse({ success: false, error: message }, status)
    })

    const err = await checkPaymentAndCatch(api)

    assert.ok(err instanceof HostingApiError)
    assert.equal(err.message, message)
  }
})

test('getStatus GETs the URL-encoded CID and returns the parsed body', async () => {
  for (let i = 0; i < 300; i++) {
    const base = `http://host-${Math.floor(rng() * 1000)}:${5000 + Math.floor(rng() * 1000)}`
    // Include path-significant characters so the property checks the encoding,
    // not only a fixed CID alphabet.
    const cid = `bafy-${randomText(8)}/${randomText(6)}?x=${randomText(6)}`
    const body = {
      status: 'pinned',
      cid,
      pins: [{ provider: `prov-${randomText(6)}`, status: 'pinned' }]
    }

    let request
    const api = new HostingApi({
      config: { hostingApiUrl: base },
      fetch: async (url, options) => {
        request = { url, options }
        return jsonResponse(body)
      }
    })

    const result = await api.getStatus({ cid })

    assert.deepEqual(result, body)
    assert.equal(request.url, `${base}/files/${encodeURIComponent(cid)}`)
    assert.equal(request.options.method, 'GET')
  }
})

test('getStatus maps a non-2xx response to the API error', async () => {
  for (let i = 0; i < 300; i++) {
    const status = 400 + Math.floor(rng() * 200)
    const message = randomText(40)
    const cid = `bafy-${randomText(10)}`
    const api = new HostingApi({
      config: { hostingApiUrl: 'http://host' },
      fetch: async () => jsonResponse({ success: false, error: message }, status)
    })

    const err = await getStatusAndCatch(api, cid)

    assert.ok(err instanceof HostingApiError)
    assert.equal(err.message, message)
  }
})
