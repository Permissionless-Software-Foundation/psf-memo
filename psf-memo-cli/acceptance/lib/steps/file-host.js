/*
  Gherkin step handlers for the File Host feature.

  The scenario world serves a fake hosting API (quote, already-hosted, upload
  rejection, and check-payment polling) and a paying wallet, and each scenario
  runs the real file-host command so its payment, polling, hosted result, and
  JSON contract can be asserted from the captured output.
*/

// Local libraries
import FileHost from '../../../src/commands/file-host.js'
import { captureStream } from '../../../test/support/capture.js'
import { createPayingWallet } from '../wallet-support.js'
import { assertEqual, resolveParam } from '../step-support.js'

// The hosting API base URL the acceptance adapter is configured with.
const HOSTING_API_URL = 'http://localhost:5050'

// Run the file-host command against the scenario's fake API, wallet, and clock,
// capturing the exit code, streams, and any JSON on stdout.
async function runFileHost (world, flags) {
  const stdout = captureStream()
  const stderr = captureStream()
  const command = new FileHost({
    fetchImpl: world.fetch,
    config: { hostingApiUrl: HOSTING_API_URL },
    readFile: world.readFile,
    walletUtil: world.walletUtil,
    sleep: async (ms) => { world.sleepCalls.push(ms) },
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  world.exitCode = await command.run(flags)
  process.exitCode = 0

  world.stdoutText = stdout.text()
  world.stderrText = stderr.text()
  world.fileHostJson = null
  try {
    world.fileHostJson = JSON.parse(world.stdoutText)
  } catch (err) {
    world.fileHostJson = null
  }
}

// Assert a labelled line appears on stdout.
function assertPrinted (world, label, value, suffix = '') {
  const expected = `${label}: ${value}${suffix}`
  if (!world.stdoutText.includes(expected)) {
    throw new Error(`Expected stdout to contain "${expected}", got "${world.stdoutText}"`)
  }
}

// Build a step handler that asserts one labelled line appears on stdout.
function printsHandler ({ name, pattern, label }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      assertPrinted(world, label, resolveParam(m[1], example))
    }
  }
}

// Build a step handler that asserts a field of the parsed JSON output.
function jsonFieldHandler ({ name, pattern, field }) {
  return {
    name,
    pattern,
    run (m, example, world) {
      assertEqual(world.fileHostJson?.[field], resolveParam(m[1], example), `JSON ${field}`, { quote: true })
    }
  }
}

const fileHostHandlers = [
  {
    name: 'a file-host command',
    pattern: /^a file-host command$/,
    run (m, example, world) {
      world.hostingQuote = null
      world.hostingAlreadyHosted = false
      world.hostingDownloadUrl = null
      world.hostingViewUrl = null
      world.hostingPaid = null
      world.hostingError = null
      world.hostingUnpaidFirst = false
      world.hostingNeverConfirms = false
      world.hostingCheckPaymentCount = 0
      world.walletPayments = []
      world.broadcastTxid = 'tx-1'
      world.sleepCalls = []
      world.exitCode = null
      world.stdoutText = ''
      world.stderrText = ''
      world.fileHostJson = null
    }
  },
  {
    name: 'hosting API reports the download URL',
    pattern: /^the hosting API reports the download URL (.+)$/,
    run (m, example, world) {
      world.hostingDownloadUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'hosting API reports the gateway URL',
    pattern: /^the hosting API reports the gateway URL (.+)$/,
    run (m, example, world) {
      world.hostingPaid = {
        ...(world.hostingPaid || {}),
        gatewayUrls: [resolveParam(m[1], example)]
      }
    }
  },
  {
    name: 'hosting API reports the payment as unpaid at first',
    pattern: /^the hosting API reports the payment as unpaid at first$/,
    run (m, example, world) {
      world.hostingUnpaidFirst = true
    }
  },
  {
    name: 'hosting API reports a paid invoice',
    pattern: /^the hosting API reports a paid invoice with CID (.+)$/,
    run (m, example, world) {
      world.hostingPaid = {
        ...(world.hostingPaid || {}),
        cid: resolveParam(m[1], example)
      }
    }
  },
  {
    name: 'hosting API never confirms the payment',
    pattern: /^the hosting API never confirms the payment$/,
    run (m, example, world) {
      world.hostingNeverConfirms = true
    }
  },
  {
    name: 'a signing wallet that records payments',
    pattern: /^a signing wallet that records payments$/,
    run (m, example, world) {
      const wallet = createPayingWallet(world, { cashAddress: 'bitcoincash:qpayer' })
      world.walletUtil = {
        instanceWallet: async () => wallet,
        instanceWalletFromWif: async () => wallet
      }
    }
  },
  {
    name: 'file-host command runs for a file with the wallet payer',
    pattern: /^the file-host command runs for the file (.+) with the wallet payer$/,
    async run (m, example, world) {
      await runFileHost(world, { file: resolveParam(m[1], example), name: 'payer' })
    }
  },
  {
    name: 'file-host command runs with the wallet payer but no file',
    pattern: /^the file-host command runs with the wallet payer$/,
    async run (m, example, world) {
      await runFileHost(world, { name: 'payer' })
    }
  },
  {
    name: 'file-host command runs for a file with no wallet',
    pattern: /^the file-host command runs for the file (.+) with no wallet$/,
    async run (m, example, world) {
      await runFileHost(world, { file: resolveParam(m[1], example) })
    }
  },
  {
    name: 'file-host command runs for a missing file with the wallet payer',
    pattern: /^the file-host command runs for the missing file (.+) with the wallet payer$/,
    async run (m, example, world) {
      await runFileHost(world, { file: resolveParam(m[1], example), name: 'payer' })
    }
  },
  {
    name: 'file-host command runs with JSON output for a file with the wallet payer',
    pattern: /^the file-host command runs with JSON output for the file (.+) with the wallet payer$/,
    async run (m, example, world) {
      await runFileHost(world, { file: resolveParam(m[1], example), name: 'payer', json: true })
    }
  },
  {
    name: 'wallet paid an amount to an address',
    pattern: /^the wallet paid (.+) satoshis to (.+)$/,
    run (m, example, world) {
      const expected = {
        address: resolveParam(m[2], example),
        amountSat: Number.parseInt(resolveParam(m[1], example), 10)
      }
      const found = world.walletPayments.some(
        (payment) => payment.address === expected.address && payment.amountSat === expected.amountSat
      )
      if (!found) {
        throw new Error(`Expected the wallet to pay ${JSON.stringify(expected)}, got ${JSON.stringify(world.walletPayments)}`)
      }
    }
  },
  {
    name: 'wallet made no payment',
    pattern: /^the wallet made no payment$/,
    run (m, example, world) {
      if (world.walletPayments.length !== 0) {
        throw new Error(`Expected no wallet payment, got ${JSON.stringify(world.walletPayments)}`)
      }
    }
  },
  {
    name: 'command polled the payment a number of times',
    pattern: /^the command polled the payment (.+) times$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      assertEqual(world.hostingCheckPaymentCount, expected, 'payment poll count')
    }
  },
  {
    name: 'command waited between payment polls',
    pattern: /^the command waited (.+) milliseconds between payment polls$/,
    run (m, example, world) {
      const expected = Number.parseInt(resolveParam(m[1], example), 10)
      if (world.sleepCalls.length === 0) {
        throw new Error('Expected at least one payment-poll sleep')
      }
      for (const ms of world.sleepCalls) {
        assertEqual(ms, expected, 'payment-poll delay')
      }
    }
  },
  printsHandler({ name: 'prints the CID', pattern: /^the command prints the CID (.+)$/, label: 'CID' }),
  printsHandler({ name: 'prints the gateway URL', pattern: /^the command prints the gateway URL (.+)$/, label: 'Gateway URL' }),
  printsHandler({ name: 'prints the transaction', pattern: /^the command prints the transaction (.+)$/, label: 'Transaction' }),
  jsonFieldHandler({
    name: 'JSON output has the CID',
    pattern: /^the JSON output has the CID (.+)$/,
    field: 'cid'
  }),
  jsonFieldHandler({
    name: 'JSON output has the download URL',
    pattern: /^the JSON output has the download URL (.+)$/,
    field: 'downloadUrl'
  }),
  jsonFieldHandler({
    name: 'JSON output has the transaction',
    pattern: /^the JSON output has the transaction (.+)$/,
    field: 'txid'
  })
]

export { fileHostHandlers }
