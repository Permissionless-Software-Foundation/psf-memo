/*
  Unit tests for the memo-post write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the single-field 0x6d02 action, the result reporting,
  the usage errors, and the broadcast-error surfacing are pinned without a
  network or a real wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoPost from '../../../src/commands/memo-post.js'
import { UsageError } from '../../../src/lib/reporter.js'
import WalletUtil from '../../../src/lib/wallet-util.js'
import { broadcastMemo } from '../../../src/lib/memo-broadcast.js'
import {
  assertUsageError,
  makeCommand,
  walletUtilFor,
  TXID,
  EXPLORER
} from '../../support/write-command-unit.js'

const NO_SOURCE =
  'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'

describe('#memo-post command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('broadcasts the 0x6d02 action and reports the txid and link as JSON', async () => {
    const { command, out, err, calls } = makeCommand(MemoPost)

    const code = await command.run({ json: true, name: 'wallet1', memo: 'hello memo' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, '6d02')
    assert.deepEqual(calls[0].fields, ['hello memo'])
    assert.isObject(calls[0].wallet)

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.include(data.message, TXID)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(MemoPost)

    const code = await command.run({ json: true, wif: 'wif-one', memo: 'hi' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(MemoPost, { memo: 'hello memo' }, NO_SOURCE)
  })

  it('reports an over-long memo as a usage error and never broadcasts (exit 2)', async () => {
    await assertUsageError(
      MemoPost,
      { name: 'wallet1', memo: 'a'.repeat(218) },
      'Memo is too long. Maximum is 217 characters.'
    )
  })

  it('reports a missing memo as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoPost,
      { name: 'wallet1' },
      'You must specify memo text with the -m flag.'
    )
  })

  it('reports an empty memo as a usage error (exit 2)', async () => {
    await assertUsageError(MemoPost, { name: 'wallet1', memo: '' }, 'Memo must not be empty.')
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    const { command, out, err } = makeCommand(MemoPost, {
      broadcast: async () => {
        throw new Error('insufficient funds')
      }
    })

    const code = await command.run({ json: true, name: 'wallet1', memo: 'hello memo' })

    assert.equal(code, 1)
    assert.equal(out.text(), '')
    assert.deepEqual(JSON.parse(err.text()), { error: 'insufficient funds' })
  })

  it('prints the txid and explorer link in human mode', async () => {
    const { command, out } = makeCommand(MemoPost)

    const code = await command.run({ name: 'wallet1', memo: 'hello memo' })

    assert.equal(code, 0)
    assert.include(out.text(), TXID)
    assert.include(out.text(), EXPLORER)
    assert.throws(() => JSON.parse(out.text()))
  })

  it('validates the memo flag without broadcasting', () => {
    const command = new MemoPost({ walletUtil: walletUtilFor() })

    assert.equal(command.validateFlags({ memo: 'hello' }), true)
    assert.throws(() => command.validateFlags({}), UsageError)
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoPost()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
