/*
  Unit tests for the pure file-status helper.

  The command reports a hosted file's metadata and pins. These tests pin the
  human-readable rendering, including the "not paid" hosting window and the
  optional file-metadata lines.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { formatFileStatusMessage } from '../../../src/lib/file-status.js'

describe('#file-status helper', () => {
  it('renders the file metadata, hosting window, and pins', () => {
    const message = formatFileStatusMessage({
      cid: 'bafy-file',
      filename: 'photo.jpg',
      sizeBytes: 1024,
      status: 'pinned',
      hostedUntil: '2027-10-09T00:00:00.000Z',
      pins: [
        { provider: 'local-helia', status: 'pinned' },
        { provider: 'lighthouse', status: 'failed' }
      ]
    })

    assert.include(message, 'CID: bafy-file')
    assert.include(message, 'File name: photo.jpg')
    assert.include(message, 'Size: 1024 bytes')
    assert.include(message, 'Status: pinned')
    assert.include(message, 'Hosting window: 2027-10-09T00:00:00.000Z')
    assert.include(message, 'Pin: local-helia pinned')
    assert.include(message, 'Pin: lighthouse failed')
  })

  it('renders "not paid" when the hosting window is unset', () => {
    const message = formatFileStatusMessage({
      cid: 'bafy-staged',
      filename: 'draft.txt',
      sizeBytes: 500,
      status: 'staged',
      hostedUntil: null,
      pins: []
    })

    assert.include(message, 'Hosting window: not paid')
    assert.notInclude(message, 'Pin:')
  })

  it('omits the file name and size when the API does not report them', () => {
    const message = formatFileStatusMessage({ cid: 'bafy-min', status: 'staged' })

    assert.include(message, 'CID: bafy-min')
    assert.include(message, 'Status: staged')
    assert.notInclude(message, 'File name')
    assert.notInclude(message, 'Size')
  })
})
