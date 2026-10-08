/*
  Unit tests for the memo-unfollow write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the single-field 0x6d07 hash160 action, the result
  reporting, the usage errors, and the broadcast-error surfacing are pinned
  without a network or a real wallet file. The shared address-command contract
  lives in test/support/address-command-tests.js.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoUnfollow from '../../../src/commands/memo-unfollow.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import { defineAddressCommandTests } from '../../support/address-command-tests.js'

const VALID_ADDR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const HASH160 = '3e31055173cf58d56edb075499daf29d7b488f09'

describe('#memo-unfollow command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  defineAddressCommandTests({
    label: 'unfollow',
    CommandClass: MemoUnfollow,
    prefix: '6d07',
    missingMessage: 'You must specify a followee address with the -a flag.',
    validAddr: VALID_ADDR,
    hash160Hex: HASH160
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoUnfollow()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
