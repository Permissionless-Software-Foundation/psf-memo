/*
  Unit tests for the shared output and exit-code reporter.

  These pin the human and JSON output shapes, the stderr-only error channel,
  and the 0/1/2 exit-code contract for success, runtime failure, and usage
  failure.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import {
  Reporter,
  UsageError,
  runCommand,
  EXIT_SUCCESS,
  EXIT_FAILURE,
  EXIT_USAGE
} from '../../../src/lib/reporter.js'
import { captureStream } from '../../support/capture.js'

// Temporarily replace the process streams so default-argument paths can be
// observed without touching the real terminal.
function captureProcessStreams () {
  const originalOut = process.stdout.write
  const originalErr = process.stderr.write
  let out = ''
  let err = ''
  process.stdout.write = (chunk) => { out += chunk; return true }
  process.stderr.write = (chunk) => { err += chunk; return true }

  return {
    stdout: () => out,
    stderr: () => err,
    restore: () => {
      process.stdout.write = originalOut
      process.stderr.write = originalErr
    }
  }
}

describe('#reporter', () => {
  describe('exit-code constants', () => {
    it('pins the documented 0/1/2 contract', () => {
      assert.equal(EXIT_SUCCESS, 0)
      assert.equal(EXIT_FAILURE, 1)
      assert.equal(EXIT_USAGE, 2)
    })
  })

  describe('Reporter.result', () => {
    it('writes the message to stdout in human mode and returns 0', () => {
      const out = captureStream()
      const reporter = new Reporter({ stdout: out.stream })

      assert.equal(reporter.result('hello'), EXIT_SUCCESS)
      assert.equal(out.text(), 'hello\n')
    })

    it('writes one JSON object carrying data in JSON mode', () => {
      const out = captureStream()
      const reporter = new Reporter({ json: true, stdout: out.stream })

      reporter.result('hello', { txid: 'abc' })

      assert.deepEqual(JSON.parse(out.text()), { message: 'hello', txid: 'abc' })
    })

    it('defaults the message and data', () => {
      const out = captureStream()
      const reporter = new Reporter({ json: true, stdout: out.stream })

      reporter.result()

      assert.deepEqual(JSON.parse(out.text()), { message: '' })
    })
  })

  describe('Reporter.fail and Reporter.usage', () => {
    const cases = [
      { method: 'fail', make: () => new Error('boom'), code: EXIT_FAILURE, message: 'boom' },
      { method: 'usage', make: () => new UsageError('missing flag'), code: EXIT_USAGE, message: 'missing flag' }
    ]

    for (const { method, make, code, message } of cases) {
      it(`Reporter.${method} writes the error to stderr in human mode and returns ${code}`, () => {
        const err = captureStream()
        const reporter = new Reporter({ stderr: err.stream })

        assert.equal(reporter[method](make()), code)
        assert.equal(err.text(), `${message}\n`)
      })

      it(`Reporter.${method} writes one JSON error to stderr in JSON mode`, () => {
        const err = captureStream()
        const reporter = new Reporter({ json: true, stderr: err.stream })

        reporter[method](make())

        assert.deepEqual(JSON.parse(err.text()), { error: message })
      })
    }
  })

  describe('runCommand', () => {
    it('reports a successful result and returns 0', async () => {
      const out = captureStream()

      const code = await runCommand(async () => ({ message: 'done' }), { stdout: out.stream })

      assert.equal(code, EXIT_SUCCESS)
      assert.equal(out.text(), 'done\n')
    })

    it('handles a command that returns nothing', async () => {
      const out = captureStream()

      const code = await runCommand(async () => {}, { stdout: out.stream })

      assert.equal(code, EXIT_SUCCESS)
      assert.equal(out.text(), '\n')
    })

    const errorCases = [
      { make: () => new Error('boom'), code: EXIT_FAILURE, message: 'boom' },
      { make: () => new UsageError('missing flag'), code: EXIT_USAGE, message: 'missing flag' }
    ]

    for (const { make, code, message } of errorCases) {
      it(`reports a failed command as exit ${code}`, async () => {
        const err = captureStream()

        const exit = await runCommand(async () => {
          throw make()
        }, { stderr: err.stream, stdout: captureStream().stream })

        assert.equal(exit, code)
        assert.equal(err.text(), `${message}\n`)
      })
    }

    it('uses the process streams by default', async () => {
      const processStreams = captureProcessStreams()
      try {
        const ok = await runCommand(async () => ({ message: 'hi' }))
        const failed = await runCommand(async () => {
          throw new Error('boom')
        })

        assert.equal(ok, EXIT_SUCCESS)
        assert.equal(failed, EXIT_FAILURE)
        assert.equal(processStreams.stdout(), 'hi\n')
        assert.equal(processStreams.stderr(), 'boom\n')
      } finally {
        processStreams.restore()
      }
    })
  })

  describe('Reporter defaults', () => {
    it('uses the process streams and human mode by default', () => {
      const processStreams = captureProcessStreams()
      try {
        const reporter = new Reporter()

        reporter.result('hello')
        reporter.fail(new Error('boom'))

        assert.equal(processStreams.stdout(), 'hello\n')
        assert.equal(processStreams.stderr(), 'boom\n')
      } finally {
        processStreams.restore()
      }
    })
  })
})
