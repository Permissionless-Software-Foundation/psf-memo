/*
  Unit tests for the pure file-check helper.

  The command recovers a hosted file's links by payment address and reports the
  paid, unpaid, or expired result. These tests pin the human-readable rendering
  of each status.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatFileCheckMessage } from '../../../src/lib/file-check.js'

describe('#file-check helper', () => {
  it('renders the paid result with the CID, links, and gateways', () => {
    const message = formatFileCheckMessage({
      status: 'paid',
      cid: 'bafy-paid',
      downloadUrl: 'http://localhost:5050/download/bafy-paid',
      viewUrl: 'http://localhost:5050/view/bafy-paid/photo.jpg',
      gatewayUrls: ['https://ipfs.io/ipfs/bafy-paid/photo.jpg']
    })

    assert.include(message, 'CID: bafy-paid')
    assert.include(message, 'Download URL: http://localhost:5050/download/bafy-paid')
    assert.include(message, 'View URL: http://localhost:5050/view/bafy-paid/photo.jpg')
    assert.include(message, 'Gateway URL: https://ipfs.io/ipfs/bafy-paid/photo.jpg')
  })

  it('omits gateway URLs when the API reports none', () => {
    const message = formatFileCheckMessage({
      status: 'paid',
      cid: 'bafy',
      downloadUrl: 'd',
      viewUrl: 'v'
    })

    assert.notInclude(message, 'Gateway URL')
  })

  it('renders the unpaid amounts and quote expiry', () => {
    const message = formatFileCheckMessage({
      status: 'unpaid',
      receivedSats: 1500,
      requiredSats: 62500,
      quoteExpiresAt: '2026-10-11T12:00:00.000Z'
    })

    assert.include(message, 'Status: unpaid')
    assert.include(message, 'Received: 1500 satoshis')
    assert.include(message, 'Required: 62500 satoshis')
    assert.include(message, 'Quote expires: 2026-10-11T12:00:00.000Z')
  })

  it('renders the expired status', () => {
    const message = formatFileCheckMessage({ status: 'expired' })

    assert.equal(message, 'Status: expired')
  })
})
