/*
  Adapter boundary for the bch-file-hosting REST API.

  The file-* commands talk to the hosting API through this small class so the
  command layer can be unit tested without a network. `fetch` is injected so
  tests can stub it, and it is bound to the global object before use because a
  browser's native fetch rejects any other receiver.
*/

class HostingApiError extends Error {}

function errorMessage (response, body) {
  if (body && typeof body.error === 'string' && body.error) return body.error
  return `Hosting API request failed with HTTP ${response.status}`
}

async function readJson (response) {
  try {
    return await response.json()
  } catch (err) {
    return null
  }
}

class HostingApi {
  // A browser's native fetch rejects any receiver other than the global
  // object. Bind the transport before storing it so calling `this.fetch(...)`
  // inside this adapter still invokes it with the global receiver.
  constructor ({ config = {}, fetch: fetchImpl } = {}) {
    this.config = config
    this.fetch = (fetchImpl || fetch).bind(globalThis)
  }

  // Upload a file buffer to POST /files and return the parsed response, which
  // is either a price quote or an already-hosted result.
  async upload ({ filename, buffer } = {}) {
    const form = new FormData()
    form.append('file', new Blob([buffer]), filename)

    const response = await this.fetch(`${this.config.hostingApiUrl}/files`, {
      method: 'POST',
      body: form
    })
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }

  // Check a payment address at POST /files/check-payment. Returns the payment
  // status document: unpaid, paid (with CID and links), or expired.
  async checkPayment ({ paymentAddress } = {}) {
    const response = await this.fetch(`${this.config.hostingApiUrl}/files/check-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentAddress })
    })
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }

  // Look up a file record at GET /files/:cid. The CID is a path segment, so
  // encode it: an unencoded value such as `../admin/invoices` would be
  // normalized by the URL parser and change the requested endpoint.
  async getStatus ({ cid } = {}) {
    const response = await this.fetch(
      `${this.config.hostingApiUrl}/files/${encodeURIComponent(cid)}`,
      { method: 'GET' }
    )
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }
}

export { HostingApiError }
export default HostingApi

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:30:24.748Z","module_hash":"6c00cec4a95a02d64558fbde4acfaf0448c3f3b356816e81f0c511a76e360bdc","functions":[{"id":"func/errorMessage","name":"errorMessage","line":12,"end_line":15,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":17,"end_line":23,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":29,"end_line":32,"hash":"ec835447e0d998a56b7f8d6d975623b16de24eb8c0441f11991dc7baa5fc9b54"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":36,"end_line":51,"hash":"eef972d319cc6211a09e46aaf9c90aa48be2554d6a0d80767367aa6dd04a137c"},{"id":"func/HostingApi.checkPayment","name":"HostingApi.checkPayment","line":55,"end_line":68,"hash":"c895da7392de7d5067c3cf8e9ac895e4672e2d94b04e9ca9ff4fa42d5013e78e"},{"id":"func/HostingApi.getStatus","name":"HostingApi.getStatus","line":73,"end_line":85,"hash":"d91c95f91351f259141a0a3decff9ee045fe47b18757e3ff8ecc6ef2aaa99162"}]}
// mutate4javascript-manifest-end
