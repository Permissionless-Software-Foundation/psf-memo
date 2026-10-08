/*
  Gherkin step handlers shared by the follow/mute write features.

  memo-follow, memo-unfollow, memo-mute, and memo-unmute all resolve a wallet,
  decode the -a target address to its hash160, and broadcast one field under
  their own prefix. This module registers their shared background, target-address,
  and command-runner steps; the wallet/result/usage/error steps are shared in
  ./broadcast-command.js.
*/

// Local libraries
import MemoFollow from '../../../src/commands/memo-follow.js'
import MemoUnfollow from '../../../src/commands/memo-unfollow.js'
import MemoMute from '../../../src/commands/memo-mute.js'
import MemoUnmute from '../../../src/commands/memo-unmute.js'
import { resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const COMMANDS = {
  follow: MemoFollow,
  unfollow: MemoUnfollow,
  mute: MemoMute,
  unmute: MemoUnmute
}

const addressCommandHandlers = [
  {
    name: 'a Memo address command',
    pattern: /^a Memo (follow|unfollow|mute|unmute) command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: `memo-${m[1]}-txid` })
      world.targetAddress = undefined
    }
  },
  {
    name: 'the target address',
    pattern: /^the target address is "(.*)"$/,
    run (m, example, world) {
      world.targetAddress = resolveParam(m[1], example)
    }
  },
  {
    name: 'no target address',
    pattern: /^no target address is given$/,
    run (m, example, world) {
      world.targetAddress = undefined
    }
  },
  {
    name: 'the memo address command runs',
    pattern: /^the memo-(follow|unfollow|mute|unmute) command runs$/,
    async run (m, example, world) {
      await runCommandInWorld(world, COMMANDS[m[1]], {
        addr: world.targetAddress,
        ...world.commandSource
      })
    }
  }
]

export { addressCommandHandlers }
