/*
  Page-controller service for the hosted-files dashboard.

  The service owns the dashboard display state. It loads the public feed from
  the hosting API, shows every file in feed order with its size, times,
  download URL, CID, and a gateway view link, and supports two actions:
  Refresh (reload the first page) and Load more (append the next page). It
  keeps no browser storage and does not poll.

  The state is a plain view model that the presentational component and the
  acceptance run can render without a browser.
*/

const { failureMessage } = require('./errors')

const DEFAULT_PAGE_SIZE = 20
const GENERIC_ERROR_MESSAGE = 'Could not load the hosted files'
const EMPTY_MESSAGE = 'No files are hosted yet.'

// Build the download URL for a file from the API base URL.
function downloadUrl (base, cid) {
  return `${String(base).replace(/\/+$/, '')}/download/${cid}`
}

// Keep only the fields the dashboard shows.
function toDashboardFile (file, downloadBaseUrl) {
  return {
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    downloadUrl: downloadUrl(downloadBaseUrl, file.cid),
    viewUrl: (file.gatewayUrls || [])[0] || ''
  }
}

function pageState (files, nextCursor) {
  return {
    status: 'loaded',
    files,
    hasMore: Boolean(nextCursor)
  }
}

class DashboardPage {
  constructor ({ hostingApi, pageSize = DEFAULT_PAGE_SIZE, downloadBaseUrl = '' } = {}) {
    if (!hostingApi) throw new Error('DashboardPage requires a hosting API adapter')

    this.hostingApi = hostingApi
    this.pageSize = pageSize
    this.downloadBaseUrl = downloadBaseUrl
    this.state = { status: 'idle' }
    this.cursor = null

    this.load = this.load.bind(this)
    this.loadMore = this.loadMore.bind(this)
    this.getViewModel = this.getViewModel.bind(this)
  }

  // Load (or reload) the first page of the feed.
  async load () {
    try {
      const page = await this.hostingApi.getFeed({ limit: this.pageSize })
      this.cursor = page.nextCursor || null
      this.state = pageState(
        (page.files || []).map((file) => toDashboardFile(file, this.downloadBaseUrl)),
        this.cursor
      )
    } catch (err) {
      this.cursor = null
      this.state = { status: 'error', message: failureMessage(err, GENERIC_ERROR_MESSAGE) }
    }

    return this.state
  }

  // Append the next page of the feed to the files already shown.
  async loadMore () {
    if (this.state.status !== 'loaded' || !this.cursor) return this.state

    try {
      const page = await this.hostingApi.getFeed({ limit: this.pageSize, cursor: this.cursor })
      this.cursor = page.nextCursor || null
      this.state = pageState(
        [
          ...this.state.files,
          ...(page.files || []).map((file) => toDashboardFile(file, this.downloadBaseUrl))
        ],
        this.cursor
      )
    } catch (err) {
      this.state = { status: 'error', message: failureMessage(err, GENERIC_ERROR_MESSAGE) }
    }

    return this.state
  }

  getViewModel () {
    return this.state
  }
}

module.exports = DashboardPage
module.exports.DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE
module.exports.EMPTY_MESSAGE = EMPTY_MESSAGE
