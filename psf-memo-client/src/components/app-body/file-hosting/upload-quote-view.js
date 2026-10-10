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

// Gateway links for images open in a new tab so the browser does not navigate
// away from the hosting result; other files keep the default target.
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
  return [linkLine('download', 'file-upload-download', 'Download: ', state.downloadUrl)]
}

function paidChildren (state) {
  const children = [
    React.createElement('p', { key: 'cid', className: 'file-upload-cid' }, `CID: ${state.cid}`),
    linkLine('download', 'file-upload-download', 'Download: ', state.downloadUrl)
  ]

  const gateways = state.gatewayUrls || []
  const gatewayTarget = isImageName(state.filename) ? '_blank' : undefined
  for (let i = 0; i < gateways.length; i++) {
    children.push(linkLine(`gateway-${i}`, 'file-upload-gateway', 'Gateway: ', gateways[i], gatewayTarget))
  }

  children.push(
    React.createElement('p', { key: 'txid', className: 'file-upload-txid' }, `Payment: ${state.txid}`)
  )

  return children
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
