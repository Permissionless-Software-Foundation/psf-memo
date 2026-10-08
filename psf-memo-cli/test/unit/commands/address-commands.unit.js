/*
  Unit tests for the single-field follow/mute write commands.

  memo-follow, memo-unfollow, memo-mute, and memo-unmute share the same
  observable write contract. The shared assertions live in
  test/support/address-command-tests.js; this file runs them for each command's
  prefix and address role, plus the shared wallet/broadcast defaults.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoFollow from '../../../src/commands/memo-follow.js'
import MemoUnfollow from '../../../src/commands/memo-unfollow.js'
import MemoMute from '../../../src/commands/memo-mute.js'
import MemoUnmute from '../../../src/commands/memo-unmute.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import { defineAddressCommandTests } from '../../support/address-command-tests.js'

const VALID_ADDR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const HASH160 = '3e31055173cf58d56edb075499daf29d7b488f09'

const COMMANDS = [
  {
    label: 'follow',
    Command: MemoFollow,
    prefix: '6d06',
    missingMessage: 'You must specify a followee address with the -a flag.'
  },
  {
    label: 'unfollow',
    Command: MemoUnfollow,
    prefix: '6d07',
    missingMessage: 'You must specify a followee address with the -a flag.'
  },
  {
    label: 'mute',
    Command: MemoMute,
    prefix: '6d16',
    missingMessage: 'You must specify a mutee address with the -a flag.'
  },
  {
    label: 'unmute',
    Command: MemoUnmute,
    prefix: '6d17',
    missingMessage: 'You must specify a mutee address with the -a flag.'
  }
]

describe('#address write commands', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  for (const { label, Command, prefix, missingMessage } of COMMANDS) {
    describe(`#memo-${label} command`, () => {
      defineAddressCommandTests({
        label,
        CommandClass: Command,
        prefix,
        missingMessage,
        validAddr: VALID_ADDR,
        hash160Hex: HASH160
      })

      it('defaults to a real wallet util and the shared broadcaster', () => {
        const command = new Command()

        assert.instanceOf(command.walletUtil, WalletUtil)
        assert.equal(command.broadcast, broadcastMemo)
      })
    })
  }
})
