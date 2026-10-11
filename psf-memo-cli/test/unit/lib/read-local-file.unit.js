/*
  Unit tests for the shared local-file reader.

  Both file-upload and file-host read a local file through this helper; the
  reader is injected so the failure mapping can be pinned without touching disk.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { readLocalFile } from '../../../src/lib/read-local-file.js'

describe('#read-local-file', () => {
  it('returns the bytes from the injected reader', () => {
    const buffer = Buffer.from('file bytes')

    assert.equal(readLocalFile(() => buffer, './photo.jpg'), buffer)
  })

  it('maps a read failure to the documented message', () => {
    try {
      readLocalFile(() => { throw new Error('ENOENT') }, './absent.bin')
      assert.fail('Unexpected result')
    } catch (err) {
      assert.equal(err.message, 'Cannot read file: ./absent.bin')
    }
  })
})
