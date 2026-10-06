/*
  Project step handlers for the psf-memo-cli acceptance pipeline.

  The Memo DB client is pure HTTP, so each scenario gets a world with a fake
  fetch that records the request URL and serves a small in-memory service. The
  real client is exercised end to end without any network access.
*/

// Local libraries
import MemoDb from '../../src/lib/memo-db.js'
import { runCommand, UsageError } from '../../src/lib/reporter.js'

// A minimal fetch Response stand-in carrying a JSON body.
function jsonResponse (body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }
}

// Substitute <param> step values from the current example row.
function resolveParam (value, example) {
  const match = /^<([A-Za-z0-9_]+)>$/.exec(String(value).trim())
  if (match) {
    const param = match[1]
    if (!(param in example)) {
      throw new Error(`Missing example value for "${param}"`)
    }
    return example[param]
  }
  return String(value).trim()
}

function makePosts (count) {
  const posts = []
  for (let i = 0; i < count; i++) {
    posts.push({
      txid: `post-${i}`,
      addr: `bitcoincash:qaddr-${i}`,
      text: `post ${i}`,
      seen: i,
      blockHeight: 600000 + i
    })
  }
  return posts
}

// A write-only stream that accumulates its output for later assertions.
function captureStream () {
  const chunks = []
  return {
    stream: { write: (chunk) => { chunks.push(chunk) } },
    text: () => chunks.join('')
  }
}

// Parse one line of text as a single JSON object, or throw a clear failure.
function parseSingleJsonObject (text, label) {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.split('\n').length !== 1) {
    throw new Error(`Expected ${label} to be a single JSON object, got "${text}"`)
  }

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch (err) {
    throw new Error(`Expected ${label} to be JSON, got "${text}"`)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected ${label} to be a JSON object, got "${text}"`)
  }

  return parsed
}

async function createWorld () {
  const world = {
    flagUrl: undefined,
    envUrl: undefined,
    posts: [],
    missingProfiles: new Set(),
    unreachable: false,
    lastRequest: null,
    lastResult: null,
    lastError: null,
    json: false,
    outcome: null,
    exitCode: null,
    stdoutText: '',
    stderrText: ''
  }

  world.fetch = async (url) => {
    world.lastRequest = new URL(url)

    if (world.unreachable) {
      throw new TypeError('fetch failed')
    }

    if (world.lastRequest.pathname.startsWith('/level/profile/')) {
      const addr = decodeURIComponent(world.lastRequest.pathname.split('/').pop())
      if (world.missingProfiles.has(addr)) {
        return jsonResponse({ message: 'not found' }, 404)
      }
      return jsonResponse({ addr, text: 'bio' }, 200)
    }

    if (world.lastRequest.pathname === '/posts/recent') {
      const limit = Number.parseInt(world.lastRequest.searchParams.get('limit') || '50', 10)
      const offset = Number.parseInt(world.lastRequest.searchParams.get('offset') || '0', 10)
      const page = world.posts.slice(offset, offset + limit)
      const pagination = {
        limit,
        offset,
        total: world.posts.length,
        hasMore: offset + limit < world.posts.length
      }
      return jsonResponse({ posts: page, pagination }, 200)
    }

    return jsonResponse({ message: 'not found' }, 404)
  }

  // Build a client using the overrides configured for this scenario.
  world.client = () => new MemoDb({
    dbUrl: world.flagUrl,
    envUrl: world.envUrl,
    fetchImpl: world.fetch
  })

  // Reproduce the scenario's command outcome as a runnable command.
  world.command = async () => {
    if (world.outcome.type === 'result') return { message: world.outcome.message }
    if (world.outcome.type === 'usage') throw new UsageError(world.outcome.message)
    throw new Error(world.outcome.message)
  }

  return world
}

const handlers = [
  {
    name: 'a Memo DB client is available',
    pattern: /^a Memo DB client$/,
    run (m, example, world) {
      world.lastError = null
    }
  },
  {
    name: 'no endpoint override',
    pattern: /^no Memo DB endpoint override is configured$/,
    run (m, example, world) {
      world.flagUrl = null
      world.envUrl = null
    }
  },
  {
    name: 'MEMO_DB_URL is set',
    pattern: /^the MEMO_DB_URL environment variable is (.+)$/,
    run (m, example, world) {
      world.envUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'db-url flag is set',
    pattern: /^the --db-url flag is (.+)$/,
    run (m, example, world) {
      world.flagUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'resolve the endpoint',
    pattern: /^the Memo DB client resolves its endpoint$/,
    run (m, example, world) {
      world.endpoint = world.client().endpoint
    }
  },
  {
    name: 'resolved endpoint',
    pattern: /^the resolved endpoint is (.+)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.endpoint !== expected) {
        throw new Error(`Expected endpoint ${expected}, got ${world.endpoint}`)
      }
    }
  },
  {
    name: 'service serves recent posts',
    pattern: /^the Memo DB service serves (.+) recent posts$/,
    run (m, example, world) {
      world.posts = makePosts(Number.parseInt(resolveParam(m[1], example), 10))
    }
  },
  {
    name: 'request recent posts page',
    pattern: /^the Memo DB client requests recent posts with limit (.+) and offset (.+)$/,
    async run (m, example, world) {
      const limit = Number.parseInt(resolveParam(m[1], example), 10)
      const offset = Number.parseInt(resolveParam(m[2], example), 10)
      world.lastResult = await world.client().getRecentPosts({ limit, offset })
    }
  },
  {
    name: 'request recent posts for viewer',
    pattern: /^the Memo DB client requests recent posts for the viewer (.+)$/,
    async run (m, example, world) {
      const viewer = resolveParam(m[1], example)
      world.lastResult = await world.client().getRecentPosts({ viewer })
    }
  },
  {
    name: 'request recent posts',
    pattern: /^the Memo DB client requests recent posts$/,
    async run (m, example, world) {
      try {
        world.lastResult = await world.client().getRecentPosts()
      } catch (err) {
        world.lastError = err
      }
    }
  },
  {
    name: 'client returned a post count',
    pattern: /^the Memo DB client returns (.+) posts$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      const actual = world.lastResult?.posts?.length
      if (actual !== expected) {
        throw new Error(`Expected ${expected} posts, got ${actual}`)
      }
    }
  },
  {
    name: 'service received a recent-posts request',
    pattern: /^the service received a request for \/posts\/recent with limit (.+) and offset (.+)$/,
    run (m, example, world) {
      const limit = resolveParam(m[1], example)
      const offset = resolveParam(m[2], example)
      if (world.lastRequest?.pathname !== '/posts/recent') {
        throw new Error(`Expected a /posts/recent request, got ${world.lastRequest?.pathname}`)
      }
      if (world.lastRequest.searchParams.get('limit') !== limit) {
        throw new Error(`Expected limit ${limit}, got ${world.lastRequest.searchParams.get('limit')}`)
      }
      if (world.lastRequest.searchParams.get('offset') !== offset) {
        throw new Error(`Expected offset ${offset}, got ${world.lastRequest.searchParams.get('offset')}`)
      }
    }
  },
  {
    name: 'service received the viewer parameter',
    pattern: /^the service received the viewer query parameter (.+)$/,
    run (m, example, world) {
      const viewer = resolveParam(m[1], example)
      if (world.lastRequest?.searchParams.get('viewer') !== viewer) {
        throw new Error(`Expected viewer ${viewer}, got ${world.lastRequest?.searchParams.get('viewer')}`)
      }
    }
  },
  {
    name: 'service has no profile for addr',
    pattern: /^the Memo DB service has no profile for the address (.+)$/,
    run (m, example, world) {
      world.missingProfiles.add(resolveParam(m[1], example))
    }
  },
  {
    name: 'read the profile for addr',
    pattern: /^the Memo DB client reads the profile for the address (.+)$/,
    async run (m, example, world) {
      const addr = resolveParam(m[1], example)
      world.lastResult = await world.client().getProfile(addr)
    }
  },
  {
    name: 'client reports no profile',
    pattern: /^the Memo DB client reports no profile$/,
    run (m, example, world) {
      if (world.lastResult !== null) {
        throw new Error(`Expected no profile, got ${JSON.stringify(world.lastResult)}`)
      }
    }
  },
  {
    name: 'service is unreachable',
    pattern: /^the Memo DB service is unreachable$/,
    run (m, example, world) {
      world.unreachable = true
    }
  },
  {
    name: 'client reports an error',
    pattern: /^the Memo DB client reports an error$/,
    run (m, example, world) {
      if (!(world.lastError instanceof Error)) {
        throw new Error('Expected the Memo DB client to report an error')
      }
    }
  }
]

const reporterHandlers = [
  {
    name: 'a CLI command',
    pattern: /^a CLI command$/,
    run (m, example, world) {
      world.json = false
      world.outcome = null
      world.exitCode = null
      world.stdoutText = ''
      world.stderrText = ''
    }
  },
  {
    name: 'command has a result',
    pattern: /^the command has a result with the message "(.+)"$/,
    run (m, example, world) {
      world.outcome = { type: 'result', message: resolveParam(m[1], example) }
    }
  },
  {
    name: 'command fails',
    pattern: /^the command fails with the error "(.+)"$/,
    run (m, example, world) {
      world.outcome = { type: 'error', message: resolveParam(m[1], example) }
    }
  },
  {
    name: 'command rejects the flags',
    pattern: /^the command rejects the flags with the error "(.+)"$/,
    run (m, example, world) {
      world.outcome = { type: 'usage', message: resolveParam(m[1], example) }
    }
  },
  {
    name: 'runs in human mode',
    pattern: /^the command runs in human mode$/,
    async run (m, example, world) {
      world.json = false
      await runReporterCommand(world)
    }
  },
  {
    name: 'runs in JSON mode',
    pattern: /^the command runs in JSON mode$/,
    async run (m, example, world) {
      world.json = true
      await runReporterCommand(world)
    }
  },
  {
    name: 'exit code is',
    pattern: /^the exit code is (.+)$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      if (world.exitCode !== expected) {
        throw new Error(`Expected exit code ${expected}, got ${world.exitCode}`)
      }
    }
  },
  {
    name: 'stdout contains',
    pattern: /^stdout contains "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (!world.stdoutText.includes(expected)) {
        throw new Error(`Expected stdout to contain "${expected}", got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stdout is not JSON',
    pattern: /^stdout is not JSON$/,
    run (m, example, world) {
      let isJson = true
      try {
        JSON.parse(world.stdoutText)
      } catch (err) {
        isJson = false
      }
      if (isJson) {
        throw new Error(`Expected stdout not to be JSON, got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stderr is empty',
    pattern: /^stderr is empty$/,
    run (m, example, world) {
      if (world.stderrText !== '') {
        throw new Error(`Expected stderr to be empty, got "${world.stderrText}"`)
      }
    }
  },
  {
    name: 'stdout is a single JSON object',
    pattern: /^stdout is a single JSON object$/,
    run (m, example, world) {
      parseSingleJsonObject(world.stdoutText, 'stdout')
    }
  },
  {
    name: 'JSON output has the message',
    pattern: /^the JSON output has the message "(.+)"$/,
    run (m, example, world) {
      const parsed = parseSingleJsonObject(world.stdoutText, 'stdout')
      const expected = resolveParam(m[1], example)
      if (parsed.message !== expected) {
        throw new Error(`Expected JSON message "${expected}", got "${parsed.message}"`)
      }
    }
  },
  {
    name: 'stdout is empty',
    pattern: /^stdout is empty$/,
    run (m, example, world) {
      if (world.stdoutText !== '') {
        throw new Error(`Expected stdout to be empty, got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'stderr contains',
    pattern: /^stderr contains "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (!world.stderrText.includes(expected)) {
        throw new Error(`Expected stderr to contain "${expected}", got "${world.stderrText}"`)
      }
    }
  },
  {
    name: 'stderr is a single JSON object',
    pattern: /^stderr is a single JSON object$/,
    run (m, example, world) {
      parseSingleJsonObject(world.stderrText, 'stderr')
    }
  },
  {
    name: 'JSON error has the message',
    pattern: /^the JSON error has the message "(.+)"$/,
    run (m, example, world) {
      const parsed = parseSingleJsonObject(world.stderrText, 'stderr')
      const expected = resolveParam(m[1], example)
      if (parsed.error !== expected) {
        throw new Error(`Expected JSON error "${expected}", got "${parsed.error}"`)
      }
    }
  }
]

// Run the scenario's command through the real reporter and capture its output.
async function runReporterCommand (world) {
  const stdout = captureStream()
  const stderr = captureStream()

  world.exitCode = await runCommand(world.command, {
    json: world.json,
    stdout: stdout.stream,
    stderr: stderr.stream
  })
  world.stdoutText = stdout.text()
  world.stderrText = stderr.text()
}

async function handleStep (step, example, world) {
  for (const handler of handlers.concat(reporterHandlers)) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

export { createWorld, handleStep }
