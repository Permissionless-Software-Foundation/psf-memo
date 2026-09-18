import { assert } from 'chai'
import common from '../../config/env/common.js'

describe('#config', () => {
  it('should disable mongo and IPFS for the LevelDB-only build', () => {
    assert.equal(common.noMongo, true)
    assert.equal(common.useIpfs, false)
  })

  it('should default the notification block window to 25000 when unset', () => {
    if (process.env.NOTIFICATION_BLOCK_WINDOW === undefined) {
      assert.equal(common.notificationBlockWindow, 25000)
    }
  })
})
