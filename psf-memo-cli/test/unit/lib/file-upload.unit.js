/*
  Unit tests for the pure file-upload helper.

  The command prints either the price quote or the already-hosted links. These
  tests pin the human-readable rendering, including the billed-size and
  payment-address omissions the feature calls out.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatFileUploadMessage } from '../../../src/lib/file-upload.js'

describe('#file-upload helper', () => {
  it('renders the quote with the billed size when it differs', () => {
    const message = formatFileUploadMessage({
      filename: 'photo.jpg',
      sizeBytes: 20000,
      billedBytes: 100000,
      priceSats: 2000,
      paymentAddress: 'bitcoincash:qquote',
      quoteExpiresAt: '2026-10-10T00:00:00.000Z'
    })

    assert.include(message, 'File name: photo.jpg')
    assert.include(message, 'Size: 20000 bytes')
    assert.include(message, 'Billed size: 100000 bytes')
    assert.include(message, 'Price: 2000 satoshis')
    assert.include(message, 'Payment address: bitcoincash:qquote')
    assert.include(message, 'Quote expires: 2026-10-10T00:00:00.000Z')
  })

  it('omits the billed size when it equals the size', () => {
    const message = formatFileUploadMessage({
      filename: 'photo.jpg',
      sizeBytes: 1000000,
      billedBytes: 1000000,
      priceSats: 2500,
      paymentAddress: 'bitcoincash:qquote'
    })

    assert.include(message, 'Size: 1000000 bytes')
    assert.notInclude(message, 'Billed size')
  })

  it('omits the file name and size when the API does not report them', () => {
    const message = formatFileUploadMessage({ priceSats: 1, paymentAddress: 'bitcoincash:qquote' })

    assert.notInclude(message, 'File name')
    assert.notInclude(message, 'Size')
    assert.include(message, 'Price: 1 satoshis')
    assert.include(message, 'Payment address: bitcoincash:qquote')
  })

  it('omits the quote expiry when the API does not report one', () => {
    const message = formatFileUploadMessage({
      filename: 'photo.jpg',
      sizeBytes: 10,
      billedBytes: 100000,
      priceSats: 1,
      paymentAddress: 'bitcoincash:qquote'
    })

    assert.notInclude(message, 'Quote expires')
  })

  it('renders the already-hosted download and view links with no payment address', () => {
    const message = formatFileUploadMessage({
      alreadyHosted: true,
      downloadUrl: 'http://localhost:5050/download/bafy-already',
      viewUrl: 'http://localhost:5050/view/bafy-already/photo.jpg'
    })

    assert.include(message, 'Download URL: http://localhost:5050/download/bafy-already')
    assert.include(message, 'View URL: http://localhost:5050/view/bafy-already/photo.jpg')
    assert.notInclude(message, 'Payment address')
  })
})
