/*
  Unit tests for the memo-topic read command.

  These drive the real command against an injected MemoDb class so the required
  room, the resolved page and viewer, the pagination passthrough, the failed
  request, and the endpoint override are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoTopic from '../../../src/commands/memo-topic.js'
import { captureStream } from '../../support/capture.js'

const PAGE = {
  posts: [
    { txid: 'alpha', addr: 'addrA', text: 'first memo', replyCount: 2, likeCount: 3 },
    { txid: 'bravo', addr: 'addrA', text: 'second memo', replyCount: 0, likeCount: 0 }
  ],
  pagination: { limit: 50, offset: 0, total: 2, hasMore: false }
}

// Build a MemoDb stand-in that records its options, the requested room, and the
// requested page, then resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, room: null, page: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getTopicPosts (room, page) {
      calls.room = room
      calls.page = page
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

function makeCommand (fake, { envUrl = null } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoTopic({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-topic command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the topic page and reports the posts and pagination as JSON', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, room: 'general' })

    assert.equal(code, 0)
    assert.equal(fake.calls.room, 'general')
    assert.deepEqual(fake.calls.page, { limit: 50, offset: 0, viewer: null })
    const data = JSON.parse(out.text())
    assert.deepEqual(data.posts, PAGE.posts)
    assert.deepEqual(data.pagination, PAGE.pagination)
    assert.equal(err.text(), '')
  })

  it('forwards the requested page and viewer to the service', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake)

    await command.run({ json: true, room: 'general', viewer: 'viewerB', limit: '2', offset: '4' })

    assert.deepEqual(fake.calls.page, { limit: 2, offset: 4, viewer: 'viewerB' })
  })

  it('reports a missing room as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a topic room with the -r flag.'
    })
    assert.equal(fake.calls.room, null)
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, room: 'general' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb({ result: PAGE })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, room: 'general', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the topic flags without reading', () => {
    const command = new MemoTopic({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ room: 'general', viewer: 'viewerB', limit: '2', offset: '3' }), {
      room: 'general',
      viewer: 'viewerB',
      limit: 2,
      offset: 3
    })
  })
})
