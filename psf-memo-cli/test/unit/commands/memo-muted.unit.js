/*
  Unit tests for the memo-muted read command.

  These drive the real command against an injected MemoDb class and a fake
  wallet resolver so the resolved muter address, the reported muted list, the
  missing-source usage error, the failed request, and the endpoint override are
  pinned without a network or a real wallet. The shared read contract lives in
  test/support/follow-command-tests.js.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import MemoMuted from '../../../src/commands/memo-muted.js'
import {
  fakeAddressMemoDb,
  makeCommand,
  defineFollowCommandTests
} from '../../support/follow-command-tests.js'

const RESULT = { muterAddr: 'addrA', muted: ['addrB', 'addrC'] }

// A wallet resolver that yields a fixed cash address for any source.
function fakeWalletUtil (address = 'addrA') {
  return {
    async instanceWallet () {
      return { walletInfo: { cashAddress: address } }
    },
    async instanceWalletFromWif () {
      return { walletInfo: { cashAddress: address } }
    }
  }
}

describe('#memo-muted command', () => {
  let originalExitCode

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  defineFollowCommandTests({
    label: 'muted',
    CommandClass: MemoMuted,
    method: 'getMuted',
    validFlags: { name: 'wallet' },
    resultKey: 'muted',
    result: RESULT,
    walletUtil: fakeWalletUtil()
  })

  it('resolves the wallet from a WIF', async () => {
    const fake = fakeAddressMemoDb('getMuted', { result: RESULT })
    const { command } = makeCommand(MemoMuted, fake, { walletUtil: fakeWalletUtil() })

    await command.run({ json: true, wif: 'wif-key' })

    assert.equal(fake.calls.addr, 'addrA')
  })

  it('reports a missing wallet source as the documented usage error (exit 2)', async () => {
    const fake = fakeAddressMemoDb('getMuted', { result: RESULT })
    const { command, err } = makeCommand(MemoMuted, fake, { walletUtil: fakeWalletUtil() })

    const code = await command.run({ json: true })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(err.text()), {
      error: 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
    })
    assert.equal(fake.calls.addr, null)
  })

  it('resolves the wallet flags without reading', () => {
    const command = new MemoMuted({
      MemoDbClass: fakeAddressMemoDb('getMuted').FakeMemoDb,
      walletUtil: fakeWalletUtil()
    })

    assert.deepEqual(command.validateFlags({ name: 'wallet' }), { name: 'wallet', wif: null })
  })

  it('defaults to the real wallet utility when none is injected', () => {
    const command = new MemoMuted({ MemoDbClass: fakeAddressMemoDb('getMuted').FakeMemoDb })

    assert.isFunction(command.walletUtil.instanceWallet)
  })
})
