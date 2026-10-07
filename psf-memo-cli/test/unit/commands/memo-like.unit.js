/*
  Unit tests for the memo-like write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the 0x6d04 action, the optional tip output, the
  spendable-balance checks, the tip validation, the result reporting, and the
  broadcast-error surfacing are pinned without a network or a real wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoLike from '../../../src/commands/memo-like.js'
import { UsageError } from '../../../src/lib/reporter.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import { captureStream } from '../../support/capture.js'
import {
  assertUsageError,
  fakeWallet,
  walletUtilFor,
  TXID,
  EXPLORER
} from '../../support/write-command-unit.js'

const POST = `01${'00'.repeat(31)}`
const POST_WIRE = `${'00'.repeat(31)}01`
const AUTHOR = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const NO_SOURCE =
  'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'

// Build a like command with a wallet holding `balance` spendable sats (or no
// UTXOs when undefined) and a recording broadcast fake.
function makeCommand (balance, { broadcast } = {}) {
  const out = captureStream()
  const err = captureStream()
  const calls = []
  const wallet = fakeWallet()
  if (balance !== undefined) {
    wallet.utxos = { utxoStore: { bchUtxos: [{ value: balance }] } }
  }

  const command = new MemoLike({
    walletUtil: walletUtilFor(wallet),
    broadcast:
      broadcast ||
      (async (args) => {
        calls.push(args)
        return { txid: TXID, explorerUrl: EXPLORER }
      }),
    stdout: out.stream,
    stderr: err.stream
  })
  return { command, out, err, calls }
}

describe('#memo-like command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('broadcasts a pure like and reports the txid and link as JSON', async () => {
    const { command, out, err, calls } = makeCommand(3000)

    const code = await command.run({ json: true, name: 'wallet1', txid: POST })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, '6d04')
    assert.equal(calls[0].fields.length, 1)
    assert.equal(calls[0].fields[0].toString('hex'), POST_WIRE)
    assert.deepEqual(calls[0].bchOutput, [])

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.include(data.message, TXID)
    assert.equal(err.text(), '')
  })

  it('broadcasts a tip output when a tip and author are given', async () => {
    const { command, calls } = makeCommand(100000)

    const code = await command.run({ json: true, name: 'wallet1', txid: POST, tip: '25000', author: AUTHOR })

    assert.equal(code, 0)
    assert.deepEqual(calls[0].bchOutput, [{ address: AUTHOR, amountSat: 25000 }])
  })

  it('reports a balance below the dust floor as an error and never broadcasts (exit 1)', async () => {
    for (const balance of [0, 2999]) {
      const { command, out, err, calls } = makeCommand(balance)

      const code = await command.run({ json: true, name: 'wallet1', txid: POST })

      assert.equal(code, 1)
      assert.equal(out.text(), '')
      assert.deepEqual(JSON.parse(err.text()), { error: 'add BCH to your wallet before liking a post.' })
      assert.equal(calls.length, 0)
    }
  })

  it('reports a tip above the spendable balance as an error and never broadcasts (exit 1)', async () => {
    const { command, out, err, calls } = makeCommand(30000)

    const code = await command.run({ json: true, name: 'wallet1', txid: POST, tip: '35000', author: AUTHOR })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.deepEqual(JSON.parse(err.text()), { error: 'Tip exceeds the spendable balance.' })
    assert.equal(calls.length, 0)
  })

  it('rejects a missing wallet source as a usage error (exit 2)', async () => {
    await assertUsageError(MemoLike, { txid: POST }, NO_SOURCE)
  })

  it('rejects a missing or malformed post txid as a usage error (exit 2)', async () => {
    await assertUsageError(MemoLike, {}, 'You must specify a post txid with the -t flag.')
    await assertUsageError(
      MemoLike,
      { txid: '1234' },
      'Txid must be a 64-character hex string.'
    )
    await assertUsageError(
      MemoLike,
      { txid: 'z'.repeat(64) },
      'Txid must be a valid hex string.'
    )
  })

  it('rejects an invalid, dust, or over-maximum tip as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoLike,
      { txid: POST, tip: 'abc', author: AUTHOR },
      'Tip must be a valid number of satoshis.'
    )
    await assertUsageError(
      MemoLike,
      { txid: POST, tip: '1', author: AUTHOR },
      'Tip is below the dust limit of 600 sats.'
    )
    await assertUsageError(
      MemoLike,
      { txid: POST, tip: '100000001', author: AUTHOR },
      'Tip exceeds the maximum of 100000000 sats.'
    )
  })

  it('rejects a tip without an author address as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoLike,
      { txid: POST, tip: '600' },
      'Tip requires an author address.'
    )
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    const { command, out, err } = makeCommand(100000, {
      broadcast: async () => {
        throw new Error('insufficient funds')
      }
    })

    const code = await command.run({ json: true, name: 'wallet1', txid: POST })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.deepEqual(JSON.parse(err.text()), { error: 'insufficient funds' })
  })

  it('prints the txid and explorer link in human mode', async () => {
    const { command, out } = makeCommand(3000)

    const code = await command.run({ name: 'wallet1', txid: POST })

    assert.equal(code, 0)
    assert.include(out.text(), TXID)
    assert.include(out.text(), EXPLORER)
    assert.throws(() => JSON.parse(out.text()))
  })

  it('validates the flags without broadcasting', () => {
    const command = new MemoLike({ walletUtil: walletUtilFor() })

    assert.equal(command.validateFlags({ txid: POST }), true)
    assert.throws(() => command.validateFlags({}), UsageError)
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoLike()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
