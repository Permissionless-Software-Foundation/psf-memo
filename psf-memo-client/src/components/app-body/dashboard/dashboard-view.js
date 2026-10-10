/*
  Presentational view for the hosted-files dashboard.

  Renders the DashboardPage display state as a Bootstrap table: one row per
  file with its formatted size and times, a truncated CID with a copy control,
  a download link, and a gateway view link; or the empty-feed message, or the
  API error. Written in plain React.createElement style so the same view can be
  used by the browser page and by the Node acceptance rendering, without a
  browser.
*/

const React = require('react')
const { line, buildChildren, selectChildren, messageChildren } = require('../shared/status-view')
const { copyToClipboard } = require('../../../services/clipboard')
const DashboardPage = require('../../../services/dashboard-page')

// The page service owns the empty-feed message so the controller and the view
// cannot drift (the same pattern as AccountPage.NO_POSTS_MESSAGE).
const EMPTY_MESSAGE = DashboardPage.EMPTY_MESSAGE
const COLUMNS = [
  'File Name',
  'Size',
  'Paid',
  'Hosted Until',
  'CID',
  'Download',
  'View'
]

// Decimal units: 1 KB = 1,000 bytes, 1 MB = 1,000,000 bytes.
function formatSize (bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value)) return ''
  if (value < 1000) return `${value} bytes`
  if (value < 1000000) return `${(value / 1000).toFixed(2)} KB`
  return `${(value / 1000000).toFixed(2)} MB`
}

function pad2 (value) {
  return String(value).padStart(2, '0')
}

// Render an ISO timestamp as a UTC minute timestamp (for example
// "2026-01-02 00:00 UTC"). An unparseable value renders an empty cell.
function formatDate (value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return (
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ` +
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`
  )
}

// Show the first and last eight characters of a CID; short CIDs are unchanged.
function truncateCid (cid) {
  const value = String(cid)
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}...${value.slice(-8)}`
}

function copyControl (cid) {
  return React.createElement(
    'button',
    {
      key: 'copy',
      type: 'button',
      className: 'dashboard-copy btn btn-sm btn-outline-secondary',
      title: 'Copy CID',
      'aria-label': `Copy CID ${cid}`,
      'data-cid': cid,
      onClick: () => copyToClipboard(cid)
    },
    'Copy'
  )
}

function cidCell (file) {
  return React.createElement(
    'td',
    { key: 'cid', className: 'dashboard-file-cid' },
    React.createElement('span', { className: 'dashboard-cid-text', title: file.cid }, truncateCid(file.cid)),
    ' ',
    copyControl(file.cid)
  )
}

function downloadCell (file) {
  return React.createElement(
    'td',
    { key: 'download', className: 'dashboard-file-download' },
    React.createElement('a', { href: file.downloadUrl, className: 'dashboard-download' }, 'Download')
  )
}

// A gateway view link opens the file in a new tab. Without a gateway URL the
// cell is empty.
function viewCell (file) {
  const link = file.viewUrl
    ? React.createElement(
      'a',
      { key: 'view', href: file.viewUrl, className: 'dashboard-view-link', target: '_blank', rel: 'noreferrer' },
      'View'
    )
    : null
  return React.createElement('td', { key: 'view', className: 'dashboard-file-view' }, link)
}

function fileRow (file, index) {
  return React.createElement(
    'tr',
    { key: `file-${index}`, className: 'dashboard-row', 'data-cid': file.cid },
    React.createElement('td', { className: 'dashboard-file-name' }, file.filename),
    React.createElement('td', { className: 'dashboard-file-size' }, formatSize(file.sizeBytes)),
    React.createElement('td', { className: 'dashboard-file-paid' }, formatDate(file.paidAt)),
    React.createElement('td', { className: 'dashboard-file-until' }, formatDate(file.hostedUntil)),
    cidCell(file),
    downloadCell(file),
    viewCell(file)
  )
}

function table (files) {
  return React.createElement(
    'table',
    { className: 'table dashboard-table' },
    React.createElement(
      'thead',
      null,
      React.createElement(
        'tr',
        null,
        ...COLUMNS.map((column, index) => React.createElement('th', { key: index, scope: 'col' }, column))
      )
    ),
    React.createElement('tbody', null, ...files.map(fileRow))
  )
}

function loadedChildren (state) {
  const files = state.files || []
  if (files.length === 0) {
    return [line('empty', 'dashboard-empty', EMPTY_MESSAGE)]
  }
  return [table(files)]
}

// Display status to children builder. A null prototype keeps an unexpected
// status string from resolving to an Object.prototype member instead of the
// empty default.
const STATUS_CHILDREN = buildChildren({
  loaded: loadedChildren,
  error: messageChildren('error', 'dashboard-error')
})

function DashboardView ({ state = { status: 'idle' } } = {}) {
  return React.createElement('div', { className: 'dashboard' }, ...selectChildren(STATUS_CHILDREN, state))
}

module.exports = DashboardView
module.exports.EMPTY_MESSAGE = EMPTY_MESSAGE
module.exports.formatSize = formatSize
module.exports.formatDate = formatDate
module.exports.truncateCid = truncateCid

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T03:03:32.660Z","module_hash":"26ef03158d7c0b8d977d80fbcf1e28a124c886db05eb5119a19fa13041bfd90c","functions":[{"id":"func/formatSize","name":"formatSize","line":31,"end_line":37,"hash":"8368c80786dd71502bc560948ccfd86bed856b8958a977618677d98099832e5b"},{"id":"func/pad2","name":"pad2","line":39,"end_line":41,"hash":"d7d69e378cf0cf734666bd3ee677c79430a782e0621e9113025ce5a02e21462a"},{"id":"func/formatDate","name":"formatDate","line":45,"end_line":52,"hash":"7feaea287b421a3509d4da0c7011aefb85f8f042392bb0be6d7a0872b4be1ce5"},{"id":"func/truncateCid","name":"truncateCid","line":55,"end_line":59,"hash":"b327ecbacc601378bc9ce072a606a642adb2dcf781117283bfc9dd7674c8b4d5"},{"id":"func/copyControl","name":"copyControl","line":61,"end_line":75,"hash":"2daef3c05e1d00d258b4165306c1aa511c28e3c3a3b11d293d565b1584b3e11a"},{"id":"func/cidCell","name":"cidCell","line":77,"end_line":85,"hash":"a9173b2cf0e72f20aa2b77f093ee9bfcaefc1fce3d199cf1cab1f4a3ede324f5"},{"id":"func/downloadCell","name":"downloadCell","line":87,"end_line":93,"hash":"bd93ecac397a688f55382cf08176aa49c872de9df14ceac45dd563cd37b9d8a0"},{"id":"func/viewCell","name":"viewCell","line":97,"end_line":106,"hash":"25c63dbaeaa39f24f1323599a5327ee1d2468d80122b3fa3ee9f5066f3921c43"},{"id":"func/fileRow","name":"fileRow","line":108,"end_line":120,"hash":"56897a99f18127279f89e31eba8371fa19184a3a0f705f94ee9b0b45607aed71"},{"id":"func/table","name":"table","line":122,"end_line":137,"hash":"9150a40560051e39743d489329a98e9fdd86c1ba18719ca2f6756986e11b88ae"},{"id":"func/loadedChildren","name":"loadedChildren","line":139,"end_line":145,"hash":"851997c9b12eadcd6c534fe72a23f8bab242b66b7ee7241cc51f78b574c26628"},{"id":"func/DashboardView","name":"DashboardView","line":155,"end_line":157,"hash":"db81742ac5522641ee77b0c216dfa115b7c108f56144186e0949fb232814b612"}]}
// mutate4javascript-manifest-end
