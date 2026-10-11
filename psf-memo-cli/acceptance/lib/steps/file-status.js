/*
  Gherkin step handlers for the File Status feature.

  The scenario world serves a fake hosting API GET /files/:cid response, and
  each scenario runs the real file-status command so its metadata, hosting
  window, pins, error, and JSON contract can be asserted from the captured
  output.
*/

// Local libraries
import FileStatus from '../../../src/commands/file-status.js'
import { captureStream } from '../../../test/support/capture.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The hosting API base URL the acceptance adapter is configured with.
const HOSTING_API_URL = 'http://localhost:5050'

// Apply a field from the current example row to the shared hosting file
// metadata.
function setHostingFileField (world, field, value) {
  world.hostingFile = { ...(world.hostingFile || {}), [field]: value }
}

// Run the file-status command against the scenario's fake API, capturing the
// exit code, streams, and any JSON on stdout.
async function runFileStatus (world, flags) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new FileStatus({
    fetchImpl: world.fetch,
    config: { hostingApiUrl: HOSTING_API_URL },
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  world.exitCode = await command.run(flags)
  process.exitCode = 0

  world.stdoutText = stdout.text()
  world.stderrText = stderr.text()
  world.hostingJson = null
  try {
    world.hostingJson = JSON.parse(world.stdoutText)
  } catch (err) {
    world.hostingJson = null
  }
}

// Build a step handler that asserts one labelled line appears on stdout.
function printsHandler ({ name, pattern, label }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      const expected = `${label}: ${resolveParam(m[1], example)}`
      if (!world.stdoutText.includes(expected)) {
        throw new Error(`Expected stdout to contain "${expected}", got "${world.stdoutText}"`)
      }
    }
  }
}

// Build a step handler that asserts a field of the parsed JSON output.
function jsonFieldHandler ({ name, pattern, field }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      assertEqual(world.hostingJson?.[field], resolveParam(m[1], example), `JSON ${field}`, { quote: true })
    }
  }
}

const fileStatusHandlers = [
  {
    name: 'a file-status command',
    pattern: /^a file-status command$/,
    run (m, example, world) {
      world.hostingFile = {}
      world.hostingFileStatus = null
      world.hostingHostedUntil = null
      world.hostingPins = []
      world.hostingStatusError = null
      world.exitCode = null
      world.stdoutText = ''
      world.stderrText = ''
      world.hostingJson = null
    }
  },
  {
    name: 'hosting API reports a file with name',
    pattern: /^the hosting API reports a file with name (.+)$/,
    run (m, example, world) {
      setHostingFileField(world, 'filename', resolveParam(m[1], example))
    }
  },
  {
    name: 'hosting API reports the file status',
    pattern: /^the hosting API reports the file status (.+)$/,
    run (m, example, world) {
      world.hostingFileStatus = resolveParam(m[1], example)
    }
  },
  {
    name: 'hosting API reports the hosting window',
    pattern: /^the hosting API reports the hosting window (.+)$/,
    run (m, example, world) {
      world.hostingHostedUntil = resolveParam(m[1], example)
    }
  },
  {
    name: 'hosting API reports no hosting window',
    pattern: /^the hosting API reports no hosting window$/,
    run (m, example, world) {
      world.hostingHostedUntil = null
    }
  },
  {
    name: 'hosting API reports a pin',
    pattern: /^the hosting API reports a pin for provider (.+) with status (.+)$/,
    run (m, example, world) {
      world.hostingPins.push({
        provider: resolveParam(m[1], example),
        status: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'hosting API rejects the status',
    pattern: /^the hosting API rejects the status with error (.+)$/,
    run (m, example, world) {
      world.hostingStatusError = resolveParam(m[1], example)
    }
  },
  {
    name: 'file-status command runs for a CID',
    pattern: /^the file-status command runs for the CID (.+)$/,
    async run (m, example, world) {
      await runFileStatus(world, { cid: resolveParam(m[1], example) })
    }
  },
  {
    name: 'file-status command runs without a CID',
    pattern: /^the file-status command runs without a CID$/,
    async run (m, example, world) {
      await runFileStatus(world, {})
    }
  },
  {
    name: 'file-status command runs with JSON output for a CID',
    pattern: /^the file-status command runs with JSON output for the CID (.+)$/,
    async run (m, example, world) {
      await runFileStatus(world, { cid: resolveParam(m[1], example), json: true })
    }
  },
  printsHandler({ name: 'prints the file status', pattern: /^the command prints the file status (.+)$/, label: 'Status' }),
  printsHandler({ name: 'prints the hosting window', pattern: /^the command prints the hosting window (.+)$/, label: 'Hosting window' }),
  {
    name: 'prints a pin',
    pattern: /^the command prints the pin (.+) (.+)$/,
    run (m, example, world) {
      const expected = `Pin: ${resolveParam(m[1], example)} ${resolveParam(m[2], example)}`
      if (!world.stdoutText.includes(expected)) {
        throw new Error(`Expected stdout to contain "${expected}", got "${world.stdoutText}"`)
      }
    }
  },
  jsonFieldHandler({
    name: 'JSON output has the status',
    pattern: /^the JSON output has the status (.+)$/,
    field: 'status'
  }),
  jsonFieldHandler({
    name: 'JSON output has the file name',
    pattern: /^the JSON output has the file name (.+)$/,
    field: 'filename'
  })
]

export { fileStatusHandlers }
