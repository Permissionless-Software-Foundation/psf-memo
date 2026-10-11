/*
  Unit tests for the file-status read command.

  These drive the real command against an injected HostingApi class so the
  required CID, the reported metadata and pins, the API error, and the JSON
  contract are pinned without a network.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FileStatus from '../../../src/commands/file-status.js'
import HostingApi from '../../../src/lib/hosting-api.js'
import { captureStream } from '../../support/capture.js'

const USAGE_MESSAGE = 'You must specify a CID with the -c flag.'
const CONFIG = { hostingApiUrl: 'http://localhost:5050' }

// Build a fake HostingApi class whose getStatus resolves `result` or rejects
// `error`, recording its options and the requested CID.
function fakeHostingApi ({ result, error } = {}) {
  const calls = { opts: null, cid: null }
  class FakeHostingApi {
    constructor (opts) {
      calls.opts = opts
    }

    async getStatus ({ cid }) {
      calls.cid = cid
      if (error) throw error
      return result
    }
  }
  return { FakeHostingApi, calls }
}

function makeCommand (fake, { config = CONFIG } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new FileStatus({
    HostingApiClass: fake.FakeHostingApi,
    config,
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

const FILE = {
  cid: 'bafy-file',
  filename: 'photo.jpg',
  sizeBytes: 1024,
  status: 'pinned',
  hostedUntil: '2027-10-09T00:00:00.000Z',
  pins: [{ provider: 'local-helia', status: 'pinned' }]
}

describe('#file-status command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('reads the CID and prints its details and pins, returning 0', async () => {
    const fake = fakeHostingApi({ result: FILE })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ cid: 'bafy-file' })

    assert.equal(code, 0)
    assert.equal(err.text(), '')
    assert.equal(fake.calls.cid, 'bafy-file')

    const printed = out.text()
    assert.include(printed, 'CID: bafy-file')
    assert.include(printed, 'File name: photo.jpg')
    assert.include(printed, 'Size: 1024 bytes')
    assert.include(printed, 'Status: pinned')
    assert.include(printed, 'Hosting window: 2027-10-09T00:00:00.000Z')
    assert.include(printed, 'Pin: local-helia pinned')
  })

  it('rejects a missing -c flag as a usage error (exit 2) before reading', async () => {
    const fake = fakeHostingApi({ result: FILE })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), { error: USAGE_MESSAGE })
    assert.equal(fake.calls.cid, null)
  })

  it('reports an API error on stderr with exit 1', async () => {
    const fake = fakeHostingApi({ error: new Error('File not found') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ cid: 'bafy-missing', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'File not found')
  })

  it('prints one JSON object with the file fields in --json mode', async () => {
    const fake = fakeHostingApi({ result: FILE })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ cid: 'bafy-file', json: true })

    assert.equal(code, 0)
    assert.equal(out.text().trim().split('\n').length, 1)

    const parsed = JSON.parse(out.text())
    assert.equal(parsed.status, 'pinned')
    assert.equal(parsed.cid, 'bafy-file')
    assert.equal(parsed.filename, 'photo.jpg')
  })

  it('builds a default HostingApi from the config', () => {
    const command = new FileStatus({ config: CONFIG })

    assert.instanceOf(command.hostingApi, HostingApi)
  })

  it('passes the config through to the injected HostingApi', () => {
    const fake = fakeHostingApi({ result: FILE })
    makeCommand(fake)

    assert.equal(fake.calls.opts.config, CONFIG)
  })

  it('reads the CID flag without a network call', () => {
    const command = new FileStatus({ HostingApiClass: fakeHostingApi().FakeHostingApi })
    const getStatus = sinon.spy(command.hostingApi, 'getStatus')

    assert.deepEqual(command.validateFlags({ cid: 'bafy-file' }), { cid: 'bafy-file' })
    sinon.assert.notCalled(getStatus)
  })
})
