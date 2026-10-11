/*
  Gherkin step handlers for the File Check feature.

  The scenario world serves a fake hosting API check-payment response (paid,
  unpaid, expired, or an error), and each scenario runs the real file-check
  command so the requested address, the reported result, and the JSON contract
  can be asserted from the captured output.
*/

// Local libraries
import FileCheck from '../../../src/commands/file-check.js'
import { captureStream } from '../../../test/support/capture.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The hosting API base URL the acceptance adapter is configured with.
const HOSTING_API_URL = 'http://localhost:5050'

// Run the file-check command against the scenario's fake API, capturing the
// exit code, streams, and any JSON on stdout.
async function runFileCheck (world, flags) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new FileCheck({
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

const fileCheckHandlers = [
  {
    name: 'a file-check command',
    pattern: /^a file-check command$/,
    run (m, example, world) {
      world.hostingPaid = null
      world.hostingDownloadUrl = null
      world.hostingViewUrl = null
      world.hostingQuote = null
      world.hostingUnpaid = null
      world.hostingExpired = false
      world.hostingCheckError = null
      world.hostingCheckPaymentAddress = null
      world.hostingJson = null
      world.exitCode = null
      world.stdoutText = ''
      world.stderrText = ''
    }
  },
  {
    name: 'hosting API reports an unpaid invoice',
    pattern: /^the hosting API reports an unpaid invoice with (.+) received and (.+) required$/,
    run (m, example, world) {
      world.hostingUnpaid = {
        receivedSats: Number.parseInt(resolveParam(m[1], example), 10),
        requiredSats: Number.parseInt(resolveParam(m[2], example), 10)
      }
    }
  },
  {
    name: 'hosting API reports an expired invoice',
    pattern: /^the hosting API reports an expired invoice$/,
    run (m, example, world) {
      world.hostingExpired = true
    }
  },
  {
    name: 'hosting API rejects the check',
    pattern: /^the hosting API rejects the check with error (.+)$/,
    run (m, example, world) {
      world.hostingCheckError = resolveParam(m[1], example)
    }
  },
  {
    name: 'file-check command runs for an address',
    pattern: /^the file-check command runs for the address (.+)$/,
    async run (m, example, world) {
      await runFileCheck(world, { address: resolveParam(m[1], example) })
    }
  },
  {
    name: 'file-check command runs without an address',
    pattern: /^the file-check command runs without an address$/,
    async run (m, example, world) {
      await runFileCheck(world, {})
    }
  },
  {
    name: 'file-check command runs with JSON output for an address',
    pattern: /^the file-check command runs with JSON output for the address (.+)$/,
    async run (m, example, world) {
      await runFileCheck(world, { address: resolveParam(m[1], example), json: true })
    }
  },
  {
    name: 'hosting API received the address',
    pattern: /^the hosting API received the address (.+)$/,
    run (m, example, world) {
      assertEqual(
        world.hostingCheckPaymentAddress,
        resolveParam(m[1], example),
        'check-payment address',
        { quote: true }
      )
    }
  },
  printsHandler({ name: 'prints the received amount', pattern: /^the command prints the received amount (.+) satoshis$/, label: 'Received', suffix: ' satoshis' }),
  printsHandler({ name: 'prints the required amount', pattern: /^the command prints the required amount (.+) satoshis$/, label: 'Required', suffix: ' satoshis' }),
  {
    name: 'prints the expired status',
    pattern: /^the command prints the expired status$/,
    run (m, example, world) {
      if (!world.stdoutText.includes('Status: expired')) {
        throw new Error(`Expected stdout to contain "Status: expired", got "${world.stdoutText}"`)
      }
    }
  }
]

export { fileCheckHandlers }
