/*
  Adapter boundary for the bch-file-hosting REST API.

  The web client talks to the API through this small class so the upload view
  can be unit tested without a network. `fetch` and `FormData` are injected so
  tests can stub them. The API base URL comes from the app config, which reads
  REACT_APP_FILE_HOSTING_URL.
*/

/* global globalThis */

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

// True when a feed option was actually supplied. The API applies its own
// default for a missing limit or cursor, so those are left out of the query.
function hasValue (value) {
  return value !== undefined && value !== null && value !== ''
}

// Query string for the feed page. The cursor is opaque and passed through as
// the caller supplied it.
function buildFeedQuery ({ limit, cursor } = {}) {
  const params = new URLSearchParams()
  if (hasValue(limit)) params.set('limit', String(limit))
  if (hasValue(cursor)) params.set('cursor', String(cursor))
  return params.toString()
}

class HostingApi {
  constructor ({ config, fetch: fetchImpl, FormData: FormDataImpl } = {}) {
    this.config = config
    // A browser's native fetch rejects any receiver other than the global
    // object. Bind the transport before storing it so calling `this.fetch(...)`
    // inside this adapter still invokes it with the browser receiver.
    this.fetch = (fetchImpl || fetch).bind(globalThis)
    this.FormData = FormDataImpl || FormData

    this.upload = this.upload.bind(this)
    this.checkPayment = this.checkPayment.bind(this)
    this.getStatus = this.getStatus.bind(this)
    this.getFeed = this.getFeed.bind(this)
  }

  // Send one API request and return its parsed JSON body, throwing the server's
  // error message on a non-2xx response. Shared by every endpoint so the error
  // contract lives in one place.
  async request (path, options) {
    const response = await this.fetch(`${this.config.fileHostingUrl}${path}`, options)
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }

  // Upload a browser File to POST /files and return the parsed quote response.
  async upload (file) {
    const form = new this.FormData()
    form.append('file', file, file.name)

    return this.request('/files', { method: 'POST', body: form })
  }

  // Ask whether an invoice has been paid at POST /files/check-payment. The
  // response status is 'unpaid', 'expired', or 'paid'.
  async checkPayment ({ paymentAddress } = {}) {
    return this.request('/files/check-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentAddress })
    })
  }

  // Look up a file record at GET /files/:cid. The CID is a single path
  // segment, so it is percent-encoded: an unencoded value such as
  // `../admin/invoices` would be normalized by the URL parser and change the
  // requested endpoint.
  async getStatus ({ cid } = {}) {
    return this.request(`/files/${encodeURIComponent(cid)}`, { method: 'GET' })
  }

  // List the public feed at GET /files. The page is limited and paginated by
  // the opaque cursor returned with the previous page.
  async getFeed ({ limit, cursor } = {}) {
    const query = buildFeedQuery({ limit, cursor })

    return this.request(`/files${query ? `?${query}` : ''}`, { method: 'GET' })
  }
}

module.exports = HostingApi
module.exports.HostingApiError = HostingApiError
