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
