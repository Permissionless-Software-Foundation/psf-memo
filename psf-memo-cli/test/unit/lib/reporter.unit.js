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

// A stream stand-in that accumulates everything written to it.
function capture () {
  const chunks = []
  return {
    stream: { write: (chunk) => { chunks.push(chunk) } },
    text: () => chunks.join('')
  }
}

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
  describe('Reporter.result', () => {
    it('writes the message to stdout in human mode and returns 0', () => {
      const out = capture()
      const reporter = new Reporter({ stdout: out.stream })

      assert.equal(reporter.result('hello'), EXIT_SUCCESS)
      assert.equal(out.text(), 'hello\n')
    })

    it('writes one JSON object carrying data in JSON mode', () => {
      const out = capture()
      const reporter = new Reporter({ json: true, stdout: out.stream })

      reporter.result('hello', { txid: 'abc' })

      assert.deepEqual(JSON.parse(out.text()), { message: 'hello', txid: 'abc' })
    })

    it('defaults the message and data', () => {
      const out = capture()
      const reporter = new Reporter({ json: true, stdout: out.stream })

      reporter.result()

      assert.deepEqual(JSON.parse(out.text()), { message: '' })
    })
  })

  describe('Reporter.fail', () => {
    it('writes the error to stderr in human mode and returns 1', () => {
      const err = capture()
      const reporter = new Reporter({ stderr: err.stream })

      assert.equal(reporter.fail(new Error('boom')), EXIT_FAILURE)
      assert.equal(err.text(), 'boom\n')
    })

    it('writes one JSON error to stderr in JSON mode', () => {
      const err = capture()
      const reporter = new Reporter({ json: true, stderr: err.stream })

      reporter.fail(new Error('boom'))

      assert.deepEqual(JSON.parse(err.text()), { error: 'boom' })
    })
  })

  describe('Reporter.usage', () => {
    it('writes the error to stderr in human mode and returns 2', () => {
      const err = capture()
      const reporter = new Reporter({ stderr: err.stream })

      assert.equal(reporter.usage(new UsageError('missing flag')), EXIT_USAGE)
      assert.equal(err.text(), 'missing flag\n')
    })

    it('writes one JSON error to stderr in JSON mode', () => {
      const err = capture()
      const reporter = new Reporter({ json: true, stderr: err.stream })

      reporter.usage(new UsageError('missing flag'))

      assert.deepEqual(JSON.parse(err.text()), { error: 'missing flag' })
    })
  })

  describe('runCommand', () => {
    it('reports a successful result and returns 0', async () => {
      const out = capture()

      const code = await runCommand(async () => ({ message: 'done' }), { stdout: out.stream })

      assert.equal(code, EXIT_SUCCESS)
      assert.equal(out.text(), 'done\n')
    })

    it('handles a command that returns nothing', async () => {
      const out = capture()

      const code = await runCommand(async () => {}, { stdout: out.stream })

      assert.equal(code, EXIT_SUCCESS)
      assert.equal(out.text(), '\n')
    })

    it('reports a runtime error and returns 1', async () => {
      const err = capture()

      const code = await runCommand(async () => {
        throw new Error('boom')
      }, { stderr: err.stream, stdout: capture().stream })

      assert.equal(code, EXIT_FAILURE)
      assert.equal(err.text(), 'boom\n')
    })

    it('reports a usage error and returns 2', async () => {
      const err = capture()

      const code = await runCommand(async () => {
        throw new UsageError('missing flag')
      }, { stderr: err.stream, stdout: capture().stream })

      assert.equal(code, EXIT_USAGE)
      assert.equal(err.text(), 'missing flag\n')
    })

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
