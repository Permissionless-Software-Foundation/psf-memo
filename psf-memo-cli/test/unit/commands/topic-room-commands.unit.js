/*
  Unit tests for the single-field topic room write commands.

  memo-topic-follow and memo-topic-unfollow share the same observable write
  contract. The shared assertions live in test/support/room-command-tests.js;
  this file runs them for each command's prefix, plus the shared
  wallet/broadcast defaults.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoTopicFollow from '../../../src/commands/memo-topic-follow.js'
import MemoTopicUnfollow from '../../../src/commands/memo-topic-unfollow.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import { defineRoomCommandTests } from '../../support/room-command-tests.js'

const MISSING_ROOM = 'You must specify a topic room with the -r flag.'

const COMMANDS = [
  { label: 'topic-follow', Command: MemoTopicFollow, prefix: '6d0d' },
  { label: 'topic-unfollow', Command: MemoTopicUnfollow, prefix: '6d0e' }
]

describe('#topic room write commands', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  for (const { label, Command, prefix } of COMMANDS) {
    describe(`#memo-${label} command`, () => {
      defineRoomCommandTests({
        label,
        CommandClass: Command,
        prefix,
        missingMessage: MISSING_ROOM
      })

      it('defaults to a real wallet util and the shared broadcaster', () => {
        const command = new Command()

        assert.instanceOf(command.walletUtil, WalletUtil)
        assert.equal(command.broadcast, broadcastMemo)
      })
    })
  }
})
