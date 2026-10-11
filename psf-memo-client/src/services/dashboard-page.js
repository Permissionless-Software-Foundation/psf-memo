/*
  Page-controller service for the hosted-files dashboard.

  The service owns the dashboard display state. It loads the public feed from
  the hosting API, shows every file in feed order with its size, times, and
  the API download and view URLs, and supports two actions:
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

// Keep only the fields the dashboard shows. The feed carries the API download
// and view URLs; the configured base is a fallback for a feed that omits the
// download URL.
function toDashboardFile (file, downloadBaseUrl) {
  return {
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    downloadUrl: file.downloadUrl || downloadUrl(downloadBaseUrl, file.cid),
    viewUrl: file.viewUrl || ''
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

  // Map a feed page to the dashboard state, appending to the files already
  // shown, and remember its cursor for the next page.
  loadPage (page, priorFiles = []) {
    const files = [
      ...priorFiles,
      ...(page.files || []).map((file) => toDashboardFile(file, this.downloadBaseUrl))
    ]
    this.cursor = page.nextCursor || null
    return pageState(files, this.cursor)
  }

  // Load (or reload) the first page of the feed.
  async load () {
    try {
      const page = await this.hostingApi.getFeed({ limit: this.pageSize })
      this.state = this.loadPage(page)
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
      this.state = this.loadPage(page, this.state.files)
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T00:21:24.343Z","module_hash":"368a162811292b5e5a98be99a0d2729abccd17c310500f90fab35351d3d61e91","functions":[{"id":"func/downloadUrl","name":"downloadUrl","line":21,"end_line":23,"hash":"44ebf0f055eaade112f4fb6b4f735c1b42a036e4b179f94541ac1cd76ac08e0d"},{"id":"func/toDashboardFile","name":"toDashboardFile","line":28,"end_line":38,"hash":"11a831bc18963b9a1fb5f38142705b7aeca0b27fc602da598fbbc911ae392bab"},{"id":"func/pageState","name":"pageState","line":40,"end_line":46,"hash":"52a12d4cbc460683dcd79787de9802aa33fe3c9a3c9b0db2efbd263baf9f69f9"},{"id":"func/DashboardPage.constructor","name":"DashboardPage.constructor","line":49,"end_line":61,"hash":"a22b49be62a27243e5d49a0bf5ec76a7f5fbc96dcad2b12019ed17f4c340b0e1"},{"id":"func/DashboardPage.loadPage","name":"DashboardPage.loadPage","line":65,"end_line":72,"hash":"586d2c5907a728eacf4047b84475d3bb79116e84ab5ec5f2902d57bfc529f92f"},{"id":"func/DashboardPage.load","name":"DashboardPage.load","line":75,"end_line":85,"hash":"c0e94b8b381f27b4fa0d92d47c289b01094372a56781ae5dd804459fe0dfeddd"},{"id":"func/DashboardPage.loadMore","name":"DashboardPage.loadMore","line":88,"end_line":99,"hash":"cd03d4587ff1e1165a1de3daefa7daf1eeabf66101416621d4911fe74756ebdf"},{"id":"func/DashboardPage.getViewModel","name":"DashboardPage.getViewModel","line":101,"end_line":103,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
