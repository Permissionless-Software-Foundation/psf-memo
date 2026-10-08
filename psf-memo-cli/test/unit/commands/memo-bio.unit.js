/*
  Unit tests for the memo-bio write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the single-field 0x6d05 action, the byte-length limit,
  the result reporting, the usage errors, and the broadcast-error surfacing are
  pinned without a network or a real wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoBio from '../../../src/commands/memo-bio.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import {
  assertBroadcastErrorSurfaces,
  assertHumanMode,
  assertUsageError,
  assertValidatesFlags,
  makeCommand,
  TXID,
  EXPLORER
} from '../../support/write-command-unit.js'

const NO_SOURCE =
  'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'

describe('#memo-bio command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('broadcasts the 0x6d05 action and reports the txid and link as JSON', async () => {
    const { command, out, err, calls } = makeCommand(MemoBio)

    const code = await command.run({ json: true, name: 'wallet1', memo: 'hello' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, '6d05')
    assert.deepEqual(calls[0].fields, ['hello'])
    assert.isObject(calls[0].wallet)

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.include(data.message, TXID)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(MemoBio)

    const code = await command.run({ json: true, wif: 'wif-one', memo: 'hello' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(MemoBio, { memo: 'hello' }, NO_SOURCE)
  })

  it('reports an over-long bio as a usage error and never broadcasts (exit 2)', async () => {
    await assertUsageError(
      MemoBio,
      { name: 'wallet1', memo: 'é'.repeat(109) },
      'Bio is too long. Maximum is 217 bytes.'
    )
  })

  it('reports a missing bio as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoBio,
      { name: 'wallet1' },
      'You must specify bio text with the -m flag.'
    )
  })

  it('reports an empty bio as a usage error (exit 2)', async () => {
    await assertUsageError(MemoBio, { name: 'wallet1', memo: '' }, 'Bio must not be empty.')
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    await assertBroadcastErrorSurfaces(
      (opts) => makeCommand(MemoBio, opts),
      { name: 'wallet1', memo: 'hello' }
    )
  })

  it('prints the txid and explorer link in human mode', async () => {
    await assertHumanMode(() => makeCommand(MemoBio), { name: 'wallet1', memo: 'hello' })
  })

  it('validates the bio flag without broadcasting', () => {
    assertValidatesFlags(MemoBio, { memo: 'hello' })
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoBio()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
