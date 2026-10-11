/*
  Unit tests for the shared hosted-result renderer.

  file-check and file-host both render the CID, download/view links, and one
  gateway line per reported gateway; this pins that shared block.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { hostedResultLines } from '../../../src/lib/hosted-result.js'

describe('#hosted-result', () => {
  it('renders the CID and links in order', () => {
    assert.deepEqual(
      hostedResultLines({ cid: 'bafy', downloadUrl: 'd', viewUrl: 'v' }),
      ['CID: bafy', 'Download URL: d', 'View URL: v']
    )
  })

  it('adds one gateway line per reported gateway', () => {
    assert.deepEqual(
      hostedResultLines({ cid: 'bafy', downloadUrl: 'd', viewUrl: 'v', gatewayUrls: ['g1', 'g2'] }),
      ['CID: bafy', 'Download URL: d', 'View URL: v', 'Gateway URL: g1', 'Gateway URL: g2']
    )
  })

  it('omits gateway lines when none are reported', () => {
    const lines = hostedResultLines({ cid: 'bafy', downloadUrl: 'd', viewUrl: 'v' })

    assert.equal(lines.filter((line) => line.startsWith('Gateway URL:')).length, 0)
  })
})
