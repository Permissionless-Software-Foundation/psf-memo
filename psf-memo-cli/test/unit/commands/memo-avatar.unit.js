/*
  Unit tests for the memo-avatar write command.

  These drive the real command against injected wallet and broadcast fakes so
  the wallet resolution, the single-field 0x6d0a action, the byte-length limit,
  the result reporting, the usage errors, and the broadcast-error surfacing are
  pinned without a network or a real wallet file.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoAvatar from '../../../src/commands/memo-avatar.js'
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

describe('#memo-avatar command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('broadcasts the 0x6d0a action and reports the txid and link as JSON', async () => {
    const { command, out, err, calls } = makeCommand(MemoAvatar)

    const code = await command.run({ json: true, name: 'wallet1', url: 'https://example.com/avatar.png' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].prefix, '6d0a')
    assert.deepEqual(calls[0].fields, ['https://example.com/avatar.png'])
    assert.isObject(calls[0].wallet)

    const data = JSON.parse(out.text())
    assert.equal(data.txid, TXID)
    assert.equal(data.explorerUrl, EXPLORER)
    assert.include(data.message, TXID)
    assert.equal(err.text(), '')
  })

  it('accepts a WIF wallet source', async () => {
    const { command, calls } = makeCommand(MemoAvatar)

    const code = await command.run({ json: true, wif: 'wif-one', url: 'https://example.com/avatar.png' })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    await assertUsageError(MemoAvatar, { url: 'https://example.com/avatar.png' }, NO_SOURCE)
  })

  it('reports an over-long avatar URL as a usage error and never broadcasts (exit 2)', async () => {
    await assertUsageError(
      MemoAvatar,
      { name: 'wallet1', url: 'é'.repeat(109) },
      'Avatar URL is too long. Maximum is 217 bytes.'
    )
  })

  it('reports a missing avatar URL as a usage error (exit 2)', async () => {
    await assertUsageError(
      MemoAvatar,
      { name: 'wallet1' },
      'You must specify an avatar URL with the -u flag.'
    )
  })

  it('reports an empty avatar URL as a usage error (exit 2)', async () => {
    await assertUsageError(MemoAvatar, { name: 'wallet1', url: '' }, 'Avatar URL must not be empty.')
  })

  it('surfaces the wallet broadcast error (exit 1)', async () => {
    await assertBroadcastErrorSurfaces(
      (opts) => makeCommand(MemoAvatar, opts),
      { name: 'wallet1', url: 'https://example.com/avatar.png' }
    )
  })

  it('prints the txid and explorer link in human mode', async () => {
    await assertHumanMode(() => makeCommand(MemoAvatar), { name: 'wallet1', url: 'https://example.com/avatar.png' })
  })

  it('validates the avatar URL flag without broadcasting', () => {
    assertValidatesFlags(MemoAvatar, { url: 'https://example.com/avatar.png' })
  })

  it('defaults to a real wallet util and the shared broadcaster', () => {
    const command = new MemoAvatar()

    assert.instanceOf(command.walletUtil, WalletUtil)
    assert.equal(command.broadcast, broadcastMemo)
  })
})
