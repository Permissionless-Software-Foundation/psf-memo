/*
  Unit tests for the file-upload command.

  These drive the real command against an injected HostingApi class and file
  reader so the required -f flag, the upload call, the quote/already-hosted/
  error output, and the JSON contract are pinned without a network or disk.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FileUpload from '../../../src/commands/file-upload.js'
import HostingApi from '../../../src/lib/hosting-api.js'
import { UsageError } from '../../../src/lib/reporter.js'
import { captureStream } from '../../support/capture.js'

const USAGE_MESSAGE = 'You must specify a file with the -f flag.'
const CONFIG = { hostingApiUrl: 'http://localhost:5050' }

// Build a fake HostingApi class whose upload resolves `result` or rejects
// `error`, recording the options it was constructed with and the upload args.
function fakeHostingApi ({ result, error } = {}) {
  const calls = { opts: null, upload: null }
  class FakeHostingApi {
    constructor (opts) {
      calls.opts = opts
    }

    async upload (args) {
      calls.upload = args
      if (error) throw error
      return result
    }
  }
  return { FakeHostingApi, calls }
}

function makeCommand (fake, { readFile, config = CONFIG } = {}) {
  const out = captureStream()
  const err = captureStream()
  const command = new FileUpload({
    HostingApiClass: fake.FakeHostingApi,
    config,
    readFile: readFile || (() => Buffer.from('file bytes')),
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err }
}

describe('#file-upload command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('uploads the file and prints the quote, returning 0', async () => {
    const fake = fakeHostingApi({
      result: {
        success: true,
        cid: 'bafy-quote',
        filename: 'photo.jpg',
        sizeBytes: 20000,
        billedBytes: 100000,
        priceSats: 2000,
        paymentAddress: 'bitcoincash:qtestaddress',
        quoteExpiresAt: '2026-10-10T00:00:00.000Z'
      }
    })
    const { command, out, err } = makeCommand(fake)

    const code = await command.run({ file: './photo.jpg' })

    assert.equal(code, 0)
    assert.equal(err.text(), '')

    const printed = out.text()
    assert.include(printed, 'File name: photo.jpg')
    assert.include(printed, 'Size: 20000 bytes')
    assert.include(printed, 'Billed size: 100000 bytes')
    assert.include(printed, 'Price: 2000 satoshis')
    assert.include(printed, 'Payment address: bitcoincash:qtestaddress')
    assert.include(printed, 'Quote expires: 2026-10-10T00:00:00.000Z')

    // The command uploads only the base name, with the bytes it read.
    assert.equal(fake.calls.upload.filename, 'photo.jpg')
    assert.instanceOf(fake.calls.upload.buffer, Buffer)
  })

  it('prints the already-hosted links and no payment address', async () => {
    const fake = fakeHostingApi({
      result: {
        success: true,
        alreadyHosted: true,
        downloadUrl: 'http://localhost:5050/download/bafy-already',
        viewUrl: 'http://localhost:5050/view/bafy-already/photo.jpg'
      }
    })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ file: './photo.jpg' })

    assert.equal(code, 0)
    assert.include(out.text(), 'Download URL: http://localhost:5050/download/bafy-already')
    assert.include(out.text(), 'View URL: http://localhost:5050/view/bafy-already/photo.jpg')
    assert.notInclude(out.text(), 'Payment address')
  })

  it('rejects a missing -f flag as a usage error (exit 2) before uploading', async () => {
    const fake = fakeHostingApi({ result: {} })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), { error: USAGE_MESSAGE })
    assert.equal(fake.calls.upload, null)
  })

  it('reports an unreadable local file and returns 1 without uploading', async () => {
    const fake = fakeHostingApi({ result: {} })
    const { command, err } = makeCommand(fake, {
      readFile: () => { throw new Error('ENOENT') }
    })

    const code = await command.run({ file: './absent.bin', json: true })

    assert.equal(code, 1)
    assert.include(JSON.parse(err.text()).error, 'Cannot read file')
    assert.equal(fake.calls.upload, null)
  })

  it('reports an API rejection and returns 1', async () => {
    const fake = fakeHostingApi({ error: new Error('File is too large') })
    const { command, err } = makeCommand(fake)

    const code = await command.run({ file: './photo.jpg', json: true })

    assert.equal(code, 1)
    assert.equal(JSON.parse(err.text()).error, 'File is too large')
  })

  it('prints one JSON object with the quote fields in --json mode', async () => {
    const fake = fakeHostingApi({
      result: {
        success: true,
        priceSats: 62500,
        paymentAddress: 'bitcoincash:qother'
      }
    })
    const { command, out } = makeCommand(fake)

    const code = await command.run({ file: './photo.jpg', json: true })

    assert.equal(code, 0)
    assert.equal(out.text().trim().split('\n').length, 1)

    const parsed = JSON.parse(out.text())
    assert.equal(parsed.priceSats, 62500)
    assert.equal(parsed.paymentAddress, 'bitcoincash:qother')
  })

  it('returns true from validateFlags when the file flag is present', () => {
    const command = new FileUpload({ HostingApiClass: fakeHostingApi().FakeHostingApi })

    assert.equal(command.validateFlags({ file: './photo.jpg' }), true)
  })

  it('throws a UsageError with the documented message from validateFlags', () => {
    const command = new FileUpload({ HostingApiClass: fakeHostingApi().FakeHostingApi })

    assert.throws(() => command.validateFlags({}), UsageError, USAGE_MESSAGE)
  })

  it('builds a default HostingApi from the config', () => {
    const command = new FileUpload({ config: CONFIG })

    assert.instanceOf(command.hostingApi, HostingApi)
  })

  it('passes the config through to the injected HostingApi', () => {
    const fake = fakeHostingApi({ result: {} })
    makeCommand(fake)

    assert.equal(fake.calls.opts.config, CONFIG)
  })
})

describe('#file-upload command (spy)', () => {
  it('reads the file path it was given', async () => {
    const readFile = sinon.stub().returns(Buffer.from('x'))
    const fake = fakeHostingApi({ result: { filename: 'photo.jpg', sizeBytes: 1, billedBytes: 1, priceSats: 1, paymentAddress: 'addr' } })
    const { command } = makeCommand(fake, { readFile })

    await command.run({ file: './photo.jpg', json: true })

    sinon.assert.calledOnceWithExactly(readFile, './photo.jpg')
  })
})
