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
}

export { HostingApiError }
export default HostingApi

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T16:24:16.938Z","module_hash":"ebe52cab172215c8280df0ebd0ba29625c42b5bb6fb897692e9826ecf1d1805c","functions":[{"id":"func/errorMessage","name":"errorMessage","line":12,"end_line":15,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":17,"end_line":23,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":29,"end_line":32,"hash":"ec835447e0d998a56b7f8d6d975623b16de24eb8c0441f11991dc7baa5fc9b54"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":36,"end_line":51,"hash":"eef972d319cc6211a09e46aaf9c90aa48be2554d6a0d80767367aa6dd04a137c"}]}
// mutate4javascript-manifest-end
