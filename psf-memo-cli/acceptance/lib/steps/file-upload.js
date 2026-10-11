/*
  Gherkin step handlers for the File Upload feature.

  The scenario world serves a fake hosting API and a fake file reader, and each
  scenario runs the real file-upload command so its quote, already-hosted links,
  errors, and JSON contract can be asserted from the captured output.
*/

// Local libraries
import FileUpload from '../../../src/commands/file-upload.js'
import { captureStream } from '../../../test/support/capture.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The hosting API base URL the acceptance adapter is configured with.
const HOSTING_API_URL = 'http://localhost:5050'

// Run the file-upload command against the scenario's fake API and file reader,
// capturing the exit code, streams, and any JSON on stdout.
async function runFileUpload (world, flags) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new FileUpload({
    fetchImpl: world.fetch,
    config: { hostingApiUrl: HOSTING_API_URL },
    readFile: world.readFile,
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
function printsHandler ({ name, pattern, label, suffix = '' }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      const expected = `${label}: ${resolveParam(m[1], example)}${suffix}`
      if (!world.stdoutText.includes(expected)) {
        throw new Error(`Expected stdout to contain "${expected}", got "${world.stdoutText}"`)
      }
    }
  }
}

// Build a step handler that asserts a field of the parsed JSON output.
function jsonFieldHandler ({ name, pattern, field, parse }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      const expected = parse(resolveParam(m[1], example))
      assertEqual(world.hostingJson?.[field], expected, `JSON ${field}`, { quote: true })
    }
  }
}

// Apply a field from the current example row to the pending hosting quote.
function setQuoteField (world, field, value) {
  world.hostingQuote = { ...(world.hostingQuote || {}), [field]: value }
}

// Apply a field from the current example row to the shared hosting file
// metadata, which both the quote and the status responses carry.
function setHostingFileField (world, field, value) {
  world.hostingFile = { ...(world.hostingFile || {}), [field]: value }
}

const fileUploadHandlers = [
  {
    name: 'a file-upload command',
    pattern: /^a file-upload command$/,
    run (m, example, world) {
      world.hostingQuote = null
      world.hostingAlreadyHosted = false
      world.hostingDownloadUrl = null
      world.hostingViewUrl = null
      world.hostingError = null
      world.hostingFile = {}
      world.exitCode = null
      world.stdoutText = ''
      world.stderrText = ''
      world.hostingJson = null
    }
  },
  {
    name: 'hosting API quotes a price and address',
    pattern: /^the hosting API quotes (.+) satoshis at (.+)$/,
    run (m, example, world) {
      setQuoteField(world, 'priceSats', Number.parseInt(resolveParam(m[1], example), 10))
      setQuoteField(world, 'paymentAddress', resolveParam(m[2], example))
    }
  },
  {
    name: 'hosting API reports the file name',
    pattern: /^the hosting API reports the file name (.+)$/,
    run (m, example, world) {
      setHostingFileField(world, 'filename', resolveParam(m[1], example))
    }
  },
  {
    name: 'hosting API reports the file size',
    pattern: /^the hosting API reports the file size (.+)$/,
    run (m, example, world) {
      setHostingFileField(world, 'sizeBytes', Number.parseInt(resolveParam(m[1], example), 10))
    }
  },
  {
    name: 'hosting API reports the billed size',
    pattern: /^the hosting API reports the billed size (.+)$/,
    run (m, example, world) {
      setQuoteField(world, 'billedBytes', Number.parseInt(resolveParam(m[1], example), 10))
    }
  },
  {
    name: 'hosting API reports the quote expiry',
    pattern: /^the hosting API reports the quote expiry (.+)$/,
    run (m, example, world) {
      setQuoteField(world, 'quoteExpiresAt', resolveParam(m[1], example))
    }
  },
  {
    name: 'hosting API reports the file is already hosted',
    pattern: /^the hosting API reports the file is already hosted at (.+)$/,
    run (m, example, world) {
      world.hostingAlreadyHosted = true
      world.hostingDownloadUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'hosting API reports the view URL',
    pattern: /^the hosting API reports the view URL (.+)$/,
    run (m, example, world) {
      world.hostingViewUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'hosting API rejects the upload',
    pattern: /^the hosting API rejects the upload with error (.+)$/,
    run (m, example, world) {
      world.hostingError = resolveParam(m[1], example)
    }
  },
  {
    name: 'file-upload command runs for a file',
    pattern: /^the file-upload command runs for the file (.+)$/,
    async run (m, example, world) {
      await runFileUpload(world, { file: resolveParam(m[1], example) })
    }
  },
  {
    name: 'file-upload command runs without a file flag',
    pattern: /^the file-upload command runs without a file flag$/,
    async run (m, example, world) {
      await runFileUpload(world, {})
    }
  },
  {
    name: 'file-upload command runs with JSON output for a file',
    pattern: /^the file-upload command runs with JSON output for the file (.+)$/,
    async run (m, example, world) {
      await runFileUpload(world, { file: resolveParam(m[1], example), json: true })
    }
  },
  {
    name: 'file-upload command runs for a missing file',
    pattern: /^the file-upload command runs for the missing file (.+)$/,
    async run (m, example, world) {
      await runFileUpload(world, { file: resolveParam(m[1], example) })
    }
  },
  printsHandler({ name: 'prints the file name', pattern: /^the command prints the file name (.+)$/, label: 'File name' }),
  printsHandler({ name: 'prints the size', pattern: /^the command prints the size (.+) bytes$/, label: 'Size', suffix: ' bytes' }),
  printsHandler({ name: 'prints the billed size', pattern: /^the command prints the billed size (.+) bytes$/, label: 'Billed size', suffix: ' bytes' }),
  printsHandler({ name: 'prints the price', pattern: /^the command prints the price (.+) satoshis$/, label: 'Price', suffix: ' satoshis' }),
  printsHandler({ name: 'prints the payment address', pattern: /^the command prints the payment address (.+)$/, label: 'Payment address' }),
  printsHandler({ name: 'prints the quote expiry', pattern: /^the command prints the quote expiry (.+)$/, label: 'Quote expires' }),
  printsHandler({ name: 'prints the download URL', pattern: /^the command prints the download URL (.+)$/, label: 'Download URL' }),
  printsHandler({ name: 'prints the view URL', pattern: /^the command prints the view URL (.+)$/, label: 'View URL' }),
  {
    name: 'prints no payment address',
    pattern: /^the command prints no payment address$/,
    run (m, example, world) {
      if (world.stdoutText.includes('Payment address')) {
        throw new Error(`Expected no payment address, got "${world.stdoutText}"`)
      }
    }
  },
  {
    name: 'prints no billed size',
    pattern: /^the command prints no billed size$/,
    run (m, example, world) {
      if (world.stdoutText.includes('Billed size')) {
        throw new Error(`Expected no billed size, got "${world.stdoutText}"`)
      }
    }
  },
  jsonFieldHandler({
    name: 'JSON output has the payment address',
    pattern: /^the JSON output has the payment address (.+)$/,
    field: 'paymentAddress',
    parse: (value) => value
  }),
  jsonFieldHandler({
    name: 'JSON output has the price',
    pattern: /^the JSON output has the price (.+) satoshis$/,
    field: 'priceSats',
    parse: (value) => Number.parseInt(value, 10)
  })
]

export { fileUploadHandlers }
