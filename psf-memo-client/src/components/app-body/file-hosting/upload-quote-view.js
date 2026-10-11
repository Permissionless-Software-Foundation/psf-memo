/*
  Presentational view for the file-hosting upload and payment result.

  Renders the FileUploadPage display state (quote, already hosted, paid, no
  file, expired, pending, or error) as a small block of HTML. The paid result
  links to no status page: the /status page is intentionally not ported.
  Written in plain React.createElement style so the same view can be used by
  the JSX browser page and by the Node acceptance rendering, without a browser.
*/

const React = require('react')
const { QRCodeSVG } = require('qrcode.react')
const { buildChildren, selectChildren, messageChildren } = require('../shared/status-view')

function linkLine (key, className, label, url, target) {
  const linkProps = { href: url }
  if (target) linkProps.target = target
  return React.createElement(
    'p',
    { key, className },
    label,
    React.createElement('a', linkProps, url)
  )
}

// The API view link for an image opens in a new tab so the browser does not
// navigate away from the hosting result; other files keep the default target.
const IMAGE_NAME = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i

function isImageName (filename) {
  return IMAGE_NAME.test(filename || '')
}

function quoteChildren (state) {
  const children = []

  if (state.sizeBytes !== undefined) {
    children.push(
      React.createElement('p', { key: 'size', className: 'file-upload-size' }, `Size: ${state.sizeBytes} bytes`)
    )
  }

  // A separate billed line is only useful when billing rounds the size up, so
  // a file at or above the minimum shows a single size.
  if (state.billedBytes !== undefined && state.billedBytes !== state.sizeBytes) {
    children.push(
      React.createElement('p', { key: 'billed-size', className: 'file-upload-billed-size' }, `Billed size: ${state.billedBytes} bytes`)
    )
  }

  children.push(
    React.createElement('p', { key: 'price', className: 'file-upload-price' }, `${state.priceSats} satoshis`),
    React.createElement('p', { key: 'address', className: 'file-upload-address' }, state.paymentAddress),
    React.createElement(
      'div',
      { key: 'qr', className: 'file-upload-qr' },
      React.createElement(QRCodeSVG, { value: state.paymentAddress })
    )
  )

  if (state.countdown) {
    children.push(
      React.createElement(
        'p',
        { key: 'countdown', className: 'file-upload-countdown' },
        `Quote expires in ${state.countdown}`
      )
    )
  }

  return children
}

function hostedChildren (state) {
  return [linkLine('view', 'file-upload-view', 'View: ', state.viewUrl)]
}

function paidChildren (state) {
  return [
    React.createElement('p', { key: 'cid', className: 'file-upload-cid' }, `CID: ${state.cid}`),
    linkLine('view', 'file-upload-view', 'View: ', state.viewUrl, isImageName(state.filename) ? '_blank' : undefined),
    React.createElement('p', { key: 'txid', className: 'file-upload-txid' }, `Payment: ${state.txid}`)
  ]
}

// Display status to children builder. A null prototype keeps an unexpected
// status string (for example "constructor") from resolving to an
// Object.prototype member instead of the empty default.
const STATUS_CHILDREN = buildChildren({
  quote: quoteChildren,
  hosted: hostedChildren,
  paid: paidChildren,
  'no-file': messageChildren('prompt', 'file-upload-prompt'),
  error: messageChildren('error', 'file-upload-error'),
  expired: messageChildren('expired', 'file-upload-expired'),
  pending: messageChildren('pending', 'file-upload-pending')
})

function UploadQuoteView ({ state = { status: 'idle' } } = {}) {
  const children = selectChildren(STATUS_CHILDREN, state)

  if (state.filename) {
    children.unshift(
      React.createElement('p', { key: 'filename', className: 'file-upload-name' }, state.filename)
    )
  }

  return React.createElement('div', { className: 'file-upload-result' }, ...children)
}

module.exports = UploadQuoteView

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T00:24:58.654Z","module_hash":"6ab141949ce39cabe874f6ba9ee7b953be70ce00274e65b08685a37e260cd164","functions":[{"id":"func/linkLine","name":"linkLine","line":15,"end_line":24,"hash":"5a49ac27625a2c4411cc8d449fb1782f5d5d62ddeda9c18cb43401af1963d8b6"},{"id":"func/isImageName","name":"isImageName","line":30,"end_line":32,"hash":"d0d46115bc40e8efa485b03c654e8568de0cc60975b74cbbd11031163eb0f3ee"},{"id":"func/quoteChildren","name":"quoteChildren","line":34,"end_line":72,"hash":"3d867295e4a20a31c21b00b4d2db41f2f94bdc2c2df9e3e5521a584d2b7fd031"},{"id":"func/hostedChildren","name":"hostedChildren","line":74,"end_line":76,"hash":"4f0afbbc4bcccd5926937feb975c2c0074c88039f28c7d83dc70c18213ef725a"},{"id":"func/paidChildren","name":"paidChildren","line":78,"end_line":84,"hash":"f35d0db911ec31127b9680f3d5508c06df19c06272d8724482007c03bb48674a"},{"id":"func/UploadQuoteView","name":"UploadQuoteView","line":99,"end_line":109,"hash":"7f34f34983ecc59c828d693b3a30e79086f4bac361d921e0e6e9d3eb64649756"}]}
// mutate4javascript-manifest-end
