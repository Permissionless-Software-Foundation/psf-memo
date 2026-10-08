/*
  Unit tests for the memo-poll read command.

  These drive the real command against an injected MemoDb class so the required
  txid, the reported poll question/options/votes, the not-found failure, the
  failed request, and the endpoint override are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoPoll from '../../../src/commands/memo-poll.js'
import { captureStream } from '../../support/capture.js'

const POLL = {
  txid: 'poll-a',
  addr: 'bitcoincash:qasker',
  pollType: 1,
  optionCount: 2,
  question: 'which is better?',
  blockHeight: 600010,
  seen: 10,
  options: [
    { option: 'yes', addr: 'bitcoincash:qyes', pollTxid: 'poll-a', txid: 'opt-1' },
    { option: 'no', addr: 'bitcoincash:qno', pollTxid: 'poll-a', txid: 'opt-2' }
  ],
  votes: [
    { comment: 'yes', addr: 'bitcoincash:qvoter1', pollTxid: 'poll-a', txid: 'vote-1' }
  ]
}

// Build a MemoDb stand-in that records its options and the requested txid, then
// resolves the supplied result or error.
function fakeMemoDb ({ result, error } = {}) {
  const calls = { opts: null, txid: null }
  class FakeMemoDb {
    constructor (opts) {
      calls.opts = opts
    }

    async getPoll (txid) {
      calls.txid = txid
      if (error) throw error
      return result
    }
  }
  return { FakeMemoDb, calls }
}

function makeCommand (fake, { envUrl = null } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new MemoPoll({
    MemoDbClass: fake.FakeMemoDb,
    envUrl,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#memo-poll command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the poll and reports the question, options, and votes as JSON', async () => {
    const fake = fakeMemoDb({ result: POLL })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ json: true, txid: 'poll-a' })

    assert.equal(code, 0)
    assert.equal(fake.calls.txid, 'poll-a')
    const data = JSON.parse(out.text())
    assert.deepEqual(data.poll, POLL)
    assert.equal(err.text(), '')
  })

  it('reports a missing txid as the documented usage error (exit 2)', async () => {
    const fake = fakeMemoDb({ result: POLL })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a post txid with the -t flag.'
    })
    assert.equal(fake.calls.txid, null)
  })

  it('reports a txid with no poll as a not-found failure (exit 1)', async () => {
    const fake = fakeMemoDb({ result: null })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, txid: 'poll-missing' })

    assert.equal(code, 1)
    assert.include(JSON.parse(err.text()).error.toLowerCase(), 'not found')
  })

  it('reports a failed request on stderr with exit 1', async () => {
    const fake = fakeMemoDb({ error: new Error('Memo DB request failed with HTTP 500') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true, txid: 'poll-a' })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'Memo DB request failed with HTTP 500')
  })

  it('forwards the environment and db-url override to the client', async () => {
    const fake = fakeMemoDb({ result: POLL })
    const { command } = makeCommand(fake, { envUrl: 'https://env.example' })

    await command.run({ json: true, txid: 'poll-a', dbUrl: 'https://flag.example' })

    assert.equal(fake.calls.opts.envUrl, 'https://env.example')
    assert.equal(fake.calls.opts.dbUrl, 'https://flag.example')
  })

  it('resolves the txid flag without reading', () => {
    const command = new MemoPoll({ MemoDbClass: fakeMemoDb().FakeMemoDb })

    assert.deepEqual(command.validateFlags({ txid: 'poll-a' }), { txid: 'poll-a' })
  })
})
