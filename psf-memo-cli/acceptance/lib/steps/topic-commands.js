/*
  Gherkin step handlers shared by the topic write features.

  memo-topic-post, memo-topic-follow, and memo-topic-unfollow resolve a wallet
  and require the -r room (topic-post also requires the -m message). This module
  registers their shared background, room/message, and command-runner steps; the
  wallet/result/usage/error steps are shared in ./broadcast-command.js.
*/

// Local libraries
import MemoTopicPost from '../../../src/commands/memo-topic-post.js'
import MemoTopicFollow from '../../../src/commands/memo-topic-follow.js'
import MemoTopicUnfollow from '../../../src/commands/memo-topic-unfollow.js'
import { resolveParam } from '../step-support.js'
import { initCommandWorld, runCommandInWorld } from './broadcast-command.js'

const COMMANDS = {
  post: MemoTopicPost,
  follow: MemoTopicFollow,
  unfollow: MemoTopicUnfollow
}

const topicCommandHandlers = [
  {
    name: 'a Memo topic command',
    pattern: /^a Memo topic (post|follow|unfollow) command$/,
    run (m, example, world) {
      initCommandWorld(world, { txid: `memo-topic-${m[1]}-txid` })
      world.room = undefined
      world.message = undefined
    }
  },
  {
    name: 'the topic room',
    pattern: /^the topic room is "(.*)"$/,
    run (m, example, world) {
      world.room = resolveParam(m[1], example)
    }
  },
  {
    name: 'no topic room',
    pattern: /^no topic room is given$/,
    run (m, example, world) {
      world.room = undefined
    }
  },
  {
    name: 'the topic message',
    pattern: /^the topic message is "(.*)"$/,
    run (m, example, world) {
      world.message = resolveParam(m[1], example)
    }
  },
  {
    name: 'the topic message of multibyte characters',
    pattern: /^the topic message is (.+) multibyte characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      // U+00E9 is one UTF-16 code unit but two UTF-8 bytes.
      world.message = 'é'.repeat(length)
    }
  },
  {
    name: 'the topic message of characters',
    pattern: /^the topic message is (.+) characters long$/,
    run (m, example, world) {
      const length = Number.parseInt(resolveParam(m[1], example), 10)
      world.message = 'a'.repeat(length)
    }
  },
  {
    name: 'no topic message',
    pattern: /^no topic message is given$/,
    run (m, example, world) {
      world.message = undefined
    }
  },
  {
    name: 'the memo topic command runs',
    pattern: /^the memo-topic-(post|follow|unfollow) command runs$/,
    async run (m, example, world) {
      const flags = m[1] === 'post'
        ? { room: world.room, memo: world.message }
        : { room: world.room }

      await runCommandInWorld(world, COMMANDS[m[1]], { ...flags, ...world.commandSource })
    }
  }
]

export { topicCommandHandlers }
