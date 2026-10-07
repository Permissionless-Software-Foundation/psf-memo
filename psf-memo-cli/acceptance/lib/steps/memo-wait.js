/*
  Gherkin step handlers for the Memo Wait feature.

  The posts store and failure steps are shared with the Memo Get Post feature.
  This module installs a deterministic clock (no real waiting) and a fetch
  wrapper that counts post polls and materializes a scheduled post on a given
  poll, then runs the real memo-wait command in JSON mode so its polling,
  timeout, and reporting can be asserted.
*/

// Local libraries
import MemoWait from '../../../src/commands/memo-wait.js'
import { runReadCommand, assertUsageError, assertReadCommandError, parseStderrError } from '../read-command.js'
import { assertEqual, resolveParam } from '../step-support.js'

// Install the wait command's deterministic clock and poll-counting fetch
// wrapper. A scheduled post is moved into the store once the poll count
// reaches its trigger.
function prepareWaitWorld (world) {
  const baseFetch = world.fetch
  let current = 0

  world.postRequestCount = 0
  world.sleepCalls = []
  world.now = () => current
  world.sleep = async (ms) => {
    world.sleepCalls.push(ms)
    current += ms
  }

  world.fetch = async (url) => {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith('/level/post/')) {
      world.postRequestCount++
      const txid = decodeURIComponent(parsed.pathname.split('/').pop())
      const schedule = world.postSchedule?.[txid]
      if (schedule && world.postRequestCount >= schedule.onPoll && !(txid in world.postStore)) {
        world.postStore[txid] = schedule.post
      }
    }
    return baseFetch(url)
  }
}

async function runWait (world, flags) {
  prepareWaitWorld(world)
  await runReadCommand(
    world,
    MemoWait,
    'wait',
    flags,
    { sleep: world.sleep, now: world.now }
  )
}

const memoWaitHandlers = [
  {
    name: 'service will index a post on a poll',
    pattern: /^the Memo DB service will index the post "(.+)" with text "(.+)" and address "(.+)" on poll (.+)$/,
    run (m, example, world) {
      const txid = resolveParam(m[1], example)
      world.postSchedule = world.postSchedule || {}
      world.postSchedule[txid] = {
        onPoll: Number.parseInt(resolveParam(m[4], example), 10),
        post: {
          addr: resolveParam(m[3], example),
          text: resolveParam(m[2], example),
          blockHeight: 600123,
          seen: 1234
        }
      }
    }
  },
  {
    name: 'memo-wait command runs without a txid',
    pattern: /^the memo-wait command runs without a txid$/,
    async run (m, example, world) {
      await runWait(world, {})
    }
  },
  {
    name: 'memo-wait command runs for a txid',
    pattern: /^the memo-wait command runs for "(.+)"$/,
    async run (m, example, world) {
      await runWait(world, { txid: resolveParam(m[1], example) })
    }
  },
  {
    name: 'memo-wait command runs with timeout and interval',
    pattern: /^the memo-wait command runs for "(.+)" with timeout (.+) and interval (.+)$/,
    async run (m, example, world) {
      await runWait(world, {
        txid: resolveParam(m[1], example),
        timeout: resolveParam(m[2], example),
        interval: resolveParam(m[3], example)
      })
    }
  },
  {
    name: 'command polled the service',
    pattern: /^the command polled the service (.+) times$/,
    run (m, example, world) {
      assertEqual(world.postRequestCount, Number.parseInt(resolveParam(m[1], example), 10), 'poll count')
    }
  },
  {
    name: 'command did not wait',
    pattern: /^the command did not wait$/,
    run (m, example, world) {
      assertEqual(world.sleepCalls.length, 0, 'wait count')
    }
  },
  {
    name: 'command waited between polls',
    pattern: /^the command waited (.+) milliseconds between polls$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      if (world.sleepCalls.length === 0) {
        throw new Error('Expected the command to wait between polls')
      }
      for (const waited of world.sleepCalls) {
        assertEqual(waited, expected, 'wait interval')
      }
    }
  },
  {
    name: 'command reported the indexed post',
    pattern: /^the command reported the indexed post "(.+)" with text "(.+)" and address "(.+)"$/,
    run (m, example, world) {
      const post = world.waitJson?.post
      if (!post) {
        throw new Error('Expected a reported indexed post')
      }
      assertEqual(post.txid, resolveParam(m[1], example), 'post txid', { quote: true })
      assertEqual(post.text, resolveParam(m[2], example), 'post text', { quote: true })
      assertEqual(post.addr, resolveParam(m[3], example), 'post address', { quote: true })
    }
  },
  {
    name: 'memo-wait command reported the timeout error',
    pattern: /^the memo-wait command reported the timeout error "(.+)"$/,
    run (m, example, world) {
      assertEqual(world.waitExitCode, 1, 'memo-wait exit code')
      assertEqual(parseStderrError(world, 'wait').error, resolveParam(m[1], example), 'timeout error', { quote: true })
    }
  },
  {
    name: 'memo-wait command reported the usage error',
    pattern: /^the memo-wait command reported the usage error "(.+)"$/,
    run (m, example, world) {
      assertUsageError(world, 'wait', 'memo-wait', resolveParam(m[1], example))
    }
  },
  {
    name: 'memo-wait command reported an error',
    pattern: /^the memo-wait command reported an error$/,
    run (m, example, world) {
      assertReadCommandError(world, 'wait', 'memo-wait')
    }
  }
]

export { memoWaitHandlers }
